import { useState, useEffect } from 'react'
import type { PluginStatus } from '../types'
import { IconPower, IconClock, IconActivity, IconDownload, IconRefresh, IconTerminal } from '../components/icons'

interface StatusPageProps {
    status: PluginStatus | null
    onRefresh: () => void
}

interface ExtendedStatus extends PluginStatus {
    feeds?: {
        total: number
        enabled: number
        running: number
    }
    puppeteer?: {
        status: string
        error: string
        endpoint: string
    }
}

/** 将毫秒格式化为可读时长 */
function formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000)
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分 ${secs}秒`
    if (hours > 0) return `${hours}小时 ${minutes}分 ${secs}秒`
    if (minutes > 0) return `${minutes}分 ${secs}秒`
    return `${secs}秒`
}

export default function StatusPage({ status, onRefresh }: StatusPageProps) {
    const [displayUptime, setDisplayUptime] = useState<string>('-')
    const [syncInfo, setSyncInfo] = useState<{ baseUptime: number; syncTime: number } | null>(null)
    const extStatus = status as ExtendedStatus | null

    useEffect(() => {
        if (status?.uptime !== undefined && status.uptime > 0) {
            setSyncInfo({ baseUptime: status.uptime, syncTime: Date.now() })
        }
    }, [status?.uptime])

    useEffect(() => {
        if (!syncInfo) { setDisplayUptime('-'); return }
        const updateUptime = () => {
            const elapsed = Date.now() - syncInfo.syncTime
            setDisplayUptime(formatUptime(syncInfo.baseUptime + elapsed))
        }
        updateUptime()
        const interval = setInterval(updateUptime, 1000)
        return () => clearInterval(interval)
    }, [syncInfo])

    if (!status) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">正在获取插件状态...</div>
                </div>
            </div>
        )
    }

    const { config, stats } = status

    const statCards = [
        {
            label: '插件状态',
            value: config.enabled ? '运行中' : '已停用',
            icon: <IconPower size={18} />,
            color: config.enabled ? 'text-emerald-500' : 'text-red-400',
            bg: config.enabled ? 'bg-emerald-500/10' : 'bg-red-500/10',
        },
        {
            label: '运行时长',
            value: displayUptime,
            icon: <IconClock size={18} />,
            color: 'text-primary',
            bg: 'bg-primary/10',
        },
        {
            label: '订阅总数',
            value: String(extStatus?.feeds?.total || Object.keys(config.feeds || {}).length),
            icon: <IconActivity size={18} />,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
        },
        {
            label: '今日推送',
            value: String(stats.todayProcessed),
            icon: <IconDownload size={18} />,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
        },
    ]

    return (
        <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                {statCards.map((card) => (
                    <div key={card.label} className="card p-4 hover-lift">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-400 font-medium">{card.label}</span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg} ${card.color} transition-transform duration-300 hover:scale-110`}>
                                {card.icon}
                            </div>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                ))}
            </div>

            {/* 运行状态和Puppeteer状态 */}
            <div className="space-y-4">

                {/* 订阅状态 */}
                {extStatus?.feeds && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-500">{extStatus.feeds.enabled}</div>
                            <div className="text-xs text-gray-500 mt-1">已启用</div>
                        </div>
                        <div className="card p-4 text-center">
                            <div className="text-2xl font-bold text-blue-500">{extStatus.feeds.running}</div>
                            <div className="text-xs text-gray-500 mt-1">运行中</div>
                        </div>
                    </div>
                )}

                {/* Puppeteer 状态 */}
                {extStatus?.puppeteer && (
                    <div className={`card p-5 border-l-4 ${
                        extStatus.puppeteer.status === 'connected' 
                            ? 'border-l-emerald-500' 
                            : 'border-l-red-500'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                    extStatus.puppeteer.status === 'connected' 
                                        ? 'bg-emerald-500 animate-pulse' 
                                        : 'bg-red-500'
                                }`}></div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        Puppeteer 服务
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {extStatus.puppeteer.status === 'connected' ? '已连接' : '未连接'}
                                        <span className="mx-1">•</span>
                                        {extStatus.puppeteer.endpoint}
                                    </div>
                                </div>
                            </div>
                            {extStatus.puppeteer.status !== 'connected' && extStatus.puppeteer.error && (
                                <span className="text-xs text-red-500">{extStatus.puppeteer.error}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>
        </div>
    )
}
