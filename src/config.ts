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
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        ctx.NapCatConfig.text('commandPrefix', '命令前缀', '#rss', '触发命令的前缀，默认为 #rss'),
        ctx.NapCatConfig.number('cooldownSeconds', '冷却时间（秒）', 60, '同一命令请求冷却时间，0 表示不限制'),
        
        ctx.NapCatConfig.html('<h4 style="margin: 20px 0 10px 0; font-size: 14px; color: #666;">RSS 推送设置</h4>'),
        
        ctx.NapCatConfig.select(
            'defaultSendMode', 
            '默认发送方式', 
            [
                { label: '合并转发', value: 'forward' },
                { label: '单条消息', value: 'single' },
                { label: 'Puppeteer 图片', value: 'puppeteer' },
            ],
            'forward',
            '新订阅默认使用的发送方式'
        ),
        
        ctx.NapCatConfig.number(
            'defaultUpdateInterval', 
            '默认轮询间隔（分钟）', 
            30, 
            'RSS 源更新检测间隔，范围 5-1440'
        ),
        
        ctx.NapCatConfig.text(
            'puppeteerEndpoint', 
            'Puppeteer 服务地址', 
            'http://127.0.0.1:6099', 
            'napcat-plugin-puppeteer 的服务地址'
        ),
    );
}
