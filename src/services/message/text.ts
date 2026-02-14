/**
 * 单条消息发送模块
 */

import type { FeedItem, FeedConfig, OB11PostSendMsg } from '../../types';
import type { OB11Message } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../../core/state';

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
        `${item.title}`,
        '',
    ];

    if (item.description) {
        lines.push(item.description.slice(0, 200));
        lines.push('');
    }

    if (item.link) {
        lines.push(`链接: ${item.link}`);
    }

    if (item.author) {
        lines.push(`作者: ${item.author}`);
    }

    if (item.pubDate) {
        const date = new Date(item.pubDate).toLocaleString('zh-CN');
        lines.push(`发布时间: ${date}`);
    }

    return [{ type: 'text', data: { text: lines.join('\n') } }];
}
