/**
 * RSS 解析模块
 * 使用 rss-parser 库解析 RSS/Atom/RDF
 */

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';
import Parser from 'rss-parser';
import type { ParsedFeed, FeedItem } from '../../types';
import { pluginState } from '../../core/state';

const parser = new Parser({
    customNamespaces: {
        media: 'http://search.yahoo.com/mrss/',
        content: 'http://purl.org/rss/1.0/modules/content/',
    },
    timeout: 10000,
} as ConstructorParameters<typeof Parser>[0]);

const RSS_FETCH_TIMEOUT_MS = 20000;

export async function parseFeed(xml: string): Promise<ParsedFeed> {
    const feed = await parser.parseString(xml);

    const items: FeedItem[] = feed.items.map((item) => {
        const rawItem = item as typeof item & {
            author?: string;
            'media:content'?: { $?: { url?: string } };
            'media:thumbnail'?: { $?: { url?: string } };
        };
        let image: string | undefined;

        if (item.enclosure?.url) {
            image = item.enclosure.url;
        } else if (rawItem['media:content']?.$?.url) {
            image = rawItem['media:content'].$.url;
        } else if (rawItem['media:thumbnail']?.$?.url) {
            image = rawItem['media:thumbnail'].$.url;
        } else {
            const imgMatch = (item.content || item.contentSnippet || '').match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) {
                image = imgMatch[1];
            }
        }

        let pubDate = 0;
        if (item.pubDate) {
            pubDate = new Date(item.pubDate).getTime();
        }

        return {
            title: item.title || '无标题',
            link: item.link || '',
            description: item.contentSnippet || item.summary ? stripHtml(item.contentSnippet || item.summary || '').slice(0, 500) : undefined,
            pubDate,
            author: item.creator || rawItem.author,
            image,
            content: item.content || item.contentSnippet || item.summary,
        };
    });

    return {
        title: feed.title || 'Unknown Feed',
        link: feed.link || '',
        description: feed.description,
        items: items.sort((a, b) => b.pubDate - a.pubDate),
    };
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

function classifyFetchError(url: string, error: unknown): Error {
    if (error instanceof Error) {
        const message = error.message || '';
        const normalized = message.toLowerCase();

        if (normalized.includes('proxy timeout')) {
            return new Error(`代理请求超时，请检查代理地址、端口、Allow LAN 和防火墙配置: ${message}`);
        }

        if (normalized.includes('timeout')) {
            return new Error(`请求超时，请检查目标站点响应速度: ${url}`);
        }

        if (normalized.includes('enotfound') || normalized.includes('dns')) {
            return new Error(`域名解析失败，请检查订阅地址是否正确: ${url}`);
        }

        if (normalized.includes('econnrefused')) {
            return new Error(`目标服务器拒绝连接: ${url}`);
        }

        if (normalized.includes('econnreset') || normalized.includes('socket hang up')) {
            return new Error(`连接被目标站点重置，可能存在反爬或网络波动: ${url}`);
        }

        if (normalized.includes('certificate') || normalized.includes('tls') || normalized.includes('ssl')) {
            return new Error(`TLS/证书校验失败，请检查目标站点 HTTPS 配置: ${url}`);
        }

        if (normalized.includes('proxy')) {
            return new Error(`代理请求失败，请检查代理地址和连通性: ${message}`);
        }

        if (normalized.includes('fetch failed')) {
            return new Error(`抓取失败，可能是网络异常、源站不可达或被目标站点拦截: ${url}`);
        }

        return error;
    }

    return new Error(`抓取失败: ${String(error)}`);
}

