/**
 * 消息处理器
 * 处理接收到的 QQ 消息事件，包含命令解析与分发
 */

import type { OB11Message } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { sendGroupMessage } from '../services/message/text';
import { sendForward } from '../services/message/forward';
import * as rss from '../services/rss';
import * as storage from '../services/rss/storage';
import { feedScheduler } from '../core/scheduler';
import { testFeed } from '../services/rss/fetcher';

const cooldownMap = new Map<string, number>();

function getCooldownRemaining(groupId: number | string, command: string): number {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return 0;

    const key = `${groupId}:${command}`;
    const expireTime = cooldownMap.get(key);
    if (!expireTime) return 0;

    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    if (remaining <= 0) {
        cooldownMap.delete(key);
        return 0;
    }
    return remaining;
}

function setCooldown(groupId: number | string, command: string): void {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return;
    cooldownMap.set(`${groupId}:${command}`, Date.now() + cdSeconds * 1000);
}

export async function handleMessage(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
    try {
        const rawMessage = event.raw_message || '';
        const messageType = event.message_type;
        const groupId = event.group_id;

        if (messageType === 'group' && groupId) {
            if (!pluginState.isGroupEnabled(String(groupId))) return;
        }

        const prefix = pluginState.config.commandPrefix || '#rss';
        if (!rawMessage.startsWith(prefix)) return;

        const args = rawMessage.slice(prefix.length).trim().split(/\s+/);
        const subCommand = args[0]?.toLowerCase() || '';

        switch (subCommand) {
            case 'help':
            case '?':
                await sendHelp(ctx, event);
                break;
            case 'add':
                if (messageType === 'group' && groupId) {
                    const remaining = getCooldownRemaining(groupId, 'add');
                    if (remaining > 0) {
                        await sendGroupMessage(ctx, groupId, `请等待 ${remaining} 秒后再试`);
                        return;
                    }
                }
                await handleAdd(ctx, event, args.slice(1));
                break;
            case 'del':
            case 'delete':
            case 'remove':
                await handleDelete(ctx, event, args.slice(1));
                break;
            case 'list':
            case 'ls':
                await handleList(ctx, event);
                break;
            case 'set':
                await handleSet(ctx, event, args.slice(1));
                break;
            case 'test':
                await handleTest(ctx, event, args.slice(1));
                break;
            case 'enable':
                await handleEnable(ctx, event, args.slice(1), true);
                break;
            case 'disable':
                await handleEnable(ctx, event, args.slice(1), false);
                break;
            case 'check':
                await handleCheck(ctx, event, args.slice(1));
                break;
            case 'status':
                await handleStatus(ctx, event);
                break;
            case 'category':
            case 'cat':
                await handleCategory(ctx, event, args.slice(1));
                break;
        }
    } catch (error) {
        pluginState.logger.error('处理消息时出错:', error);
    }
}

async function sendHelp(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
    const prefix = pluginState.config.commandPrefix || '#rss';
    const helpText = [
        `【${prefix} 帮助】`,
        `${prefix} add <url> [name] - 添加订阅`,
        `${prefix} del <id> - 删除订阅`,
        `${prefix} list - 查看订阅列表`,
        `${prefix} set <id> <key> <value> - 修改订阅配置`,
        `${prefix} test <id> - 测试推送`,
        `${prefix} enable <id> - 启用订阅`,
        `${prefix} disable <id> - 禁用订阅`,
        `${prefix} check <id> - 手动检查更新`,
        `${prefix} status - 查看状态`,
        `${prefix} cat add <name> - 添加分类`,
        `${prefix} cat del <id> - 删除分类`,
        `${prefix} cat list - 查看分类`,
        `${prefix} cat set <feedId> <catId> - 设置订阅分类`,
    ].join('\n');

    const target = event.message_type === 'group' && event.group_id 
        ? String(event.group_id) 
        : undefined;
    
    if (target) {
        await sendGroupMessage(ctx, target, helpText);
    }
}

async function handleAdd(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    if (args.length < 1) {
        await sendGroupMessage(ctx, String(event.group_id), '用法: #rss add <url> [name]');
        return;
    }

    const url = args[0];
    const name = args.slice(1).join(' ') || new URL(url).hostname;

    const feedId = storage.generateFeedId();
    const feed = storage.getAllFeeds()[feedId] = {
        id: feedId,
        url,
        name,
        enabled: true,
        updateInterval: pluginState.config.defaultUpdateInterval,
        sendMode: pluginState.config.defaultSendMode,
        groups: event.group_id ? [String(event.group_id)] : [],
    };

    storage.addFeed(feed);
    feedScheduler.startFeed(feed);

    await sendGroupMessage(
        ctx, 
        String(event.group_id), 
        `已添加订阅: ${name}\nURL: ${url}\nID: ${feedId}`
    );

    if (event.message_type === 'group' && event.group_id) {
        setCooldown(event.group_id, 'add');
    }
}

