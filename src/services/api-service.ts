/**
 * API 服务模块
 * 注册 WebUI API 路由
 */

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import * as rss from '../services/rss';
import * as storage from '../services/rss/storage';
import { feedScheduler } from '../core/scheduler';
import type { FeedConfig, SendMode, Category } from '../types';
import { DEFAULT_TEMPLATE, applyTemplate } from './puppeteer/templates';
import { puppeteerClient } from './puppeteer/client';
import { testProxyConnection } from './rss/parser';

function generateCategoryId(): string {
    return 'cat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function syncSchedulerState(): void {
    puppeteerClient.setEndpoint(pluginState.config.puppeteerEndpoint);

    if (!pluginState.config.enabled) {
        feedScheduler.stopAll();
        return;
    }

    feedScheduler.stopAll();
    feedScheduler.startAll();
}

export function registerApiRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.getNoAuth('/status', async (_req, res) => {
        const feeds = storage.getAllFeeds();
        const feedList = Object.values(feeds);
        const enabledFeeds = feedList.filter(f => f.enabled).length;
        const runningFeeds = feedList.filter(f => feedScheduler.isFeedRunning(f.id)).length;
        const unhealthyFeeds = feedList.filter((f) => (f.errorCount || 0) > 0).length;
        
        let puppeteerStatus = 'disconnected';
        let puppeteerError = '';
        try {
            const connected = await puppeteerClient.checkStatus();
            puppeteerStatus = connected ? 'connected' : 'disconnected';
        } catch (e: any) {
            puppeteerStatus = 'error';
            puppeteerError = e.message || '连接失败';
        }

        res.json({
            code: 0,
            data: {
                pluginName: ctx.pluginName,
                uptime: pluginState.getUptime(),
                uptimeFormatted: pluginState.getUptimeFormatted(),
                config: pluginState.config,
                stats: pluginState.stats,
                feeds: {
                    total: feedList.length,
                    enabled: enabledFeeds,
                    running: runningFeeds,
                    unhealthy: unhealthyFeeds,
                },
                puppeteer: {
                    status: puppeteerStatus,
                    error: puppeteerError,
                    endpoint: pluginState.config.puppeteerEndpoint,
                },
            },
        });
    });

    router.getNoAuth('/config', (_req, res) => {
        res.json({ code: 0, data: pluginState.config });
    });

    router.postNoAuth('/config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }
            pluginState.updateConfig(body as Partial<import('../types').PluginConfig>);
            syncSchedulerState();
            ctx.logger.info('配置已保存');
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('保存配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/groups', async (_req, res) => {
        try {
            const groups = await ctx.actions.call(
                'get_group_list',
                {},
                ctx.adapterName,
                ctx.pluginManager.config
            ) as Array<{ group_id: number; group_name: string; member_count: number; max_member_count: number }>;

            const groupsWithConfig = (groups || []).map((group) => {
                const groupId = String(group.group_id);
                return {
                    group_id: group.group_id,
                    group_name: group.group_name,
                    member_count: group.member_count,
                    max_member_count: group.max_member_count,
                    enabled: pluginState.isGroupEnabled(groupId),
                };
            });

            res.json({ code: 0, data: groupsWithConfig });
        } catch (e) {
            ctx.logger.error('获取群列表失败:', e);
            res.status(500).json({ code: -1, message: String(e) });
        }
    });

    router.postNoAuth('/groups/:id/config', async (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const body = req.body as Record<string, unknown> | undefined;
            const enabled = body?.enabled;
            pluginState.updateGroupConfig(groupId, { enabled: Boolean(enabled) });
            ctx.logger.info(`群 ${groupId} 配置已更新: enabled=${enabled}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/groups/bulk-config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            const { enabled, groupIds } = body || {};

            if (typeof enabled !== 'boolean' || !Array.isArray(groupIds)) {
                return res.status(400).json({ code: -1, message: '参数错误' });
            }

            for (const groupId of groupIds) {
                pluginState.updateGroupConfig(String(groupId), { enabled });
            }

            ctx.logger.info(`批量更新群配置完成 | 数量: ${groupIds.length}, enabled=${enabled}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('批量更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/categories', (_req, res) => {
        const categories = pluginState.config.categories || {};
        const categoryList = Object.values(categories).map(cat => ({
            ...cat,
            feedCount: Object.values(storage.getAllFeeds()).filter(f => f.categoryId === cat.id).length
        }));
        res.json({ code: 0, data: categoryList });
    });

    router.postNoAuth('/categories', async (req, res) => {
        try {
            const body = req.body as Partial<Category> | undefined;
            if (!body || !body.name) {
                return res.status(400).json({ code: -1, message: '缺少分类名称' });
            }

            const categoryId = generateCategoryId();
            const category: Category = {
                id: categoryId,
                name: body.name,
                color: body.color || '#667eea',
                createdAt: Date.now(),
            };

            pluginState.updateConfig({
                categories: {
                    ...pluginState.config.categories,
                    [categoryId]: category
                }
            });

            ctx.logger.info(`添加分类: ${category.name}`);
            res.json({ code: 0, data: category });
        } catch (err) {
            ctx.logger.error('添加分类失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.putNoAuth('/categories/:id', async (req, res) => {
        try {
            const categoryId = req.params?.id;
            if (!categoryId) {
                return res.status(400).json({ code: -1, message: '缺少分类 ID' });
            }

            const body = req.body as Partial<Category> | undefined;
            const existingCategory = pluginState.config.categories?.[categoryId];

            if (!existingCategory) {
                return res.status(404).json({ code: -1, message: '分类不存在' });
            }

            const updatedCategory: Category = {
                ...existingCategory,
                ...body,
                id: categoryId,
            };

            pluginState.updateConfig({
                categories: {
                    ...pluginState.config.categories,
                    [categoryId]: updatedCategory
                }
            });

            ctx.logger.info(`更新分类: ${updatedCategory.name}`);
            res.json({ code: 0, data: updatedCategory });
        } catch (err) {
            ctx.logger.error('更新分类失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.deleteNoAuth('/categories/:id', async (req, res) => {
        try {
            const categoryId = req.params?.id;
            if (!categoryId) {
                return res.status(400).json({ code: -1, message: '缺少分类 ID' });
            }

            const existingCategory = pluginState.config.categories?.[categoryId];
            if (!existingCategory) {
                return res.status(404).json({ code: -1, message: '分类不存在' });
            }

            const feeds = storage.getAllFeeds();
            for (const feed of Object.values(feeds)) {
                if (feed.categoryId === categoryId) {
                    storage.updateFeed(feed.id, { categoryId: undefined });
                }
            }

            const newCategories = { ...pluginState.config.categories };
            delete newCategories[categoryId];
            pluginState.updateConfig({ categories: newCategories });

            ctx.logger.info(`删除分类: ${existingCategory.name}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('删除分类失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/feeds', (_req, res) => {
        const feeds = storage.getAllFeeds();
        const feedList = Object.values(feeds).map((feed) => ({
            ...feed,
            isRunning: feedScheduler.isFeedRunning(feed.id),
        }));
        res.json({ code: 0, data: feedList });
    });

    router.postNoAuth('/feeds', async (req, res) => {
        try {
            const body = req.body as Partial<FeedConfig> | undefined;
            if (!body || !body.url) {
                return res.status(400).json({ code: -1, message: '缺少 URL 参数' });
            }

            const feedId = storage.generateFeedId();
            const feed: FeedConfig = {
                id: feedId,
                url: body.url,
                name: body.name || new URL(body.url).hostname,
                categoryId: body.categoryId,
                enabled: body.enabled ?? true,
                updateInterval: body.updateInterval || pluginState.config.defaultUpdateInterval,
                sendMode: body.sendMode || pluginState.config.defaultSendMode,
                groups: body.groups || [],
                customHtmlTemplate: body.customHtmlTemplate,
                customForwardTemplate: body.customForwardTemplate,
                keywordWhitelist: body.keywordWhitelist,
                keywordBlacklist: body.keywordBlacklist,
                keywordMatchMode: body.keywordMatchMode,
                quietHoursEnabled: body.quietHoursEnabled,
                quietHoursStart: body.quietHoursStart,
                quietHoursEnd: body.quietHoursEnd,
                batchWindowMinutes: body.batchWindowMinutes,
            };

            const initializedFeed = await rss.initializeFeedBaseline(feed);

            storage.addFeed(initializedFeed);

            if (initializedFeed.enabled) {
                feedScheduler.startFeed(initializedFeed);
            }

            ctx.logger.info(`添加 RSS 订阅: ${initializedFeed.name}`);
            res.json({
                code: 0,
                data: initializedFeed,
                message: initializedFeed.lastPublishTime ? '已添加订阅，并已建立首次检查基线' : '已添加订阅',
            });
        } catch (err) {
            ctx.logger.error('添加订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/config/test-proxy', async (req, res) => {
        try {
            const body = req.body as { proxyUrl?: string; targetUrl?: string } | undefined;
            const proxyUrl = body?.proxyUrl?.trim() || '';
            const targetUrl = body?.targetUrl?.trim() || 'https://github.com/Radiant303.atom';

            const result = await testProxyConnection(targetUrl, proxyUrl || undefined);
            res.json({
                code: 0,
                data: {
                    ...result,
                    targetUrl,
                    proxyUrl,
                    mode: proxyUrl ? 'proxy' : 'direct',
                },
            });
        } catch (err) {
            ctx.logger.error('测试 RSS 代理失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/feeds/validate', async (req, res) => {
        try {
            const body = req.body as Partial<FeedConfig> | undefined;
            if (!body?.url) {
                return res.status(400).json({ code: -1, message: '缺少 URL 参数' });
            }

            const previewFeed: FeedConfig = {
                id: 'preview',
                url: body.url,
                name: body.name || new URL(body.url).hostname,
                enabled: true,
                updateInterval: pluginState.config.defaultUpdateInterval,
                sendMode: body.sendMode || pluginState.config.defaultSendMode,
                groups: [],
                keywordWhitelist: body.keywordWhitelist,
                keywordBlacklist: body.keywordBlacklist,
                keywordMatchMode: body.keywordMatchMode,
                quietHoursEnabled: body.quietHoursEnabled,
                quietHoursStart: body.quietHoursStart,
                quietHoursEnd: body.quietHoursEnd,
                batchWindowMinutes: body.batchWindowMinutes,
            };

            const result = await rss.testFeed(previewFeed);
            if (!result.success) {
                return res.status(400).json({ code: -1, message: result.error || '连接失败' });
            }

            res.json({
                code: 0,
                data: {
                    title: previewFeed.name,
                    itemCount: result.items.length,
                    sample: result.items[0],
                },
            });
        } catch (err) {
            ctx.logger.error('验证订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/feeds/:id', (req, res) => {
        const feedId = req.params?.id;
        if (!feedId) {
            return res.status(400).json({ code: -1, message: '缺少订阅 ID' });
        }

        const feed = storage.getFeed(feedId);
        if (!feed) {
            return res.status(404).json({ code: -1, message: '订阅不存在' });
        }

        res.json({ code: 0, data: { ...feed, isRunning: feedScheduler.isFeedRunning(feed.id) } });
    });

    router.putNoAuth('/feeds/:id', async (req, res) => {
        try {
            const feedId = req.params?.id;
            if (!feedId) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID' });
            }

            const body = req.body as Partial<FeedConfig> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }

            const existingFeed = storage.getFeed(feedId);

            if (!existingFeed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            const wasEnabled = existingFeed.enabled;
            const willBeEnabled = body.enabled ?? wasEnabled;

            let updates = body;
            if (body.url && body.url !== existingFeed.url) {
                updates = await rss.initializeFeedBaseline({
                    ...existingFeed,
                    ...body,
                    id: feedId,
                });
            }

            storage.updateFeed(feedId, updates);

            const updatedFeed = storage.getFeed(feedId);
            if (!updatedFeed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            if (!wasEnabled && willBeEnabled) {
                feedScheduler.startFeed(updatedFeed);
            } else if (wasEnabled && !willBeEnabled) {
                feedScheduler.stopFeed(feedId);
            } else if (willBeEnabled && (body.updateInterval !== undefined || body.url)) {
                feedScheduler.startFeed(updatedFeed);
            }

            ctx.logger.info(`更新 RSS 订阅: ${updatedFeed.name}`);
            res.json({ code: 0, data: updatedFeed });
        } catch (err) {
            ctx.logger.error('更新订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.deleteNoAuth('/feeds/:id', async (req, res) => {
        try {
            const feedId = req.params?.id;
            if (!feedId) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID' });
            }

            const feed = storage.getFeed(feedId);
            if (!feed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            feedScheduler.stopFeed(feedId);
            storage.deleteFeed(feedId);

ctx.logger.info(`删除 RSS 订阅: ${feed.name}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('删除订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.putNoAuth('/feeds/batch', async (req, res) => {
        try {
            const body = req.body as { ids: string[]; enabled?: boolean } | undefined;
            if (!body?.ids || !Array.isArray(body.ids)) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID 列表' });
            }

            const { ids, enabled } = body;
            let updatedCount = 0;

            for (const feedId of ids) {
                const feed = storage.getFeed(feedId);
                if (!feed) continue;

                if (enabled !== undefined) {
                    const newEnabled = enabled;
                    storage.updateFeed(feedId, { enabled: newEnabled });
                    
                    if (newEnabled) {
                        feedScheduler.startFeed({ ...feed, enabled: true });
                    } else {
                        feedScheduler.stopFeed(feedId);
                    }
                }
                updatedCount++;
            }

            ctx.logger.info(`批量更新订阅: ${updatedCount} 个`);
            res.json({ code: 0, data: { count: updatedCount } });
        } catch (err) {
            ctx.logger.error('批量更新订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.deleteNoAuth('/feeds/batch', async (req, res) => {
        try {
            const body = req.body as { ids: string[] } | undefined;
            if (!body?.ids || !Array.isArray(body.ids)) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID 列表' });
            }

            const { ids } = body;
            let deletedCount = 0;

            for (const feedId of ids) {
                const feed = storage.getFeed(feedId);
                if (!feed) continue;

                feedScheduler.stopFeed(feedId);
                storage.deleteFeed(feedId);
                deletedCount++;
            }

            ctx.logger.info(`批量删除订阅: ${deletedCount} 个`);
            res.json({ code: 0, data: { count: deletedCount } });
        } catch (err) {
            ctx.logger.error('批量删除订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/feeds/:id/check', async (req, res) => {
        try {
            const feedId = req.params?.id;
            if (!feedId) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID' });
            }

            const feed = storage.getFeed(feedId);
            if (!feed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            const items = await feedScheduler.previewUpdate(feedId);
            res.json({ code: 0, data: { count: items.length, items } });
        } catch (err) {
            ctx.logger.error('检查更新失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/feeds/:id/test', async (req, res) => {
        try {
            const feedId = req.params?.id;
            if (!feedId) {
                return res.status(400).json({ code: -1, message: '缺少订阅 ID' });
            }

            const feed = storage.getFeed(feedId);
            if (!feed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            const result = await rss.testFeed(feed);
            res.json({ code: 0, data: result });
        } catch (err) {
            ctx.logger.error('测试订阅失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.getNoAuth('/template/default', (_req, res) => {
        res.json({ code: 0, data: DEFAULT_TEMPLATE });
    });

    const previewTemplate = (html: string, variablesRaw: unknown) => {
        const variables = typeof variablesRaw === 'string' ? JSON.parse(variablesRaw) : (variablesRaw || {});
        return applyTemplate(
            { name: (variables as Record<string, string>).feedName || '测试订阅', customHtmlTemplate: html } as FeedConfig,
            {
                title: (variables as Record<string, string>).title || '这是一个更接近真实效果的模板预览标题',
                link: (variables as Record<string, string>).link || 'https://github.com/MY-Final/napcat-plugin-rss',
                description: (variables as Record<string, string>).description || '这里会展示文章摘要、发布时间和链接等内容。你可以在右侧调整自定义 HTML 模板，实时查看卡片最终效果，避免保存后才发现排版异常。',
                pubDate: Date.now(),
                author: (variables as Record<string, string>).author || 'napcat-plugin-rss',
                image: (variables as Record<string, string>).image || 'https://opengraph.githubassets.com/1/MY-Final/napcat-plugin-rss',
            }
        );
    };

    router.getNoAuth('/template/preview', (req, res) => {
        const html = req.query?.html as string;
        const vars = req.query?.vars as string;

        if (!html) {
            return res.status(400).json({ code: -1, message: '缺少 HTML 参数' });
        }

        try {
            res.json({ code: 0, data: previewTemplate(html, vars) });
        } catch (err) {
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    router.postNoAuth('/template/preview', (req, res) => {
        const body = req.body as { html?: string; vars?: unknown } | undefined;
        if (!body?.html) {
            return res.status(400).json({ code: -1, message: '缺少 HTML 参数' });
        }

        try {
            res.json({ code: 0, data: previewTemplate(body.html, body.vars) });
        } catch (err) {
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    ctx.logger.debug('API 路由注册完成');
}
