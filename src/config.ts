/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig, SendMode } from './types';

export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    commandPrefix: '#rss',
    cooldownSeconds: 60,
    groupConfigs: {},
    feeds: {},
    categories: {},
    defaultSendMode: 'forward',
    defaultUpdateInterval: 30,
    puppeteerEndpoint: 'http://127.0.0.1:6099',
};

export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">RSS 订阅推送</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">定时检测 RSS 更新并推送到群，支持多种发送模式</p>
            </div>
        `),
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        
        ctx.NapCatConfig.html(`
            <div style="font-size: 13px; color: #4b5563; padding: 12px; background: #f9fafb; border-radius: 8px; margin: 16px 0;">
                更多高级配置（订阅管理、轮询间隔、发送方式、Puppeteer 设置等）请前往 
                <a href="/plugin/napcat-plugin-rss/page/dashboard" target="_top" style="color: #667eea; text-decoration: none; font-weight: 600;">WebUI 控制台</a> 
                进行管理。
            </div>
        `),
    );
}
