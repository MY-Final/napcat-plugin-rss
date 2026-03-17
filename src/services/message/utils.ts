import type { FeedItem } from '../../types';

export function stripHtml(input?: string): string {
    if (!input) {
        return '';
    }

    return input
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&#039;/gi, "'")
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

export function truncateText(input: string, maxLength: number): string {
    if (input.length <= maxLength) {
        return input;
    }

    return input.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

export function getItemSummary(item: FeedItem, maxLength: number): string {
    const summary = stripHtml(item.description || item.content || '');
    return truncateText(summary, maxLength);
}

export function formatItemTime(timestamp?: number): string {
    if (!timestamp) {
        return '';
    }

    return new Date(timestamp).toLocaleString('zh-CN');
}
