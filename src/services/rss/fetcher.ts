/**
 * RSS 抓取服务模块
 * 负责检测 RSS 更新
 */

import type { FeedConfig, FeedItem } from '../../types';
import { fetchAndParse } from './parser';
import * as storage from './storage';
import { pluginState } from '../../core/state';

export interface CheckResult {
    feedId: string;
    feedName: string;
    newItems: FeedItem[];
    success: boolean;
    error?: string;
}

function buildItemFingerprint(item: FeedItem): string {
    const fingerprintSource = [
        item.link || '',
        item.title || '',
        String(item.pubDate || 0),
        item.author || '',
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprintSource.length; i++) {
        hash = (hash * 31 + fingerprintSource.charCodeAt(i)) >>> 0;
    }

    return hash.toString(16);
}

function mergeFingerprints(existing: string[], items: FeedItem[]): string[] {
    const next = new Set(existing);
    for (const item of items) {
        next.add(buildItemFingerprint(item));
    }
    return Array.from(next).slice(-50);
}

function matchesKeywordRules(feed: FeedConfig, item: FeedItem): boolean {
    const whitelist = (feed.keywordWhitelist || []).map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
    const blacklist = (feed.keywordBlacklist || []).map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);

    const haystack = [item.title, item.description, item.content, item.author, item.link]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();

    if (blacklist.some((keyword) => haystack.includes(keyword))) {
        return false;
    }

    if (whitelist.length === 0) {
        return true;
    }

    if (feed.keywordMatchMode === 'all') {
        return whitelist.every((keyword) => haystack.includes(keyword));
    }

    return whitelist.some((keyword) => haystack.includes(keyword));
}

async function collectNewItems(feed: FeedConfig): Promise<{ matchedItems: FeedItem[]; seenItems: FeedItem[] }> {
    const parsedFeed = await fetchAndParse(feed.url);
    const lastPubTime = feed.lastPublishTime || 0;
    const recentFingerprints = new Set(feed.recentItemFingerprints || []);

    const seenItems = parsedFeed.items.filter((item) => {
        const fingerprint = buildItemFingerprint(item);
        if (recentFingerprints.has(fingerprint)) {
            return false;
        }

        if (!item.pubDate || !lastPubTime) {
            return true;
        }

        return item.pubDate >= lastPubTime;
    });

    return {
        seenItems,
        matchedItems: seenItems.filter((item) => matchesKeywordRules(feed, item)),
    };
}

export async function checkFeedUpdate(feed: FeedConfig): Promise<CheckResult> {
    const result: CheckResult = {
        feedId: feed.id,
        feedName: feed.name,
        newItems: [],
        success: false,
    };

    try {
        storage.markFeedCheckStart(feed.id);
        const { matchedItems, seenItems } = await collectNewItems(feed);

        if (seenItems.length > 0) {
            const latestPubDate = Math.max(...seenItems.map((item) => item.pubDate));
            storage.updateFeedLastPublishTime(feed.id, latestPubDate);
            storage.rememberFeedFingerprints(feed.id, mergeFingerprints(feed.recentItemFingerprints || [], seenItems));
        }

        if (matchedItems.length > 0) {
            result.newItems = matchedItems;
            pluginState.logger.info(
                `RSS 更新检测: ${feed.name} - 发现 ${matchedItems.length} 条新内容`
            );
        } else {
            storage.markFeedCheckSuccess(feed.id);
        }

        if (matchedItems.length > 0) {
            storage.markFeedCheckSuccess(feed.id, { errorCount: 0 });
        }

        result.success = true;
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        storage.markFeedError(feed.id, result.error);
        pluginState.logger.error(`RSS 更新检测失败: ${feed.name} - ${result.error}`);
    }

    return result;
}

export async function previewFeedUpdate(feed: FeedConfig): Promise<CheckResult> {
    const result: CheckResult = {
        feedId: feed.id,
        feedName: feed.name,
        newItems: [],
        success: false,
    };

    try {
        result.newItems = (await collectNewItems(feed)).matchedItems;
        result.success = true;
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
}

export async function initializeFeedBaseline(feed: FeedConfig): Promise<FeedConfig> {
    try {
        const parsedFeed = await fetchAndParse(feed.url);
        const latestPubDate = parsedFeed.items.reduce((max, item) => {
            return item.pubDate > max ? item.pubDate : max;
        }, 0);
        const recentItemFingerprints = parsedFeed.items
            .slice(0, 20)
            .map((item) => buildItemFingerprint(item));

        return {
            ...feed,
            recentItemFingerprints,
            lastPublishTime: latestPubDate > 0 ? latestPubDate : feed.lastPublishTime,
            lastCheckTime: Date.now(),
            lastSuccessTime: Date.now(),
            lastUpdateTime: latestPubDate > 0 ? Date.now() : feed.lastUpdateTime,
            errorCount: 0,
            lastError: undefined,
            lastErrorTime: undefined,
        };
    } catch (error) {
        pluginState.logger.warn(`初始化订阅基线失败: ${feed.name} - ${error}`);
    }

    return feed;
}

export async function checkAllFeeds(): Promise<CheckResult[]> {
    const feeds = storage.getEnabledFeeds();
    const results: CheckResult[] = [];

    for (const feed of feeds) {
        const result = await checkFeedUpdate(feed);
        results.push(result);
        
        if (result.newItems.length > 0) {
            await sendFeedUpdate(feed, result.newItems);
        }
    }

    return results;
}

async function sendFeedUpdate(feed: FeedConfig, items: FeedItem[]): Promise<void> {
    const messageService = await import('../message/sender');
    
    for (const groupId of feed.groups) {
        try {
            switch (feed.sendMode) {
                case 'single':
                    for (const item of items) {
                        await messageService.sendSingle(feed, groupId, item);
                    }
                    break;
                case 'forward':
                    await messageService.sendForward(feed, groupId, items);
                    break;
                case 'puppeteer':
                    for (const item of items) {
                        await messageService.sendPuppeteer(feed, groupId, item);
                    }
                    break;
            }
            pluginState.logger.info(`推送成功: ${feed.name} -> 群 ${groupId}`);
        } catch (error) {
            pluginState.logger.error(
                `推送失败: ${feed.name} -> 群 ${groupId}: ${error}`
            );
        }
    }
}

export async function testFeed(feed: FeedConfig): Promise<{ success: boolean; items: FeedItem[]; error?: string }> {
    try {
        const parsedFeed = await fetchAndParse(feed.url);
        return {
            success: true,
            items: parsedFeed.items.slice(0, 5),
        };
    } catch (error) {
        return {
            success: false,
            items: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
