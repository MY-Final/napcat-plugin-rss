/**
 * Puppeteer 图片消息发送模块
 */

import type { FeedItem, FeedConfig } from '../../types';
import { pluginState } from '../../core/state';
import { puppeteerClient } from '../puppeteer/client';
import { applyTemplate } from '../puppeteer/templates';

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
                { type: 'text', data: { text: `【${feed.name}】更新啦~` } },
                { type: 'image', data: { file: `base64://${imageBase64}` } },
            ],
        },
        ctx.adapterName,
        ctx.pluginManager.config
    );
}
