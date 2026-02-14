/**
 * RSS 订阅存储模块
 * 负责订阅源的持久化和 CRUD 操作
 */

import type { FeedConfig } from '../../types';
import { pluginState } from '../../core/state';

const STORAGE_FILE = 'feeds.json';

export function getAllFeeds(): Record<string, FeedConfig> {
    return pluginState.config.feeds || {};
}

export function getFeed(id: string): FeedConfig | undefined {
    return getAllFeeds()[id];
}

export function addFeed(feed: FeedConfig): void {
    const feeds = getAllFeeds();
    feeds[feed.id] = feed;
    pluginState.updateConfig({ feeds });
    pluginState.logger.info(`添加 RSS 订阅: ${feed.name} (${feed.id})`);
}

export function updateFeed(id: string, updates: Partial<FeedConfig>): boolean {
    const feeds = getAllFeeds();
    if (!feeds[id]) {
        return false;
    }
    feeds[id] = { ...feeds[id], ...updates };
    pluginState.updateConfig({ feeds });
    pluginState.logger.info(`更新 RSS 订阅: ${id}`);
    return true;
}

export function deleteFeed(id: string): boolean {
    const feeds = getAllFeeds();
    if (!feeds[id]) {
        return false;
    }
    delete feeds[id];
    pluginState.updateConfig({ feeds });
    pluginState.logger.info(`删除 RSS 订阅: ${id}`);
    return true;
}

export function updateFeedLastPublishTime(id: string, pubDate: number): void {
    updateFeed(id, { lastPublishTime: pubDate, lastUpdateTime: Date.now() });
}

export function incrementFeedErrorCount(id: string): void {
    const feed = getFeed(id);
    if (feed) {
        updateFeed(id, { errorCount: (feed.errorCount || 0) + 1 });
    }
}

export function resetFeedErrorCount(id: string): void {
    const feed = getFeed(id);
    if (feed) {
        updateFeed(id, { errorCount: 0 });
    }
}

export function getEnabledFeeds(): FeedConfig[] {
    const feeds = getAllFeeds();
    return Object.values(feeds).filter((feed) => feed.enabled);
}

export function generateFeedId(): string {
    return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
