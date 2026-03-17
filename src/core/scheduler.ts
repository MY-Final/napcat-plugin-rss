/**
 * RSS 定时调度器
 * 负责管理所有 RSS 订阅的定时检查任务
 */

import type { FeedConfig, FeedItem } from '../types';
import * as rss from '../services/rss';
import * as message from '../services/message';
import { pluginState } from './state';
import * as storage from '../services/rss/storage';

const MAX_ITEMS_PER_PUSH = 5;

function getItemKey(item: FeedItem): string {
    return [item.link || '', item.title || '', String(item.pubDate || 0), item.author || ''].join('|');
}

class FeedScheduler {
    private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
    private runningFeeds: Set<string> = new Set();
    private timerIntervals: Map<string, number> = new Map();

    private getEffectiveIntervalMinutes(feed: FeedConfig): number {
        const baseInterval = Math.max(1, feed.updateInterval);
        const errorCount = feed.errorCount || 0;

        if (errorCount >= 8) return Math.min(baseInterval * 15, 24 * 60);
        if (errorCount >= 5) return Math.min(baseInterval * 5, 12 * 60);
        if (errorCount >= 3) return Math.min(baseInterval * 2, 6 * 60);

        return baseInterval;
    }

    private parseTimeToMinutes(value?: string): number | null {
        if (!value || !/^\d{2}:\d{2}$/.test(value)) {
            return null;
        }

        const [hourText, minuteText] = value.split(':');
        const hour = Number(hourText);
        const minute = Number(minuteText);

        if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }

