/**
 * HTML 模板模块
 * 提供内置模板和模板变量填充功能
 */

import type { TemplateVariables, FeedItem, FeedConfig } from '../../types';
import { pluginState } from '../../core/state';
import { getItemSummary } from '../message/utils';

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        :root {
            --bg: #f5f1ea;
            --card: #fffdf8;
            --text-main: #1f1a17;
            --text-muted: #6f6258;
            --line: #e7ddd0;
            --accent: #a54a2a;
            --accent-soft: #f3e1d8;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            padding: 32px;
            background:
                radial-gradient(circle at top left, rgba(165, 74, 42, 0.08), transparent 34%),
                linear-gradient(180deg, #f8f4ee 0%, #f2ece4 100%);
            color: var(--text-main);
            font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
        }

        .card {
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            background: var(--card);
            border: 1px solid var(--line);
            box-shadow: 0 24px 60px rgba(39, 24, 13, 0.08);
            overflow: hidden;
        }

        .banner {
            padding: 26px 30px 20px;
            background: linear-gradient(135deg, #fff8f2 0%, #f6ebe1 100%);
            border-bottom: 1px solid var(--line);
        }

        .feed-name {
            display: inline-block;
            padding: 6px 10px;
            font-size: 12px;
            letter-spacing: 0.08em;
            color: var(--accent);
            background: var(--accent-soft);
            border-radius: 999px;
        }

        .title {
            margin: 14px 0 0;
            font-size: 30px;
            line-height: 1.25;
            font-weight: 700;
        }

        .meta {
            margin-top: 10px;
            font-size: 13px;
            color: var(--text-muted);
        }

        .content {
            padding: 28px 30px 30px;
        }

        .image-wrap {
            margin-bottom: 22px;
            border: 1px solid var(--line);
            background: #efe5da;
        }

        .image-wrap img {
            display: block;
            width: 100%;
            max-height: 320px;
            object-fit: cover;
        }

        .summary {
            margin: 0;
            font-size: 15px;
            line-height: 1.8;
            color: var(--text-main);
            white-space: pre-wrap;
        }

        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed var(--line);
            font-size: 12px;
            color: var(--text-muted);
            word-break: break-all;
        }

        .footer strong {
            color: var(--text-main);
        }
    </style>
</head>
<body>
    <article class="card">
        <header class="banner">
            <div class="feed-name">{{feedName}}</div>
            <h1 class="title">{{title}}</h1>
            {{#if metaLine}}<div class="meta">{{metaLine}}</div>{{/if}}
        </header>
        <section class="content">
            {{#if image}}
            <div class="image-wrap">
                <img src="{{image}}" alt="cover" loading="eager" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'">
            </div>
            {{/if}}
            {{#if description}}
            <p class="summary">{{description}}</p>
            {{/if}}
            {{#unless description}}
            <p class="summary">点击下方链接查看完整内容。</p>
            {{/unless}}
            <div class="footer">
                <strong>链接</strong><br>
                {{link}}
            </div>
        </section>
    </article>
</body>
</html>`;

export function buildVariables(feed: FeedConfig, item: FeedItem): TemplateVariables {
    const formattedDate = formatDate(item.pubDate);
    const metaLine = [item.author || '', formattedDate].filter(Boolean).join(' · ');

    return {
        feedName: feed.name,
        feedUrl: feed.url,
        title: item.title,
        link: item.link,
        description: getItemSummary(item, 420),
        content: getItemSummary(item, 800),
        author: item.author || '',
        pubDate: formattedDate,
        metaLine,
        image: item.image || '',
        timestamp: item.pubDate,
    };
}

function formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes <= 1 ? '刚刚' : `${minutes} 分钟前`;
        }
        return `${hours} 小时前`;
    }
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;

    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function renderTemplate(template: string, vars: TemplateVariables): string {
    let result = template;

    result = result.replace(/{{\s*#if\s+(\w+)\s*}}([\s\S]*?){{\s*\/if\s*}}/g, (_, varName, content) => {
        const val = vars[varName as keyof TemplateVariables];
        return val ? content : '';
    });

    result = result.replace(/{{\s*#unless\s+(\w+)\s*}}([\s\S]*?){{\s*\/unless\s*}}/g, (_, varName, content) => {
        const val = vars[varName as keyof TemplateVariables];
        return !val ? content : '';
    });

    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, escapeHtml(String(value)));
    }

    return result;
}

function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function applyTemplate(feed: FeedConfig, item: FeedItem): string {
    const template = pickTemplate(feed);
    const vars = buildVariables(feed, item);
    return renderTemplate(template, vars);
}

function pickTemplate(feed: FeedConfig): string {
    const customTemplate = feed.customHtmlTemplate?.trim();
    if (!customTemplate) {
        return DEFAULT_TEMPLATE;
    }

    const lowerTemplate = customTemplate.toLowerCase();
    const hasRemoteScript = lowerTemplate.includes('<script') || lowerTemplate.includes('tailwindcss.com');
    const hasRemoteFont = lowerTemplate.includes('fonts.googleapis.com') || lowerTemplate.includes('fonts.gstatic.com');

    if (hasRemoteScript || hasRemoteFont) {
        pluginState.logger.warn(`检测到不稳定的自定义图片模板，已回退到内置模板: ${feed.name}`);
        return DEFAULT_TEMPLATE;
    }

    return customTemplate;
}
