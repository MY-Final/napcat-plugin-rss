/**
 * 合并转发消息发送模块
 */

import type { FeedItem, FeedConfig, ForwardNode } from '../../types';
import { pluginState } from '../../core/state';

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
    const content: Array<{ type: string; data: Record<string, string> }> = [];
    
    content.push({ type: 'text', data: { text: `【${feed.name}】` } });
    content.push({ type: 'text', data: { text: item.title } });
    
    if (item.description) {
        const desc = item.description.length > 300 
            ? item.description.slice(0, 300) + '...'
            : item.description;
        content.push({ type: 'text', data: { text: desc } });
    }
    
    if (item.link) {
        content.push({ type: 'text', data: { text: `\n链接: ${item.link}` } });
    }
    
    if (item.author || item.pubDate) {
        const meta: string[] = [];
        if (item.author) meta.push(`作者: ${item.author}`);
        if (item.pubDate) {
            const date = new Date(item.pubDate).toLocaleString('zh-CN');
            meta.push(`时间: ${date}`);
        }
        content.push({ type: 'text', data: { text: meta.join(' | ') } });
    }

    return {
        type: 'node',
        data: {
            nickname: feed.name,
            user_id: '114514',
            content,
        },
    };
}
