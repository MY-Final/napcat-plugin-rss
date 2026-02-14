/**
 * HTTP 请求工具函数
 */

export async function fetchJson<T = unknown>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function fetchText(url: string, options: RequestInit = {}): Promise<string> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'text/html, application/xml, */*',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
}