async function handleDelete(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    if (args.length < 1) {
        await sendGroupMessage(ctx, String(event.group_id), '用法: #rss del <id>');
        return;
    }

    const feedId = args[0];
    const feed = storage.getFeed(feedId);

    if (!feed) {
        await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${feedId}`);
        return;
    }

    feedScheduler.stopFeed(feedId);
    storage.deleteFeed(feedId);

    await sendGroupMessage(ctx, String(event.group_id), `已删除订阅: ${feed.name}`);
}

async function handleList(
    ctx: NapCatPluginContext,
    event: OB11Message
): Promise<void> {
    const feeds = storage.getAllFeeds();
    const feedList = Object.values(feeds);

    if (feedList.length === 0) {
        await sendGroupMessage(ctx, String(event.group_id), '暂无订阅，使用 #rss add <url> 添加');
        return;
    }

    const lines = ['【订阅列表】'];
    for (const feed of feedList) {
        const status = feed.enabled ? '✅' : '❌';
        const modeText = { single: '单条', forward: '合并', puppeteer: '图片' }[feed.sendMode];
        lines.push(`${status} ${feed.name} (${feed.id})`);
        lines.push(`   模式: ${modeText} | 群: ${feed.groups.length}个 | 间隔: ${feed.updateInterval}分钟`);
    }

    await sendGroupMessage(ctx, String(event.group_id), lines.join('\n'));
}

async function handleSet(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    if (args.length < 3) {
        await sendGroupMessage(
            ctx, 
            String(event.group_id), 
            '用法: #rss set <id> <key> <value>\nkey: name/updateInterval/sendMode/groups'
        );
        return;
    }

    const [feedId, key, ...valueParts] = args;
    const value = valueParts.join(' ');
    const feed = storage.getFeed(feedId);

    if (!feed) {
        await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${feedId}`);
        return;
    }

    switch (key) {
        case 'name':
            storage.updateFeed(feedId, { name: value });
            break;
        case 'updateInterval':
            const interval = parseInt(value, 10);
            if (isNaN(interval) || interval < 5) {
                await sendGroupMessage(ctx, String(event.group_id), '间隔时间不能小于5分钟');
                return;
            }
            storage.updateFeed(feedId, { updateInterval: interval });
            feedScheduler.startFeed({ ...feed, updateInterval: interval });
            break;
        case 'sendMode':
            if (!['single', 'forward', 'puppeteer'].includes(value)) {
                await sendGroupMessage(ctx, String(event.group_id), '发送方式: single/forward/puppeteer');
                return;
            }
            storage.updateFeed(feedId, { sendMode: value as 'single' | 'forward' | 'puppeteer' });
            break;
        case 'groups':
            const groups = value.split(',').map((g) => g.trim()).filter((g) => g);
            storage.updateFeed(feedId, { groups });
            break;
        default:
            await sendGroupMessage(ctx, String(event.group_id), `未知配置项: ${key}`);
            return;
    }

    await sendGroupMessage(ctx, String(event.group_id), `已更新 ${feed.name} 的 ${key}`);
}

async function handleTest(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    if (args.length < 1) {
        await sendGroupMessage(ctx, String(event.group_id), '用法: #rss test <id>');
        return;
    }

    const feedId = args[0];
    const feed = storage.getFeed(feedId);

    if (!feed) {
        await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${feedId}`);
        return;
    }

    await sendGroupMessage(ctx, String(event.group_id), `正在测试订阅: ${feed.name}...`);

    const result = await testFeed(feed);

    if (!result.success) {
        await sendGroupMessage(
            ctx, 
            String(event.group_id), 
            `测试失败: ${feed.name}\n错误: ${result.error}`
        );
        return;
    }

    if (result.items.length === 0) {
        await sendGroupMessage(ctx, String(event.group_id), `测试成功，但该订阅暂无内容`);
        return;
    }

    if (feed.sendMode === 'forward') {
        await sendForward(ctx, String(event.group_id), result.items.slice(0, 3));
    } else {
        for (const item of result.items.slice(0, 3)) {
            if (feed.sendMode === 'single') {
                const { sendSingle } = await import('../services/message/text');
                await sendSingle(feed, String(event.group_id), item);
            }
        }
    }

    await sendGroupMessage(
        ctx, 
        String(event.group_id), 
        `测试成功，推送 ${Math.min(3, result.items.length)} 条内容`
    );
}

async function handleEnable(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[],
    enabled: boolean
): Promise<void> {
    if (args.length < 1) {
        await sendGroupMessage(
            ctx, 
            String(event.group_id), 
            `用法: #rss ${enabled ? 'enable' : 'disable'} <id>`
        );
        return;
    }

    const feedId = args[0];
    const feed = storage.getFeed(feedId);

    if (!feed) {
        await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${feedId}`);
        return;
    }

    storage.updateFeed(feedId, { enabled });

    if (enabled) {
        feedScheduler.startFeed({ ...feed, enabled: true });
    } else {
        feedScheduler.stopFeed(feedId);
    }

    await sendGroupMessage(
        ctx, 
        String(event.group_id), 
        `已${enabled ? '启用' : '禁用'}订阅: ${feed.name}`
    );
}

async function handleCheck(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    if (args.length < 1) {
        await sendGroupMessage(ctx, String(event.group_id), '用法: #rss check <id>');
        return;
    }

    const feedId = args[0];
    const feed = storage.getFeed(feedId);

    if (!feed) {
        await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${feedId}`);
        return;
    }

    await sendGroupMessage(ctx, String(event.group_id), `正在检查: ${feed.name}...`);

    const items = await feedScheduler.checkUpdate(feedId);

    if (items.length === 0) {
        await sendGroupMessage(ctx, String(event.group_id), `${feed.name} 暂无更新`);
    } else {
        await sendGroupMessage(
            ctx, 
            String(event.group_id), 
            `${feed.name} 发现 ${items.length} 条更新并已推送`
        );
    }
}

