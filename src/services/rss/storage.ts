/**
 * RSS 订阅存储模块
 * 负责订阅源配置与运行态数据的持久化和 CRUD 操作
 */

import type { FeedConfig, FeedRuntime, FeedItem } from '../../types';
import { pluginState } from '../../core/state';

const RUNTIME_FILE = 'feed-runtime.json';

const RUNTIME_KEYS: Array<keyof FeedRuntime> = [
    'recentItemFingerprints',
    'lastPublishTime',
    'lastCheckTime',
    'lastUpdateTime',
    'lastSuccessTime',
    'lastPushTime',
    'lastPushCount',
    'errorCount',
    'lastError',
    'lastErrorTime',
    'pendingItems',
    'pendingSince',
];

let runtimeStore: Record<string, FeedRuntime> | null = null;

function isRuntimeKey(key: string): key is keyof FeedRuntime {
    return (RUNTIME_KEYS as string[]).includes(key);
}

function ensureRuntimeStore(): Record<string, FeedRuntime> {
    if (runtimeStore) {
        return runtimeStore;
    }

    if (!pluginState.isInitialized) {
        runtimeStore = {};
        return runtimeStore;
    }

    runtimeStore = pluginState.loadDataFile<Record<string, FeedRuntime>>(RUNTIME_FILE, {});

    const feeds = pluginState.config.feeds || {};
    let migrated = false;
    const sanitizedFeeds: Record<string, FeedConfig> = {};

    for (const [feedId, feed] of Object.entries(feeds)) {
        const nextFeed = { ...feed } as FeedConfig;
        const runtime: FeedRuntime = { ...(runtimeStore[feedId] || {}) };

        for (const key of Object.keys(feed)) {
            if (!isRuntimeKey(key)) {
                continue;
            }

            const runtimeKey = key as keyof FeedRuntime;
            const value = feed[runtimeKey];
            if (value !== undefined && runtime[runtimeKey] === undefined) {
                (runtime as Record<string, unknown>)[runtimeKey] = value;
            }
            delete nextFeed[runtimeKey];
            migrated = true;
        }

        runtimeStore[feedId] = runtime;
        sanitizedFeeds[feedId] = nextFeed;
    }

    if (migrated) {
        pluginState.updateConfig({ feeds: sanitizedFeeds });
        pluginState.saveDataFile(RUNTIME_FILE, runtimeStore);
    }

    return runtimeStore;
}

function saveRuntimeStore(): void {
    if (!runtimeStore || !pluginState.isInitialized) {
        return;
    }
    pluginState.saveDataFile(RUNTIME_FILE, runtimeStore);
}

function splitFeed(feed: FeedConfig): { config: FeedConfig; runtime: FeedRuntime } {
    const runtime: FeedRuntime = {};
    const config = { ...feed };

    for (const key of RUNTIME_KEYS) {
        const value = config[key];
        if (value !== undefined) {
            (runtime as Record<string, unknown>)[key] = value;
        }
        delete config[key];
    }

    return { config, runtime };
}

function mergeFeed(feed: FeedConfig): FeedConfig {
    const runtime = ensureRuntimeStore()[feed.id] || {};
    return { ...feed, ...runtime };
}

function patchFeed(id: string, updates: Partial<FeedConfig>, logMessage?: string): boolean {
    if (!pluginState.isInitialized) {
        return false;
    }

    const feeds = pluginState.config.feeds || {};
    const existingFeed = feeds[id];
    if (!existingFeed) {
        return false;
    }

    const runtime = ensureRuntimeStore();
    const configUpdates: Partial<FeedConfig> = {};
    const runtimeUpdates: Partial<FeedRuntime> = {};

    for (const [key, value] of Object.entries(updates)) {
        if (isRuntimeKey(key)) {
            (runtimeUpdates as Record<string, unknown>)[key] = value;
        } else {
            (configUpdates as Record<string, unknown>)[key] = value;
        }
    }

    if (Object.keys(configUpdates).length > 0) {
        feeds[id] = { ...existingFeed, ...configUpdates };
        pluginState.updateConfig({ feeds });
    }

    if (Object.keys(runtimeUpdates).length > 0) {
        runtime[id] = { ...(runtime[id] || {}), ...runtimeUpdates };
        saveRuntimeStore();
    }

    if (logMessage && pluginState.isInitialized) {
        pluginState.logger.info(logMessage);
    }

    return true;
}

export function getAllFeeds(): Record<string, FeedConfig> {
    const feeds = pluginState.config.feeds || {};
    const merged: Record<string, FeedConfig> = {};

    for (const feed of Object.values(feeds)) {
        merged[feed.id] = mergeFeed(feed);
    }

    return merged;
}

export function getFeed(id: string): FeedConfig | undefined {
    const feed = pluginState.config.feeds?.[id];
    return feed ? mergeFeed(feed) : undefined;
}

export function addFeed(feed: FeedConfig): void {
    const feeds = pluginState.config.feeds || {};
    const { config, runtime } = splitFeed(feed);

    feeds[config.id] = config;
    pluginState.updateConfig({ feeds });

    ensureRuntimeStore()[config.id] = runtime;
    saveRuntimeStore();

    pluginState.logger.info(`添加 RSS 订阅: ${feed.name} (${feed.id})`);
}

export function updateFeed(id: string, updates: Partial<FeedConfig>): boolean {
    return patchFeed(id, updates, `更新 RSS 订阅: ${id}`);
}

export function deleteFeed(id: string): boolean {
    const feeds = pluginState.config.feeds || {};
    if (!feeds[id]) {
        return false;
    }

    delete feeds[id];
    pluginState.updateConfig({ feeds });

    const runtime = ensureRuntimeStore();
    delete runtime[id];
    saveRuntimeStore();

    pluginState.logger.info(`删除 RSS 订阅: ${id}`);
    return true;
}

export function updateFeedLastPublishTime(id: string, pubDate: number): void {
    patchFeed(id, { lastPublishTime: pubDate, lastUpdateTime: Date.now() });
}

export function rememberFeedFingerprints(id: string, fingerprints: string[]): void {
    patchFeed(id, { recentItemFingerprints: fingerprints.slice(0, 50) });
}

export function markFeedCheckStart(id: string): void {
    patchFeed(id, { lastCheckTime: Date.now() });
}

export function markFeedCheckSuccess(id: string, updates: Partial<FeedConfig> = {}): void {
    patchFeed(id, {
        ...updates,
        lastSuccessTime: Date.now(),
        lastError: undefined,
        lastErrorTime: undefined,
    });
}

export function markFeedPushSuccess(id: string, pushCount: number): void {
    patchFeed(id, {
        lastPushTime: Date.now(),
        lastPushCount: pushCount,
    });
}

export function markFeedError(id: string, error: string): void {
    const feed = getFeed(id);
    patchFeed(id, {
        errorCount: (feed?.errorCount || 0) + 1,
        lastError: error,
        lastErrorTime: Date.now(),
    });
}

export function setPendingItems(id: string, items: FeedItem[], pendingSince?: number): void {
    patchFeed(id, {
        pendingItems: items,
        pendingSince,
    });
}

export function clearPendingItems(id: string): void {
    patchFeed(id, {
        pendingItems: [],
        pendingSince: undefined,
    });
}

export function resetFeedErrorCount(id: string): void {
    patchFeed(id, { errorCount: 0 });
}

export function getEnabledFeeds(): FeedConfig[] {
    return Object.values(getAllFeeds()).filter((feed) => feed.enabled);
}

export function generateFeedId(): string {
    return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
