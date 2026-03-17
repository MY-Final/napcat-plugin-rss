/**
 * Puppeteer 图片消息发送模块
 */

import type { FeedItem, FeedConfig } from '../../types';
import { pluginState } from '../../core/state';
import { puppeteerClient } from '../puppeteer/client';
import { applyTemplate } from '../puppeteer/templates';
import { formatItemTime, getItemSummary } from './utils';

export async function sendPuppeteer(
    feed: FeedConfig,
    groupId: string,
    item: FeedItem
): Promise<void> {
    const ctx = pluginState.ctx;
    
    const html = applyTemplate(feed, item);
    
    let imageBase64: string;
    try {
        imageBase64 = await puppeteerClient.renderHtml(html, {
            type: 'png',
            fullPage: false,
            setViewport: { width: 600, height: 400, deviceScaleFactor: 2 },
        });
    } catch (error) {
        pluginState.logger.error(`Puppeteer 渲染失败: ${error}`);
        throw error;
    }
    
    await ctx.actions.call(
        'send_msg',
        {
            message_type: 'group',
            group_id: groupId,
            message: [
                { type: 'image', data: { file: `base64://${imageBase64}` } },
                {
                    type: 'text',
                    data: {
                        text: buildImageCaption(feed, item),
                    },
                },
            ],
        },
        ctx.adapterName,
        ctx.pluginManager.config
    );
}

function buildImageCaption(feed: FeedConfig, item: FeedItem): string {
    const lines = [`【${feed.name}】`, item.title || '未命名内容'];
    const summary = getItemSummary(item, 120);

    if (summary) {
        lines.push(summary);
    }

    if (item.link) {
        lines.push(`链接: ${item.link}`);
    }

    const formattedTime = formatItemTime(item.pubDate);
    if (formattedTime) {
        lines.push(`发布时间: ${formattedTime}`);
    }

    return lines.join('\n');
}