        return hour * 60 + minute;
    }

    private isQuietHours(feed: FeedConfig, now: Date = new Date()): boolean {
        if (!feed.quietHoursEnabled) {
            return false;
        }

        const start = this.parseTimeToMinutes(feed.quietHoursStart);
        const end = this.parseTimeToMinutes(feed.quietHoursEnd);
        if (start === null || end === null || start === end) {
            return false;
        }

        const current = now.getHours() * 60 + now.getMinutes();
        if (start < end) {
            return current >= start && current < end;
        }

        return current >= start || current < end;
    }

    private mergeItems(existing: FeedItem[], incoming: FeedItem[]): FeedItem[] {
        const merged = new Map<string, FeedItem>();

        for (const item of [...existing, ...incoming]) {
            merged.set(getItemKey(item), item);
        }

        return Array.from(merged.values()).sort((a, b) => a.pubDate - b.pubDate);
    }

    private shouldHoldForBatch(feed: FeedConfig, pendingSince?: number): boolean {
        const batchWindowMinutes = Math.max(0, feed.batchWindowMinutes || 0);
        if (batchWindowMinutes <= 0 || !pendingSince) {
            return false;
        }

        return Date.now() - pendingSince < batchWindowMinutes * 60 * 1000;
    }

    private refreshFeedSchedule(feedId: string): void {
        const feed = rss.getFeed(feedId);
        if (!feed || !feed.enabled || !pluginState.config.enabled) {
            this.stopFeed(feedId);
            return;
        }

        const nextInterval = this.getEffectiveIntervalMinutes(feed);
        if (this.timerIntervals.get(feedId) !== nextInterval) {
            this.startFeed(feed, false);
        }
    }

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

    startFeed(feed: FeedConfig, immediate: boolean = true): void {
        if (!pluginState.config.enabled || !feed.enabled) {
            this.stopFeed(feed.id);
            return;
        }

        if (this.timers.has(feed.id)) {
            this.stopFeed(feed.id);
        }

        const isDebug = pluginState.config.debug;
        const intervalMinutes = isDebug && feed.updateInterval === 30 ? 1 : this.getEffectiveIntervalMinutes(feed);
        const intervalMs = intervalMinutes * 60 * 1000;
        
        const timer = setInterval(async () => {
            await this.checkUpdate(feed.id);
        }, intervalMs);

        this.timers.set(feed.id, timer);
        this.timerIntervals.set(feed.id, intervalMinutes);
        pluginState.logger.debug(`启动 RSS 定时任务: ${feed.name} (间隔 ${intervalMinutes} 分钟)`);

        if (immediate) {
            setTimeout(async () => {
                await this.checkUpdate(feed.id);
            }, 5000);
        }
    }

    stopFeed(feedId: string): void {
        const timer = this.timers.get(feedId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(feedId);
            this.timerIntervals.delete(feedId);
            pluginState.logger.debug(`停止 RSS 定时任务: ${feedId}`);
        }
    }

    stopAll(): void {
        for (const [feedId, timer] of this.timers) {
            clearInterval(timer);
            pluginState.logger.debug(`停止 RSS 定时任务: ${feedId}`);
        }
        this.timers.clear();
        this.timerIntervals.clear();
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
                if ((feed.pendingItems || []).length > 0 && !this.isQuietHours(feed) && !this.shouldHoldForBatch(feed, feed.pendingSince)) {
                    return await this.flushPendingItems(feed);
                }
                return [];
            }

            pluginState.logger.info(`RSS 更新: ${feed.name} - ${result.newItems.length} 条新内容`);

            const now = Date.now();
            const bufferedItems = this.mergeItems(feed.pendingItems || [], result.newItems);

            if (this.isQuietHours(feed)) {
                storage.setPendingItems(feed.id, bufferedItems, feed.pendingSince || now);
                pluginState.logger.info(`RSS 更新进入静默缓存: ${feed.name} - 暂存 ${bufferedItems.length} 条`);
                return result.newItems;
            }

            const nextPendingSince = feed.pendingSince || now;
            if ((feed.batchWindowMinutes || 0) > 0 && this.shouldHoldForBatch(feed, nextPendingSince)) {
                storage.setPendingItems(feed.id, bufferedItems, nextPendingSince);
                pluginState.logger.info(`RSS 更新进入合并窗口: ${feed.name} - 暂存 ${bufferedItems.length} 条`);
                return result.newItems;
            }

            const itemsForDelivery = bufferedItems;
            const itemsToSend = itemsForDelivery.slice(0, MAX_ITEMS_PER_PUSH);
            const skippedCount = Math.max(0, itemsForDelivery.length - itemsToSend.length);

            for (const groupId of feed.groups) {
                if (!pluginState.isGroupEnabled(groupId)) {
                    pluginState.logger.debug(`跳过已禁用群的推送: ${feed.name} -> 群 ${groupId}`);
                    continue;
                }

                try {
                    await this.sendToGroup(feed, groupId, itemsToSend);

                    if (skippedCount > 0) {
                        await message.sendGroupMessage(
                            pluginState.ctx,
                            groupId,
                            `【${feed.name}】当前待推送共 ${itemsForDelivery.length} 条，已推送前 ${itemsToSend.length} 条，其余 ${skippedCount} 条已暂缓，请稍后再次检查。`
                        );
                    }

                    pluginState.incrementProcessed();
                    storage.markFeedPushSuccess(feed.id, itemsToSend.length);
                } catch (error) {
                    pluginState.logger.error(`推送失败: ${feed.name} -> 群 ${groupId}: ${error}`);
                    storage.markFeedError(feed.id, error instanceof Error ? error.message : String(error));
                }
            }

            if (skippedCount > 0) {
                storage.setPendingItems(feed.id, itemsForDelivery.slice(itemsToSend.length), Date.now());
            } else {
                storage.clearPendingItems(feed.id);
            }

            return result.newItems;
        } finally {
            this.runningFeeds.delete(feedId);
            this.refreshFeedSchedule(feedId);
        }
    }

    private async flushPendingItems(feed: FeedConfig): Promise<FeedItem[]> {
        const pendingItems = feed.pendingItems || [];
        if (pendingItems.length === 0) {
            return [];
        }

        const itemsToSend = pendingItems.slice(0, MAX_ITEMS_PER_PUSH);
        const skippedCount = Math.max(0, pendingItems.length - itemsToSend.length);

        for (const groupId of feed.groups) {
            if (!pluginState.isGroupEnabled(groupId)) {
                continue;
            }

            await this.sendToGroup(feed, groupId, itemsToSend);
            if (skippedCount > 0) {
                await message.sendGroupMessage(
                    pluginState.ctx,
                    groupId,
                    `【${feed.name}】静默/合并窗口结束，已补发 ${itemsToSend.length} 条内容，仍有 ${skippedCount} 条待后续发送。`
                );
            }
        }

        pluginState.incrementProcessed();
        storage.markFeedPushSuccess(feed.id, itemsToSend.length);

        if (skippedCount > 0) {
            storage.setPendingItems(feed.id, pendingItems.slice(itemsToSend.length), Date.now());
        } else {
            storage.clearPendingItems(feed.id);
        }

        return pendingItems;
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
                try {
                    for (const item of items) {
                        await message.sendPuppeteer(feed, groupId, item);
                    }
                } catch (error) {
                    pluginState.logger.warn(`Puppeteer 发送失败，回退为文本: ${feed.name} -> 群 ${groupId}`);
                    for (const item of items) {
                        await message.sendSingle(feed, groupId, item);
                    }
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
