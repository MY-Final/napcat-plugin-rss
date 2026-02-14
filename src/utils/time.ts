/**
 * 时间格式化工具函数
 */

export function formatDate(timestamp: number, format: 'full' | 'date' | 'time' | 'relative' = 'full'): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    switch (format) {
        case 'date':
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        case 'time':
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
            });
        case 'relative':
            return formatRelativeTime(timestamp);
        default:
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
    }
}

export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    
    return formatDate(timestamp, 'date');
}

export function parseDate(dateStr: string): number | null {
    if (!dateStr) return null;
    
    try {
        const date = new Date(dateStr);
        const timestamp = date.getTime();
        return isNaN(timestamp) ? null : timestamp;
    } catch {
        return null;
    }
}

export function getDayStart(timestamp: number = Date.now()): number {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export function getDayEnd(timestamp: number = Date.now()): number {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
}
