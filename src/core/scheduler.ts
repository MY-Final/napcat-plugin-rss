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

    startAll(): void {
        const feeds = rss.getEnabledFeeds();
        for (const feed of feeds) {
            this.startFeed(feed);
        }
        pluginState.logger.info(`RSS 调度器启动，共 ${feeds.length} 个订阅`);
    }

    startFeed(feed: FeedConfig): void {
        if (this.timers.has(feed.id)) {
            this.stopFeed(feed.id);
        }

        const intervalMs = (feed.updateInterval || pluginState.config.defaultUpdateInterval) * 60 * 1000;
        
        const timer = setInterval(async () => {
            await this.checkUpdate(feed.id);
        }, intervalMs);

        this.timers.set(feed.id, timer);
        pluginState.logger.debug(`启动 RSS 定时任务: ${feed.name} (间隔 ${feed.updateInterval} 分钟)`);

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
        pluginState.logger.info('RSS 调度器已停止');
    }

    async checkUpdate(feedId: string): Promise<FeedItem[]> {
        const feed = rss.getFeed(feedId);
        if (!feed || !feed.enabled) {
            return [];
        }

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
            try {
                await this.sendToGroup(feed, groupId, result.newItems);
            } catch (error) {
                pluginState.logger.error(`推送失败: ${feed.name} -> 群 ${groupId}: ${error}`);
            }
        }

        return result.newItems;
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
