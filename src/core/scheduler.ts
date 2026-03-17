/**
 * RSS 定时调度器
 * 负责管理所有 RSS 订阅的定时检查任务
 */

import type { FeedConfig, FeedItem } from '../types';
import * as rss from '../services/rss';
import * as message from '../services/message';
import { pluginState } from './state';

class FeedScheduler {
    private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
    private runningFeeds: Set<string> = new Set();

    startAll(): void {
        if (!pluginState.config.enabled) {
            pluginState.logger.info('RSS 插件已禁用，跳过调度器启动');
            return;
        }

        const feeds = rss.getEnabledFeeds();
        for (const feed of feeds) {
            this.startFeed(feed);
        }
        pluginState.logger.info(`RSS 调度器启动，共 ${feeds.length} 个订阅`);
    }

    startFeed(feed: FeedConfig): void {
        if (!pluginState.config.enabled || !feed.enabled) {
            this.stopFeed(feed.id);
            return;
        }

        if (this.timers.has(feed.id)) {
            this.stopFeed(feed.id);
        }

        const isDebug = pluginState.config.debug;
        const intervalMinutes = isDebug && feed.updateInterval === 30 ? 1 : Math.max(1, feed.updateInterval);
        const intervalMs = intervalMinutes * 60 * 1000;
        
        const timer = setInterval(async () => {
            await this.checkUpdate(feed.id);
        }, intervalMs);

        this.timers.set(feed.id, timer);
        pluginState.logger.debug(`启动 RSS 定时任务: ${feed.name} (间隔 ${intervalMinutes} 分钟)`);

        setTimeout(async () => {
            await this.checkUpdate(feed.id);
        }, 5000);
    }

    stopFeed(feedId: string): void {
        const timer = this.timers.get(feedId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(feedId);
            pluginState.logger.debug(`停止 RSS 定时任务: ${feedId}`);
        }
    }

    stopAll(): void {
        for (const [feedId, timer] of this.timers) {
            clearInterval(timer);
            pluginState.logger.debug(`停止 RSS 定时任务: ${feedId}`);
        }
        this.timers.clear();
        this.runningFeeds.clear();
        pluginState.logger.info('RSS 调度器已停止');
    }

    async checkUpdate(feedId: string): Promise<FeedItem[]> {
        if (!pluginState.config.enabled) {
            return [];
        }

        const feed = rss.getFeed(feedId);
        if (!feed || !feed.enabled) {
            return [];
        }

        if (this.runningFeeds.has(feedId)) {
            pluginState.logger.debug(`RSS 检查跳过，任务仍在执行: ${feed.name}`);
            return [];
        }

        this.runningFeeds.add(feedId);

        try {
            const result = await rss.checkFeedUpdate(feed);

            if (!result.success) {
                pluginState.logger.error(`RSS 检查失败: ${feed.name} - ${result.error}`);
                return [];
            }

            if (result.newItems.length === 0) {
                return [];
            }

            pluginState.logger.info(`RSS 更新: ${feed.name} - ${result.newItems.length} 条新内容`);

            for (const groupId of feed.groups) {
                if (!pluginState.isGroupEnabled(groupId)) {
                    pluginState.logger.debug(`跳过已禁用群的推送: ${feed.name} -> 群 ${groupId}`);
                    continue;
                }

                try {
                    await this.sendToGroup(feed, groupId, result.newItems);
                    pluginState.incrementProcessed();
                } catch (error) {
                    pluginState.logger.error(`推送失败: ${feed.name} -> 群 ${groupId}: ${error}`);
                }
            }

            return result.newItems;
        } finally {
            this.runningFeeds.delete(feedId);
        }
    }

    async previewUpdate(feedId: string): Promise<FeedItem[]> {
        const feed = rss.getFeed(feedId);
        if (!feed) {
            return [];
        }

        const result = await rss.previewFeedUpdate(feed);
        if (!result.success) {
            throw new Error(result.error || '检查更新失败');
        }

        return result.newItems;
    }

    async checkUpdateNow(feedId: string): Promise<FeedItem[]> {
        return this.checkUpdate(feedId);
    }

    private async sendToGroup(feed: FeedConfig, groupId: string, items: FeedItem[]): Promise<void> {
        switch (feed.sendMode) {
            case 'single':
                for (const item of items) {
                    await message.sendSingle(feed, groupId, item);
                }
                break;
            case 'forward':
                await message.sendForward(feed, groupId, items);
                break;
            case 'puppeteer':
                for (const item of items) {
                    await message.sendPuppeteer(feed, groupId, item);
                }
                break;
        }
    }

    getActiveTimers(): string[] {
        return Array.from(this.timers.keys());
    }

    isFeedRunning(feedId: string): boolean {
        return this.timers.has(feedId);
    }
}

export const feedScheduler = new FeedScheduler();
