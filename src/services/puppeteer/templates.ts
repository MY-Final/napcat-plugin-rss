/**
 * HTML 模板模块
 * 提供内置模板和模板变量填充功能
 */

import type { TemplateVariables, FeedItem, FeedConfig } from '../../types';

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .card {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }
        .cover {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .content {
            padding: 24px;
        }
        .feed-name {
            font-size: 12px;
            color: #667eea;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .title {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a2e;
            line-height: 1.4;
            margin-bottom: 12px;
        }
        .description {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }
        .author {
            font-size: 12px;
            color: #999;
        }
        .date {
            font-size: 12px;
            color: #999;
        }
        .link-hint {
            font-size: 11px;
            color: #667eea;
            text-align: center;
            padding: 12px;
            background: #f8f9ff;
        }
    </style>
</head>
<body>
    <div class="card">
        {{#if image}}
        <img class="cover" src="{{image}}" alt="cover" onerror="this.style.display='none'">
        {{/if}}
        <div class="content">
            <div class="feed-name">{{feedName}}</div>
            <div class="title">{{title}}</div>
            {{#if description}}
            <div class="description">{{description}}</div>
            {{/if}}
            <div class="meta">
                {{#if author}}
                <span class="author">{{author}}</span>
                {{/if}}
                <span class="date">{{pubDate}}</span>
            </div>
        </div>
        <div class="link-hint">点击查看全文: {{link}}</div>
    </div>
</body>
</html>`;

export function buildVariables(feed: FeedConfig, item: FeedItem): TemplateVariables {
    return {
        feedName: feed.name,
        feedUrl: feed.url,
        title: item.title,
        link: item.link,
        description: item.description || '',
        content: item.content || '',
        author: item.author || '',
        pubDate: formatDate(item.pubDate),
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
    
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, escapeHtml(String(value)));
    }
    
    result = result.replace(/{{\s*#if\s+(\w+)\s*}}(.*?){{\s*\/if\s*}}/gs, (_, varName, content) => {
        const val = vars[varName as keyof TemplateVariables];
        return val ? content : '';
    });
    
    result = result.replace(/{{\s*#unless\s+(\w+)\s*}}(.*?){{\s*\/unless\s*}}/gs, (_, varName, content) => {
        const val = vars[varName as keyof TemplateVariables];
        return !val ? content : '';
    });
    
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
    const template = feed.customHtmlTemplate || DEFAULT_TEMPLATE;
    const vars = buildVariables(feed, item);
    return renderTemplate(template, vars);
}
