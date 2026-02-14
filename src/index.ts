/**
 * NapCat RSS 订阅推送插件
 *
 * 生命周期：
 *   plugin_init        → 插件加载时调用
 *   plugin_onmessage   → 收到消息时调用
 *   plugin_onevent     → 收到所有 OneBot 事件时调用
 *   plugin_cleanup     → 插件卸载/重载时调用
 *
 * @author Your Name
 * @license MIT
 */

import type {
    PluginModule,
    PluginConfigSchema,
    NapCatPluginContext,
} from 'napcat-types/napcat-onebot/network/plugin/types';
import { EventType } from 'napcat-types/napcat-onebot/event/index';

import { buildConfigSchema } from './config';
import { pluginState } from './core/state';
import { feedScheduler } from './core/scheduler';
import { handleMessage } from './handlers/message-handler';
import { registerApiRoutes } from './services/api-service';
import type { PluginConfig } from './types';

export let plugin_config_ui: PluginConfigSchema = [];

export const plugin_init: PluginModule['plugin_init'] = async (ctx) => {
    try {
        pluginState.init(ctx);

        ctx.logger.info('RSS 插件初始化中...');

        plugin_config_ui = buildConfigSchema(ctx);

        registerWebUI(ctx);
        registerApiRoutes(ctx);

        feedScheduler.startAll();

        ctx.logger.info('RSS 插件初始化完成');
    } catch (error) {
        ctx.logger.error('RSS 插件初始化失败:', error);
    }
};

export const plugin_onmessage: PluginModule['plugin_onmessage'] = async (ctx, event) => {
    if (event.post_type !== EventType.MESSAGE) return;
    if (!pluginState.config.enabled) return;
    await handleMessage(ctx, event);
};

export const plugin_onevent: PluginModule['plugin_onevent'] = async (ctx, event) => {
    
};

export const plugin_cleanup: PluginModule['plugin_cleanup'] = async (ctx) => {
    try {
        feedScheduler.stopAll();
        pluginState.cleanup();
        ctx.logger.info('RSS 插件已卸载');
    } catch (e) {
        ctx.logger.warn('RSS 插件卸载时出错:', e);
    }
};

export const plugin_get_config: PluginModule['plugin_get_config'] = async (ctx) => {
    return pluginState.config;
};

export const plugin_set_config: PluginModule['plugin_set_config'] = async (ctx, config) => {
    pluginState.replaceConfig(config as PluginConfig);
    ctx.logger.info('配置已通过 WebUI 更新');
};

export const plugin_on_config_change: PluginModule['plugin_on_config_change'] = async (
    ctx, ui, key, value, currentConfig
) => {
    try {
        pluginState.updateConfig({ [key]: value });
        ctx.logger.debug(`配置项 ${key} 已更新`);
    } catch (err) {
        ctx.logger.error(`更新配置项 ${key} 失败:`, err);
    }
};

function registerWebUI(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.static('/static', 'webui');

    router.page({
        path: 'dashboard',
        title: 'RSS 订阅',
        htmlFile: 'webui/index.html',
        description: 'RSS 订阅推送管理',
    });

    ctx.logger.debug('WebUI 路由注册完成');
}
