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

async function collectNewItems(feed: FeedConfig): Promise<FeedItem[]> {
    const parsedFeed = await fetchAndParse(feed.url);
    const lastPubTime = feed.lastPublishTime || 0;
    return parsedFeed.items.filter((item) => item.pubDate > lastPubTime);
}

export async function checkFeedUpdate(feed: FeedConfig): Promise<CheckResult> {
    const result: CheckResult = {
        feedId: feed.id,
        feedName: feed.name,
        newItems: [],
        success: false,
    };

    try {
        const newItems = await collectNewItems(feed);

        if (newItems.length > 0) {
            const latestPubDate = Math.max(...newItems.map((item) => item.pubDate));
            storage.updateFeedLastPublishTime(feed.id, latestPubDate);
            storage.resetFeedErrorCount(feed.id);
            
            result.newItems = newItems;
            pluginState.logger.info(
                `RSS 更新检测: ${feed.name} - 发现 ${newItems.length} 条新内容`
            );
        }

        result.success = true;
    } catch (error) {
        storage.incrementFeedErrorCount(feed.id);
        result.error = error instanceof Error ? error.message : String(error);
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
        result.newItems = await collectNewItems(feed);
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

        if (latestPubDate > 0) {
            return {
                ...feed,
                lastPublishTime: latestPubDate,
                lastUpdateTime: Date.now(),
                errorCount: 0,
            };
        }
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
