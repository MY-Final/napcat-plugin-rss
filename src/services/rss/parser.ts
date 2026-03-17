/**
 * RSS 解析模块
 * 使用 rss-parser 库解析 RSS/Atom/RDF
 */

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
        const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
        const causeCode = cause?.code || '';
        const normalized = `${message} ${causeCode}`.toLowerCase();

        if (normalized.includes('aborted') || normalized.includes('timeout')) {
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

        if (normalized.includes('fetch failed')) {
            return new Error(`抓取失败，可能是网络异常、源站不可达或被目标站点拦截: ${url}`);
        }

        return error;
    }

    return new Error(`抓取失败: ${String(error)}`);
}

export async function fetchAndParse(url: string): Promise<ParsedFeed> {
    pluginState.logger.debug(`Fetching RSS: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'NapCat-RSS-Plugin/1.0',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xml = await response.text();
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
