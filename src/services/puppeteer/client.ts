/**
 * Puppeteer 服务客户端
 * 调用 napcat-plugin-puppeteer 进行截图渲染
 */

import type { ScreenshotOptions, ScreenshotResponse } from '../../types';
import { pluginState } from '../../core/state';

export class PuppeteerClient {
    private endpoint: string;

    constructor(endpoint?: string) {
        this.endpoint = endpoint || pluginState.config.puppeteerEndpoint || 'http://127.0.0.1:3000';
    }

    setEndpoint(endpoint: string): void {
        this.endpoint = endpoint;
    }

    async screenshot(options: ScreenshotOptions): Promise<string> {
        const url = `${this.endpoint}/plugin/napcat-plugin-puppeteer/api/screenshot`;
        
        pluginState.logger.debug(`Puppeteer screenshot: ${options.file.slice(0, 100)}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) {
            throw new Error(`Puppeteer HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ScreenshotResponse = await response.json();

        if (result.code !== 0) {
            throw new Error(result.message || 'Puppeteer 渲染失败');
        }

        if (!result.data) {
            throw new Error('Puppeteer 返回数据为空');
        }

        return result.data;
    }

    async renderHtml(
        html: string,
        options: Partial<ScreenshotOptions> = {}
    ): Promise<string> {
        return this.screenshot({
            file: html,
            file_type: 'htmlString',
            type: 'png',
            fullPage: false,
            ...options,
        });
    }

    async checkStatus(): Promise<boolean> {
        try {
            const url = `${this.endpoint}/plugin/napcat-plugin-puppeteer/api/status`;
            const response = await fetch(url, {
                method: 'GET',
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const puppeteerClient = new PuppeteerClient();