function requestDirect(url: URL, timeoutMs: number): Promise<string> {
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = client.request(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'NapCat-RSS-Plugin/1.0',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
        }, (res) => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || '请求失败'}`));
                res.resume();
                return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });

        req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
        req.on('error', reject);
        req.end();
    });
}

function requestViaProxy(url: URL, proxyUrl: string, timeoutMs: number): Promise<string> {
    const proxy = new URL(proxyUrl);

    if (proxy.protocol !== 'http:') {
        throw new Error(`代理协议暂仅支持 http，当前为: ${proxy.protocol}`);
    }

    if (url.protocol === 'http:') {
        return new Promise((resolve, reject) => {
            const req = http.request({
                host: proxy.hostname,
                port: Number(proxy.port || 80),
                method: 'GET',
                path: url.toString(),
                headers: {
                    Host: url.host,
                    'User-Agent': 'NapCat-RSS-Plugin/1.0',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                },
            }, (res) => {
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || '请求失败'}`));
                    res.resume();
                    return;
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            });

            req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
            req.on('error', (error) => reject(new Error(`proxy http request failed: ${error.message}`)));
            req.end();
        });
    }

    return new Promise((resolve, reject) => {
        const proxySocket = net.connect(Number(proxy.port || 80), proxy.hostname);
        const timeout = setTimeout(() => {
            proxySocket.destroy(new Error('proxy timeout during CONNECT'));
        }, timeoutMs);

        proxySocket.on('connect', () => {
            const connectRequest = [
                `CONNECT ${url.hostname}:${url.port || 443} HTTP/1.1`,
                `Host: ${url.hostname}:${url.port || 443}`,
                'Connection: Keep-Alive',
                'Proxy-Connection: Keep-Alive',
                '',
                '',
            ].join('\r\n');
            proxySocket.write(connectRequest);
        });

        proxySocket.once('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`proxy connect failed: ${error.message}`));
        });

        proxySocket.once('data', (chunk) => {
            const response = chunk.toString('utf-8');
            if (!response.includes('200 Connection established')) {
                clearTimeout(timeout);
                proxySocket.destroy();
                reject(new Error(`proxy tunnel failed: ${response.split('\r\n')[0] || response}`));
                return;
            }

            const tlsSocket = tls.connect({
                socket: proxySocket,
                servername: url.hostname,
            }, () => {
                const req = https.request({
                    host: url.hostname,
                    port: Number(url.port || 443),
                    path: `${url.pathname}${url.search}`,
                    method: 'GET',
                    headers: {
                        Host: url.host,
                        'User-Agent': 'NapCat-RSS-Plugin/1.0',
                        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                    },
                    createConnection: () => tlsSocket,
                    agent: false,
                }, (res) => {
                    clearTimeout(timeout);

                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || '请求失败'}`));
                        res.resume();
                        return;
                    }

                    const chunks: Buffer[] = [];
                    res.on('data', (data) => chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data)));
                    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
                });

                req.setTimeout(timeoutMs, () => req.destroy(new Error('proxy timeout during tunneled request')));
                req.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                req.end();
            });

            tlsSocket.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    });
}

export async function fetchXml(url: string, proxyUrlOverride?: string): Promise<string> {
    const targetUrl = new URL(url);
    const proxyUrl = (proxyUrlOverride ?? pluginState.config.rssProxyUrl)?.trim();
    const timeoutMs = RSS_FETCH_TIMEOUT_MS;

    if (!proxyUrl) {
        return requestDirect(targetUrl, timeoutMs);
    }

    pluginState.logger.info(`RSS 抓取使用代理: ${proxyUrl}`);
    return requestViaProxy(targetUrl, proxyUrl, timeoutMs);
}

export async function fetchAndParse(url: string): Promise<ParsedFeed> {
    pluginState.logger.debug(`Fetching RSS: ${url}`);

    try {
        const xml = await fetchXml(url);
        if (!xml.trim()) {
            throw new Error('RSS 响应为空');
        }

        try {
            return await parseFeed(xml);
        } catch (error) {
            throw new Error(`RSS 解析失败，返回内容可能不是有效 XML: ${error instanceof Error ? error.message : String(error)}`);
        }
    } catch (error) {
        throw classifyFetchError(url, error);
    }
}

export async function testProxyConnection(targetUrl: string, proxyUrl?: string): Promise<{ ok: boolean; contentLength: number }> {
    try {
        const xml = await fetchXml(targetUrl, proxyUrl);
        return {
            ok: true,
            contentLength: xml.length,
        };
    } catch (error) {
        throw classifyFetchError(targetUrl, error);
    }
}
