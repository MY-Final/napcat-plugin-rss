import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FeedConfig, SendMode, GroupInfo } from '../types'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'

interface FeedsPageProps {
    onRefresh: () => void
}

export default function FeedsPage({ onRefresh }: FeedsPageProps) {
    const [feeds, setFeeds] = useState<FeedConfig[]>([])
    const [groups, setGroups] = useState<GroupInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingFeed, setEditingFeed] = useState<FeedConfig | null>(null)

    const fetchFeeds = async () => {
        try {
            const res = await noAuthFetch<FeedConfig[]>('/feeds')
            if (res.code === 0) {
                setFeeds(res.data || [])
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchGroups = async () => {
        try {
            const res = await noAuthFetch<GroupInfo[]>('/groups')
            if (res.code === 0) {
                setGroups(res.data || [])
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        Promise.all([fetchFeeds(), fetchGroups()]).finally(() => setLoading(false))
    }, [])

    const handleAdd = () => {
        setEditingFeed(null)
        setShowModal(true)
    }

    const handleEdit = (feed: FeedConfig) => {
        setEditingFeed(feed)
        setShowModal(true)
    }

    const handleDelete = async (feed: FeedConfig) => {
        if (!confirm(`确定删除订阅 "${feed.name}" 吗？`)) return
        try {
            const res = await noAuthFetch(`/feeds/${feed.id}`, { method: 'DELETE' })
            if (res.code === 0) {
                showToast('删除成功', 'success')
                fetchFeeds()
                onRefresh()
            } else {
                showToast(res.message || '删除失败', 'error')
            }
        } catch (e) {
            showToast('删除失败', 'error')
        }
    }

    const handleToggle = async (feed: FeedConfig) => {
        try {
            const res = await noAuthFetch(`/feeds/${feed.id}`, {
                method: 'PUT',
                body: JSON.stringify({ enabled: !feed.enabled })
            })
            if (res.code === 0) {
                showToast(feed.enabled ? '已禁用' : '已启用', 'success')
                fetchFeeds()
            } else {
                showToast(res.message || '操作失败', 'error')
            }
        } catch (e) {
            showToast('操作失败', 'error')
        }
    }

    const handleCheck = async (feed: FeedConfig) => {
        try {
            const res = await noAuthFetch(`/feeds/${feed.id}/check`, { method: 'POST' })
            if (res.code === 0) {
                const count = (res.data as { count: number })?.count || 0
                showToast(`检查完成，发现 ${count} 条更新`, count > 0 ? 'success' : 'info')
            } else {
                showToast(res.message || '检查失败', 'error')
            }
        } catch (e) {
            showToast('检查失败', 'error')
        }
    }

    const handleSave = async (data: Partial<FeedConfig>) => {
        try {
            let res
            if (editingFeed) {
                res = await noAuthFetch(`/feeds/${editingFeed.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                })
            } else {
                res = await noAuthFetch('/feeds', {
                    method: 'POST',
                    body: JSON.stringify(data)
                })
            }
            if (res.code === 0) {
                showToast(editingFeed ? '更新成功' : '添加成功', 'success')
                setShowModal(false)
                fetchFeeds()
                onRefresh()
            } else {
                showToast(res.message || '操作失败', 'error')
            }
        } catch (e) {
            showToast('操作失败', 'error')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">RSS 订阅管理</h2>
                    <p className="text-sm text-gray-500">管理 RSS 订阅源和推送设置</p>
                </div>
                <button onClick={handleAdd} className="btn-primary">
                    + 添加订阅
                </button>
            </div>

            {feeds.length === 0 ? (
                <div className="card p-8 text-center">
                    <div className="text-gray-400 mb-4">暂无订阅</div>
                    <button onClick={handleAdd} className="btn-primary">
                        添加第一个订阅
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {feeds.map((feed) => (
                        <FeedCard
                            key={feed.id}
                            feed={feed}
                            groups={groups}
                            onEdit={() => handleEdit(feed)}
                            onDelete={() => handleDelete(feed)}
                            onToggle={() => handleToggle(feed)}
                            onCheck={() => handleCheck(feed)}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <FeedModal
                    feed={editingFeed}
                    groups={groups}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}

function FeedCard({
    feed,
    groups,
    onEdit,
    onDelete,
    onToggle,
    onCheck,
}: {
    feed: FeedConfig
    groups: GroupInfo[]
    onEdit: () => void
    onDelete: () => void
    onToggle: () => void
    onCheck: () => void
}) {
    const sendModeText: Record<SendMode, string> = {
        single: '单条消息',
        forward: '合并转发',
        puppeteer: '图片渲染',
    }

    const feedGroups = groups.filter((g) => feed.groups.includes(String(g.group_id)))

    return (
        <div className="card p-4 hover-lift">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${feed.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <span className="font-medium">{feed.name}</span>
                        {feed.isRunning && <span className="text-xs text-emerald-500">(运行中)</span>}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{feed.url}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>发送方式: {sendModeText[feed.sendMode]}</span>
                        <span>轮询间隔: {feed.updateInterval} 分钟</span>
                        <span>推送群: {feed.groups.length} 个</span>
                        {feed.errorCount && feed.errorCount > 0 && (
                            <span className="text-red-500">错误: {feed.errorCount} 次</span>
                        )}
                    </div>
                    {feedGroups.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {feedGroups.slice(0, 3).map((g) => (
                                <span key={g.group_id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                    {g.group_name}
                                </span>
                            ))}
                            {feedGroups.length > 3 && (
                                <span className="text-xs text-gray-400">+{feedGroups.length - 3} 更多</span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onCheck} className="btn-ghost btn text-xs px-2 py-1" title="检查更新">
                        检查
                    </button>
                    <button onClick={onToggle} className={`btn-ghost btn text-xs px-2 py-1 ${feed.enabled ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {feed.enabled ? '禁用' : '启用'}
                    </button>
                    <button onClick={onEdit} className="btn-ghost btn text-xs px-2 py-1">
                        编辑
                    </button>
                    <button onClick={onDelete} className="btn-ghost btn text-xs px-2 py-1 text-red-500">
                        删除
                    </button>
                </div>
            </div>
        </div>
    )
}

function FeedModal({
    feed,
    groups,
    onSave,
    onClose,
}: {
    feed: FeedConfig | null
    groups: GroupInfo[]
    onSave: (data: Partial<FeedConfig>) => void
    onClose: () => void
}) {
    const [url, setUrl] = useState(feed?.url || '')
    const [name, setName] = useState(feed?.name || '')
    const [enabled, setEnabled] = useState(feed?.enabled ?? true)
    const [updateInterval, setUpdateInterval] = useState(feed?.updateInterval || 30)
    const [sendMode, setSendMode] = useState<SendMode>(feed?.sendMode || 'forward')
    const [selectedGroups, setSelectedGroups] = useState<string[]>(feed?.groups || [])
    const [customHtml, setCustomHtml] = useState(feed?.customHtmlTemplate || '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return
        onSave({
            url,
            name: name || new URL(url).hostname,
            enabled,
            updateInterval,
            sendMode,
            groups: selectedGroups,
            customHtmlTemplate: customHtml || undefined,
        })
    }

    const toggleGroup = (groupId: string) => {
        setSelectedGroups((prev) =>
            prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
        )
    }

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-semibold">{feed ? '编辑订阅' : '添加订阅'}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">RSS 地址 *</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="input w-full"
                                    placeholder="https://example.com/feed.xml"
                                    required
                                    disabled={!!feed}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">显示名称</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full"
                                    placeholder="留空则自动提取"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">轮询间隔（分钟）</label>
                                    <input
                                        type="number"
                                        value={updateInterval}
                                        onChange={(e) => setUpdateInterval(Number(e.target.value))}
                                        className="input w-full"
                                        min={5}
                                        max={1440}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">发送方式</label>
                                    <select
                                        value={sendMode}
                                        onChange={(e) => setSendMode(e.target.value as SendMode)}
                                        className="input w-full"
                                    >
                                        <option value="forward">合并转发</option>
                                        <option value="single">单条消息</option>
                                        <option value="puppeteer">图片渲染</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">推送群组</label>
                                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                                    {groups.length === 0 ? (
                                        <div className="text-sm text-gray-400">暂无群组</div>
                                    ) : (
                                        groups.map((g) => (
                                            <label key={g.group_id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.includes(String(g.group_id))}
                                                    onChange={() => toggleGroup(String(g.group_id))}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">{g.group_name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                            {sendMode === 'puppeteer' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        自定义 HTML 模板
                                        <span className="text-gray-400 font-normal ml-2">(留空使用默认)</span>
                                    </label>
                                    <textarea
                                        value={customHtml}
                                        onChange={(e) => setCustomHtml(e.target.value)}
                                        className="input w-full font-mono text-xs"
                                        rows={8}
                                        placeholder={`<!DOCTYPE html>
<!-- 可用变量: {{title}}, {{link}}, {{description}}, {{author}}, {{pubDate}}, {{image}}, {{feedName}} -->
<body>{{title}}</body>`}
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="enabled-modal"
                                    checked={enabled}
                                    onChange={(e) => setEnabled(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="enabled-modal" className="text-sm">启用订阅</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={onClose} className="btn-ghost">
                                    取消
                                </button>
                                <button type="submit" className="btn-primary">
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
