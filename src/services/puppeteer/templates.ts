/**
 * HTML 模板模块
 * 提供内置模板和模板变量填充功能
 */

import type { TemplateVariables, FeedItem, FeedConfig } from '../../types';

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&family=Plus+Jakarta+Sans:wght@300;400;600&display=swap');

        :root {
            --accent: #000000;
            --bg: #ffffff;
            --text-main: #1a1a1a;
            --text-muted: #666666;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background-color: #f8f8f8;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
        }

        .magazine-card {
            width: 100%;
            max-width: 640px;
            background: var(--bg);
            padding: 40px;
            position: relative;
            box-shadow: 0 30px 60px -12px rgba(0,0,0,0.08);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            color: var(--text-main);
            border: 1px solid rgba(0,0,0,0.03);
        }

        .magazine-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 40px 80px -15px rgba(0,0,0,0.12);
        }

        /* 顶部装饰线 */
        .magazine-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: var(--accent);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .magazine-card:hover::before {
            transform: scaleX(1);
        }

        .header-meta {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 32px;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 12px;
        }

        .feed-source {
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--accent);
        }

        .pub-date {
            font-size: 12px;
            color: var(--text-muted);
            font-variant-numeric: tabular-nums;
        }

        .main-layout {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
        }

        @media (min-width: 500px) {
            .main-layout.has-image {
                grid-template-columns: 1fr 180px;
            }
        }

        .title {
            font-family: 'Plus Jakarta Sans', 'Noto Serif SC', serif;
            font-size: 28px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
            transition: color 0.3s ease;
        }

        .magazine-card:hover .title {
            color: #444;
        }

        .summary {
            font-size: 15px;
            line-height: 1.7;
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        .image-wrapper {
            width: 100%;
            height: 180px;
            background: #f0f0f0;
            overflow: hidden;
            position: relative;
        }

        .image-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(20%);
            transition: all 0.6s ease;
        }

        .magazine-card:hover .image-wrapper img {
            filter: grayscale(0%);
            transform: scale(1.08);
        }

        .footer-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 8px;
        }

        .author-tag {
            font-size: 13px;
            font-weight: 600;
            padding-right: 12px;
            border-right: 1px solid #ddd;
        }

        .read-time {
            font-size: 12px;
            color: var(--text-muted);
            font-style: italic;
        }

        .arrow-link {
            position: absolute;
            bottom: 40px;
            right: 40px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #eee;
            border-radius: 50%;
            transition: all 0.3s ease;
        }

        .magazine-card:hover .arrow-link {
            background: var(--accent);
            border-color: var(--accent);
            color: white;
            transform: rotate(-45deg);
        }
    </style>
</head>
<body>

    <a href="{{link}}" class="magazine-card">
        <div class="header-meta">
            <span class="feed-source">{{feedName}}</span>
            <span class="pub-date">{{pubDate}}</span>
        </div>

        <div class="main-layout {{#if image}}has-image{{/if}}">
            <div class="text-content">
                <h1 class="title">{{title}}</h1>
                {{#if description}}
                <p class="summary">{{description}}</p>
                {{/if}}
                
                <div class="footer-info">
                    {{#if author}}
                    <span class="author-tag">{{author}}</span>
                    {{/if}}
                    <span class="read-time">Featured Content</span>
                </div>
            </div>

            {{#if image}}
            <div class="image-wrapper">
                <img src="{{image}}" alt="article cover" onerror="this.parentElement.style.display='none'">
            </div>
            {{/if}}
        </div>

        <div class="arrow-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </div>
    </a>

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
