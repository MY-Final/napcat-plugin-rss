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
});

export async function parseFeed(xml: string): Promise<ParsedFeed> {
    const feed = await parser.parseString(xml);
    
    const items: FeedItem[] = feed.items.map((item) => {
        let image: string | undefined;
        
        if (item.enclosure?.url) {
            image = item.enclosure.url;
        } else if (item['media:content']?.$.url) {
            image = item['media:content'].$.url;
        } else if (item['media:thumbnail']?.$.url) {
            image = item['media:thumbnail'].$.url;
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
            description: item.contentSnippet || item.summary ? stripHtml(item.contentSnippet || item.summary).slice(0, 500) : undefined,
            pubDate,
            author: item.creator || item.author,
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

export async function fetchAndParse(url: string): Promise<ParsedFeed> {
    pluginState.logger.debug(`Fetching RSS: ${url}`);
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NapCat-RSS-Plugin/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    return parseFeed(xml);
}