async function handleStatus(
    ctx: NapCatPluginContext,
    event: OB11Message
): Promise<void> {
    const feeds = Object.values(storage.getAllFeeds());
    const enabled = feeds.filter((f) => f.enabled).length;
    const activeTimers = feedScheduler.getActiveTimers().length;

    const statusText = [
        '【RSS 订阅状态】',
        `订阅总数: ${feeds.length}`,
        `启用中: ${enabled}`,
        `运行任务: ${activeTimers}`,
    ].join('\n');

    await sendGroupMessage(ctx, String(event.group_id), statusText);
}

async function handleCategory(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    const action = args[0]?.toLowerCase();
    const categories = pluginState.config.categories || {};

    switch (action) {
        case 'add':
            if (args.length < 2) {
                await sendGroupMessage(ctx, String(event.group_id), '用法: #rss cat add <名称>');
                return;
            }
            const catName = args.slice(1).join(' ');
            const catId = 'cat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            pluginState.updateConfig({
                categories: {
                    ...categories,
                    [catId]: { id: catId, name: catName, createdAt: Date.now() }
                }
            });
            await sendGroupMessage(ctx, String(event.group_id), `已添加分类: ${catName}`);
            break;

        case 'del':
        case 'delete':
            if (args.length < 2) {
                await sendGroupMessage(ctx, String(event.group_id), '用法: #rss cat del <分类ID>');
                return;
            }
            const delCatId = args[1];
            if (!categories[delCatId]) {
                await sendGroupMessage(ctx, String(event.group_id), `未找到分类: ${delCatId}`);
                return;
            }
            const feeds = storage.getAllFeeds();
            for (const feed of Object.values(feeds)) {
                if (feed.categoryId === delCatId) {
                    storage.updateFeed(feed.id, { categoryId: undefined });
                }
            }
            const newCategories = { ...categories };
            delete newCategories[delCatId];
            pluginState.updateConfig({ categories: newCategories });
            await sendGroupMessage(ctx, String(event.group_id), `已删除分类: ${categories[delCatId].name}`);
            break;

        case 'list':
        case 'ls':
            const catList = Object.values(categories);
            if (catList.length === 0) {
                await sendGroupMessage(ctx, String(event.group_id), '暂无分类');
                return;
            }
            const allFeeds = storage.getAllFeeds();
            const catLines = ['【分类列表】'];
            for (const cat of catList) {
                const feedCount = Object.values(allFeeds).filter(f => f.categoryId === cat.id).length;
                catLines.push(`• ${cat.name} (${cat.id}) - ${feedCount}个订阅`);
            }
            await sendGroupMessage(ctx, String(event.group_id), catLines.join('\n'));
            break;

        case 'set':
            if (args.length < 3) {
                await sendGroupMessage(ctx, String(event.group_id), '用法: #rss cat set <订阅ID> <分类ID>');
                return;
            }
            const targetFeedId = args[1];
            const targetCatId = args[2];
            const targetFeed = storage.getFeed(targetFeedId);
            if (!targetFeed) {
                await sendGroupMessage(ctx, String(event.group_id), `未找到订阅: ${targetFeedId}`);
                return;
            }
            if (targetCatId !== 'none' && !categories[targetCatId]) {
                await sendGroupMessage(ctx, String(event.group_id), `未找到分类: ${targetCatId}`);
                return;
            }
            storage.updateFeed(targetFeedId, { categoryId: targetCatId === 'none' ? undefined : targetCatId });
            const catNameStr = targetCatId === 'none' ? '未分类' : categories[targetCatId].name;
            await sendGroupMessage(ctx, String(event.group_id), `已将 ${targetFeed.name} 设置为: ${catNameStr}`);
            break;

        default:
            await sendGroupMessage(ctx, String(event.group_id), 
                '用法: #rss cat <add|del|list|set>\n  add <名称> - 添加分类\n  del <ID> - 删除分类\n  list - 查看分类\n  set <订阅ID> <分类ID|none> - 设置订阅分类');
    }
}
