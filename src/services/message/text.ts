/**
 * 单条消息发送模块
 */

import type { FeedItem, FeedConfig, OB11PostSendMsg } from '../../types';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';
import { formatItemTime, getItemSummary } from './utils';

export async function sendSingle(
    feed: FeedConfig,
    groupId: string,
    item: FeedItem
): Promise<void> {
    const ctx = pluginState.ctx;
    const message = buildTextMessage(feed, item);
    
    await ctx.actions.call(
        'send_msg',
        {
            message_type: 'group',
            group_id: groupId,
            message,
        },
        ctx.adapterName,
        ctx.pluginManager.config
    );
}

export async function sendGroupMessage(
    ctx: NapCatPluginContext,
    groupId: string,
    message: OB11PostSendMsg['message']
): Promise<void> {
    await ctx.actions.call(
        'send_msg',
        {
            message_type: 'group',
            group_id: groupId,
            message,
        },
        ctx.adapterName,
        ctx.pluginManager.config
    );
}

function buildTextMessage(feed: FeedConfig, item: FeedItem): Array<{ type: string; data: Record<string, string> }> {
    const lines: string[] = [
        `【${feed.name}】`,
        item.title || '未命名内容',
    ];

    const summary = getItemSummary(item, 220);
    if (summary) {
        lines.push('');
        lines.push(summary);
    }

    if (item.link) {
        lines.push('');
        lines.push(`链接: ${item.link}`);
    }

    if (item.author) {
        lines.push(`作者: ${item.author}`);
    }

    const formattedTime = formatItemTime(item.pubDate);
    if (formattedTime) {
        lines.push(`发布时间: ${formattedTime}`);
    }

    return [{ type: 'text', data: { text: lines.join('\n') } }];
}
