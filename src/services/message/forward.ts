/**
 * 合并转发消息发送模块
 */

import type { FeedItem, FeedConfig, ForwardNode } from '../../types';
import { pluginState } from '../../core/state';

const DEFAULT_FORWARD_TEMPLATE = `【{feedName}】
{title}
{description}
链接: {link}
作者: {author} | 时间: {time}`;

export async function sendForward(
    feed: FeedConfig,
    groupId: string,
    items: FeedItem[]
): Promise<void> {
    const ctx = pluginState.ctx;
    
    const nodes: ForwardNode[] = items.map((item) => buildForwardNode(feed, item));
    
    await ctx.actions.call(
        'send_group_forward_msg',
        {
            group_id: groupId,
            message: nodes,
        },
        ctx.adapterName,
        ctx.pluginManager.config
    );
}

function buildForwardNode(feed: FeedConfig, item: FeedItem): ForwardNode {
    const template = feed.customForwardTemplate || DEFAULT_FORWARD_TEMPLATE;
    
    const desc = item.description && item.description.length > 300 
        ? item.description.slice(0, 300) + '...'
        : item.description || '';
    
    const time = item.pubDate ? new Date(item.pubDate).toLocaleString('zh-CN') : '';
    
    const contentText = template
        .replace(/{feedName}/g, feed.name)
        .replace(/{title}/g, item.title || '')
        .replace(/{description}/g, desc)
        .replace(/{link}/g, item.link || '')
        .replace(/{author}/g, item.author || '')
        .replace(/{time}/g, time);
    
    const content: Array<{ type: string; data: Record<string, string> }> = [];
    content.push({ type: 'text', data: { text: contentText } });

    return {
        type: 'node',
        data: {
            nickname: feed.name,
            user_id: '114514',
            content,
        },
    };
}
