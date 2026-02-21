/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 */

import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';

// ==================== 插件配置 ====================

export type SendMode = 'single' | 'forward' | 'puppeteer';

export interface FeedConfig {
    id: string;
    url: string;
    name: string;
    categoryId?: string;
    enabled: boolean;
    updateInterval: number;
    sendMode: SendMode;
    groups: string[];
    customHtmlTemplate?: string;
    customForwardTemplate?: string;
    lastPublishTime?: number;
    lastUpdateTime?: number;
    errorCount?: number;
}

export interface Category {
    id: string;
    name: string;
    color?: string;
    createdAt: number;
}

export interface FeedItem {
    title: string;
    link: string;
    description?: string;
    pubDate: number;
    author?: string;
    image?: string;
    content?: string;
}

export interface ParsedFeed {
    title: string;
    link: string;
    description?: string;
    items: FeedItem[];
}

export interface PluginConfig {
    enabled: boolean;
    debug: boolean;
    commandPrefix: string;
    cooldownSeconds: number;
    groupConfigs: Record<string, GroupConfig>;
    feeds: Record<string, FeedConfig>;
    categories: Record<string, Category>;
    defaultSendMode: SendMode;
    defaultUpdateInterval: number;
    puppeteerEndpoint: string;
}

export interface GroupConfig {
    enabled?: boolean;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}

// ==================== 消息相关类型 ====================

export interface ForwardNode {
    type: 'node';
    data: {
        nickname: string;
        user_id?: string;
        content: Array<{ type: string; data: Record<string, unknown> }>;
    };
}

// ==================== Puppeteer 相关类型 ====================

export interface ScreenshotOptions {
    file: string;
    file_type?: 'auto' | 'htmlString';
    data?: Record<string, unknown>;
    selector?: string;
    encoding?: 'base64' | 'binary';
    type?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    fullPage?: boolean;
    omitBackground?: boolean;
    multiPage?: boolean | number;
    setViewport?: { width: number; height: number; deviceScaleFactor?: number };
    pageGotoParams?: { waitUntil?: string; timeout?: number };
    waitForSelector?: string;
    waitForTimeout?: number;
    headers?: Record<string, string>;
}

export interface ScreenshotResponse {
    code: number;
    data?: string;
    message?: string;
    time?: number;
}

export interface TemplateVariables {
    feedName: string;
    feedUrl: string;
    title: string;
    link: string;
    description: string;
    content: string;
    author: string;
    pubDate: string;
    image: string;
    timestamp: number;
}

// ==================== 工具类型 ====================

export type { OB11Message, OB11PostSendMsg, NapCatPluginContext, PluginLogger };
