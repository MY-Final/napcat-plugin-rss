/** WebUI 前端类型定义 */

export type SendMode = 'single' | 'forward' | 'puppeteer';

export interface FeedConfig {
    id: string;
    url: string;
    name: string;
    enabled: boolean;
    updateInterval: number;
    sendMode: SendMode;
    groups: string[];
    customHtmlTemplate?: string;
    lastPublishTime?: number;
    lastUpdateTime?: number;
    errorCount?: number;
    isRunning?: boolean;
}

export interface PluginStatus {
    pluginName: string
    uptime: number
    uptimeFormatted: string
    config: PluginConfig
    stats: {
        processed: number
        todayProcessed: number
        lastUpdateDay: string
    }
}

export interface PluginConfig {
    enabled: boolean
    debug: boolean
    commandPrefix: string
    cooldownSeconds: number
    groupConfigs?: Record<string, GroupConfig>
    feeds: Record<string, FeedConfig>
    defaultSendMode: SendMode
    defaultUpdateInterval: number
    puppeteerEndpoint: string
}

export interface GroupConfig {
    enabled?: boolean
}

export interface GroupInfo {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
    enabled: boolean
    scheduleTime?: string | null
}

export interface ApiResponse<T = unknown> {
    code: number
    data?: T
    message?: string
}
