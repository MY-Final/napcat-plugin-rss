import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FeedConfig, SendMode, GroupInfo, Category } from '../types'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'

interface FeedsPageProps {
    onRefresh: () => void
}

export default function FeedsPage({ onRefresh }: FeedsPageProps) {
    const [feeds, setFeeds] = useState<FeedConfig[]>([])
    const [groups, setGroups] = useState<GroupInfo[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDetail, setShowDetail] = useState(false)
    const [editingFeed, setEditingFeed] = useState<FeedConfig | null>(null)
    const [detailFeed, setDetailFeed] = useState<FeedConfig | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<FeedConfig | null>(null)
    const [tagFilter, setTagFilter] = useState<string>('')

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

    const fetchCategories = async () => {
        try {
            const res = await noAuthFetch<Category[]>('/categories')
            if (res.code === 0) {
                setCategories(res.data || [])
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        Promise.all([fetchFeeds(), fetchGroups(), fetchCategories()]).finally(() => setLoading(false))
    }, [])

    const handleAdd = () => {
        setEditingFeed(null)
        setShowModal(true)
    }

    const handleEdit = (feed: FeedConfig) => {
        setEditingFeed(feed)
        setShowDetail(false)
        setShowModal(true)
    }

    const handleViewDetail = (feed: FeedConfig) => {
        setDetailFeed(feed)
        setShowDetail(true)
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return
        try {
            const res = await noAuthFetch(`/feeds/${deleteConfirm.id}`, { method: 'DELETE' })
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
        setDeleteConfirm(null)
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
                showToast(`检查完成，发现 ${count} 条可推送更新，未执行推送`, count > 0 ? 'success' : 'info')
            } else {
                showToast(res.message || '检查失败', 'error')
            }
} catch (e) {
            showToast('检查失败', 'error')
        }
    }

    const filteredFeeds = tagFilter
        ? feeds.filter(f => f.categoryId === tagFilter)
        : feeds

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
                <button onClick={handleAdd} className="btn-primary rounded-full px-5">
                    + 添加订阅
                </button>
            </div>

            {feeds.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div className="text-gray-400 mb-4">暂无订阅</div>
                    <button onClick={handleAdd} className="btn-primary rounded-full px-6">
                        添加第一个订阅
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4 gap-4">
                        <div className="flex items-center gap-3">
                            {categories.length > 0 && (
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">全部分组</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="card overflow-hidden rounded-xl">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">订阅名称</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">发送方式</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">推送群</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">轮询间隔</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredFeeds.map((feed) => {
                                    const isUnhealthy = (feed.errorCount || 0) > 0
                                    const statusClass = !feed.enabled
                                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                        : isUnhealthy
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    const statusText = !feed.enabled ? '已禁用' : isUnhealthy ? '异常' : '运行中'

                                    return (
                                        <tr
                                            key={feed.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                                            onClick={() => handleViewDetail(feed)}
                                        >
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{feed.name}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[200px]">{feed.url}</div>
                                                {isUnhealthy && feed.lastError && (
                                                    <div className="text-xs text-red-500 mt-1 truncate max-w-[240px]" title={feed.lastError}>
                                                        最近错误: {feed.lastError}
                                                    </div>
                                                )}
                                                {!isUnhealthy && feed.lastSuccessTime && (
                                                    <div className="text-xs text-emerald-500 mt-1">
                                                        最近成功: {new Date(feed.lastSuccessTime).toLocaleString('zh-CN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    {feed.sendMode === 'forward' ? '📋 合并转发' : feed.sendMode === 'single' ? '📝 单条消息' : '🖼️ 图片渲染'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{feed.groups.length} 个群</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    {feed.updateInterval} 分钟
                                                </span>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleCheck(feed)}
                                                        className="p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                                        title="检查更新"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggle(feed)}
                                                        className={`p-1.5 rounded-full transition-colors ${
                                                            feed.enabled
                                                                ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500'
                                                                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500'
                                                        }`}
                                                        title={feed.enabled ? '禁用' : '启用'}
                                                    >
                                                        {feed.enabled ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(feed)}
                                                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                                                        title="编辑"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(feed)}
                                                        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors"
                                                        title="删除"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {showDetail && detailFeed && (
                <FeedDetailModal
                    feed={detailFeed}
                    groups={groups}
                    categories={categories}
                    onClose={() => setShowDetail(false)}
                    onEdit={() => handleEdit(detailFeed)}
                />
            )}

            {showModal && (
                <FeedModal
                    feed={editingFeed}
                    groups={groups}
                    categories={categories}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}

            {deleteConfirm && (
                <ConfirmModal
                    title="删除订阅"
                    message={`确定要删除订阅 "${deleteConfirm.name}" 吗？此操作不可恢复。`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </div>
    )
}

function FeedDetailModal({
    feed,
    groups,
    categories,
    onClose,
    onEdit,
}: {
    feed: FeedConfig
    groups: GroupInfo[]
    categories: Category[]
    onClose: () => void
    onEdit: () => void
}) {
    const sendModeText: Record<SendMode, { text: string; icon: string; color: string }> = {
        single: { text: '单条消息', icon: '📝', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        forward: { text: '合并转发', icon: '📋', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        puppeteer: { text: '图片渲染', icon: '🖼️', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
    }

    const feedGroups = groups.filter((g) => feed.groups.includes(String(g.group_id)))
    const feedCategory = categories.find(c => c.id === feed.categoryId)

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${feed.enabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center`}>
                            <span className={`text-lg ${feed.enabled ? 'text-emerald-500' : 'text-gray-400'}`}>📡</span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{feed.name}</h3>
                            <p className={`text-xs ${feed.enabled ? 'text-emerald-500' : 'text-gray-400'}`}>
                                {feed.enabled ? '运行中' : '已禁用'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                        <label className="text-xs text-gray-400 uppercase font-medium">RSS 地址</label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-all">{feed.url}</p>
                    </div>

                    {feedCategory && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <label className="text-xs text-gray-400 uppercase font-medium">分类</label>
                            <div className="mt-2 flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: feedCategory.color || '#667eea' }}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{feedCategory.name}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <label className="text-xs text-gray-400 uppercase font-medium">发送方式</label>
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sendModeText[feed.sendMode].color}`}>
                                    {sendModeText[feed.sendMode].icon} {sendModeText[feed.sendMode].text}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <label className="text-xs text-gray-400 uppercase font-medium">轮询间隔</label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {feed.updateInterval} 分钟
                                    </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                        <label className="text-xs text-gray-400 uppercase font-medium">推送群组 ({feed.groups.length})</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {feedGroups.length > 0 ? feedGroups.map((g) => (
                                <span key={g.group_id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500">
                                    👥 {g.group_name}
                                </span>
                            )) : (
                                <span className="text-sm text-gray-400">未配置推送群组</span>
                            )}
                        </div>
                    </div>

                    {feed.lastUpdateTime && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <label className="text-xs text-gray-400 uppercase font-medium">最后更新</label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {new Date(feed.lastUpdateTime).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    )}

                    {feed.lastCheckTime && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <label className="text-xs text-gray-400 uppercase font-medium">最近检查</label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {new Date(feed.lastCheckTime).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    )}

                    {feed.lastSuccessTime && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                            <label className="text-xs text-emerald-500 uppercase font-medium">最近成功</label>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                                {new Date(feed.lastSuccessTime).toLocaleString('zh-CN')}
                            </p>
                        </div>
                    )}

                    {feed.lastPushTime && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                            <label className="text-xs text-blue-500 uppercase font-medium">最近推送</label>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                {new Date(feed.lastPushTime).toLocaleString('zh-CN')}
                                {feed.lastPushCount ? ` · ${feed.lastPushCount} 条` : ''}
                            </p>
                        </div>
                    )}

                    {feed.errorCount && feed.errorCount > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                            <label className="text-xs text-red-400 uppercase font-medium">错误次数</label>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{feed.errorCount} 次</p>
                            {feed.lastError && (
                                <p className="text-xs text-red-500 dark:text-red-300 mt-2 break-all">{feed.lastError}</p>
                            )}
                        </div>
                    )}

                    {((feed.keywordWhitelist && feed.keywordWhitelist.length > 0) || (feed.keywordBlacklist && feed.keywordBlacklist.length > 0)) && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 md:col-span-2">
                            <label className="text-xs text-purple-500 uppercase font-medium">关键词过滤</label>
                            {feed.keywordWhitelist && feed.keywordWhitelist.length > 0 && (
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                                    白名单（{feed.keywordMatchMode === 'all' ? '全部命中' : '任意命中'}）: {feed.keywordWhitelist.join(' / ')}
                                </p>
                            )}
                            {feed.keywordBlacklist && feed.keywordBlacklist.length > 0 && (
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                                    黑名单: {feed.keywordBlacklist.join(' / ')}
                                </p>
                            )}
                        </div>
                    )}

                    {(feed.quietHoursEnabled || (feed.batchWindowMinutes || 0) > 0 || (feed.pendingItems && feed.pendingItems.length > 0)) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 md:col-span-2">
                            <label className="text-xs text-blue-500 uppercase font-medium">通知节奏控制</label>
                            {feed.quietHoursEnabled && (
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                                    静默时段: {feed.quietHoursStart || '--:--'} - {feed.quietHoursEnd || '--:--'}
                                </p>
                            )}
                            {(feed.batchWindowMinutes || 0) > 0 && (
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                                    合并窗口: {feed.batchWindowMinutes} 分钟
                                </p>
                            )}
                            {feed.pendingItems && feed.pendingItems.length > 0 && (
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                                    当前缓存: {feed.pendingItems.length} 条{feed.pendingSince ? `，起始于 ${new Date(feed.pendingSince).toLocaleString('zh-CN')}` : ''}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost rounded-full px-5">
                        关闭
                    </button>
                    <button onClick={onEdit} className="btn-primary rounded-full px-5">
                        编辑
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

function FeedModal({
    feed,
    groups,
    categories,
    onSave,
    onClose,
}: {
    feed: FeedConfig | null
    groups: GroupInfo[]
    categories: Category[]
    onSave: (data: Partial<FeedConfig>) => void
    onClose: () => void
}) {
    const [url, setUrl] = useState(feed?.url || '')
    const [name, setName] = useState(feed?.name || '')
    const [categoryId, setCategoryId] = useState(feed?.categoryId || '')
    const [enabled, setEnabled] = useState(feed?.enabled ?? true)
    const [updateInterval, setUpdateInterval] = useState(feed?.updateInterval || 30)
    const [sendMode, setSendMode] = useState<SendMode>(feed?.sendMode || 'forward')
    const [selectedGroups, setSelectedGroups] = useState<string[]>(feed?.groups || [])
    const [groupSearch, setGroupSearch] = useState('')
    const [customHtml, setCustomHtml] = useState(feed?.customHtmlTemplate || '')
    const [customForward, setCustomForward] = useState(feed?.customForwardTemplate || '')
    const [keywordWhitelist, setKeywordWhitelist] = useState((feed?.keywordWhitelist || []).join('\n'))
    const [keywordBlacklist, setKeywordBlacklist] = useState((feed?.keywordBlacklist || []).join('\n'))
    const [keywordMatchMode, setKeywordMatchMode] = useState<'any' | 'all'>(feed?.keywordMatchMode || 'any')
    const [quietHoursEnabled, setQuietHoursEnabled] = useState(feed?.quietHoursEnabled ?? false)
    const [quietHoursStart, setQuietHoursStart] = useState(feed?.quietHoursStart || '23:00')
    const [quietHoursEnd, setQuietHoursEnd] = useState(feed?.quietHoursEnd || '08:00')
    const [batchWindowMinutes, setBatchWindowMinutes] = useState(feed?.batchWindowMinutes || 0)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const parseKeywords = (value: string) => value
        .split(/\r?\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean)

    const autoName = url.startsWith('http') ? new URL(url).hostname : ''

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return
        onSave({
            url,
            name: name || autoName,
            categoryId: categoryId || undefined,
            enabled,
            updateInterval,
            sendMode,
            groups: selectedGroups,
            customHtmlTemplate: customHtml || undefined,
            customForwardTemplate: customForward || undefined,
            keywordWhitelist: parseKeywords(keywordWhitelist).length > 0 ? parseKeywords(keywordWhitelist) : undefined,
            keywordBlacklist: parseKeywords(keywordBlacklist).length > 0 ? parseKeywords(keywordBlacklist) : undefined,
            keywordMatchMode,
            quietHoursEnabled,
            quietHoursStart: quietHoursEnabled ? quietHoursStart : undefined,
            quietHoursEnd: quietHoursEnabled ? quietHoursEnd : undefined,
            batchWindowMinutes: Math.max(0, batchWindowMinutes),
        })
    }

    const handleTest = async () => {
        if (!url) return
        setTesting(true)
        setTestResult(null)
        try {
            const res = await noAuthFetch<{ title: string; itemCount: number }>('/feeds/validate', {
                method: 'POST',
                body: JSON.stringify({
                    url,
                    name: 'test',
                    keywordWhitelist: parseKeywords(keywordWhitelist),
                    keywordBlacklist: parseKeywords(keywordBlacklist),
                    keywordMatchMode,
                })
            })
            if (res.code === 0) {
                const itemCount = res.data?.itemCount ?? 0
                setTestResult({ success: true, message: `RSS 源连接成功，读取到 ${itemCount} 条预览内容` })
            } else {
                setTestResult({ success: false, message: res.message || '连接失败' })
            }
        } catch (e: any) {
            setTestResult({ success: false, message: e.message || '连接失败' })
        }
        setTesting(false)
    }

    const toggleGroup = (groupId: string) => {
        setSelectedGroups((prev) =>
            prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
        )
    }

    const selectAllGroups = () => {
        setSelectedGroups(groups.map((g) => String(g.group_id)))
    }

    const clearAllGroups = () => {
        setSelectedGroups([])
    }

    const togglePuppeteer = (enablePuppeteer: boolean) => {
        setSendMode(enablePuppeteer ? 'puppeteer' : 'forward')
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                            {feed ? '✏️' : '➕'}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{feed ? '编辑订阅' : '添加订阅'}</h3>
                            <p className="text-xs text-gray-400">{feed ? '修改订阅配置' : '创建新的 RSS 订阅'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RSS 地址 <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="https://example.com/feed.xml"
required
                            />
                            {!feed && (
                                <button
                                    type="button"
                                    onClick={handleTest}
                                    disabled={!url || testing}
                                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                >
                                    {testing ? '测试中...' : '测试连接'}
                                </button>
                            )}
                        </div>
                        {testResult && (
                            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                {testResult.message}
                            </div>
                        )}
                        {autoName && !name && (
                            <p className="mt-1.5 text-xs text-gray-400">自动名称: {autoName}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">显示名称</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="留空则自动提取"
                        />
                    </div>

                    {categories.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分类</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            >
                                <option value="">未分类</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSendMode('forward')}
                            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                                sendMode === 'forward'
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            📋 转发
                        </button>
                        <button
                            type="button"
                            onClick={() => setSendMode('single')}
                            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                                sendMode === 'single'
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            📝 消息
                        </button>
                        <button
                            type="button"
                            onClick={() => setSendMode('puppeteer')}
                            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                                sendMode === 'puppeteer'
                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            🖼️ 图片
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">轮询间隔</label>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                                <input
                                    type="number"
                                    value={updateInterval}
                                    onChange={(e) => setUpdateInterval(Math.max(1, Number(e.target.value) || 1))}
                                    className="w-16 bg-transparent text-center text-sm font-medium outline-none"
                                    min={1}
                                    max={1440}
                                />
                                <span className="bg-transparent text-xs text-gray-400">分钟</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <input
                                    type="range"
                                    value={updateInterval}
                                    onChange={(e) => setUpdateInterval(Number(e.target.value))}
                                    min={1}
                                    max={120}
                                    className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">白名单关键词</label>
                            <textarea
                                value={keywordWhitelist}
                                onChange={(e) => setKeywordWhitelist(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                                placeholder="每行一个关键词，命中后才推送"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">黑名单关键词</label>
                            <textarea
                                value={keywordBlacklist}
                                onChange={(e) => setKeywordBlacklist(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                                placeholder="每行一个关键词，命中后跳过推送"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">白名单匹配方式</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setKeywordMatchMode('any')}
                                className={`py-2 px-4 rounded-xl text-sm transition-colors ${
                                    keywordMatchMode === 'any'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                任意命中
                            </button>
                            <button
                                type="button"
                                onClick={() => setKeywordMatchMode('all')}
                                className={`py-2 px-4 rounded-xl text-sm transition-colors ${
                                    keywordMatchMode === 'all'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                全部命中
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">白名单留空表示不过滤；黑名单优先级高于白名单。</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">静默时段</label>
                                <input
                                    type="checkbox"
                                    checked={quietHoursEnabled}
                                    onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">开始</div>
                                    <input
                                        type="time"
                                        value={quietHoursStart}
                                        onChange={(e) => setQuietHoursStart(e.target.value)}
                                        disabled={!quietHoursEnabled}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">结束</div>
                                    <input
                                        type="time"
                                        value={quietHoursEnd}
                                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                                        disabled={!quietHoursEnabled}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400">静默时段内的更新会先缓存，时段结束后再补发。</p>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">合并窗口</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={batchWindowMinutes}
                                    onChange={(e) => setBatchWindowMinutes(Math.max(0, Number(e.target.value) || 0))}
                                    min={0}
                                    max={1440}
                                    className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                                />
                                <span className="text-sm text-gray-400">分钟</span>
                            </div>
                            <p className="text-xs text-gray-400">设置为 0 表示关闭。大于 0 时，窗口内的新内容会合并后统一推送。</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">推送群组</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={selectAllGroups} className="text-xs text-purple-500 hover:text-purple-600">全选</button>
                                <button type="button" onClick={clearAllGroups} className="text-xs text-gray-400 hover:text-gray-500">清空</button>
                            </div>
                        </div>
                        {groups.length > 5 && (
                            <div className="relative mb-2">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={groupSearch}
                                    onChange={(e) => setGroupSearch(e.target.value)}
                                    placeholder="搜索群组..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        )}
                        <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-3 space-y-2">
                            {groups.length === 0 ? (
                                <div className="text-sm text-gray-400 text-center py-4">暂无群组</div>
                            ) : (
                                groups
                                    .filter(g => !groupSearch || g.group_name.includes(groupSearch) || String(g.group_id).includes(groupSearch))
                                    .map((g) => (
                                        <label 
                                            key={g.group_id} 
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                selectedGroups.includes(String(g.group_id)) 
                                                    ? 'bg-purple-50 dark:bg-purple-900/20' 
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.includes(String(g.group_id))}
                                                onChange={() => toggleGroup(String(g.group_id))}
                                                className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{g.group_name}</span>
                                            <span className="text-xs text-gray-400 ml-auto">{g.member_count} 人</span>
                                        </label>
                                    ))
                            )}
                        </div>
                    </div>

                    {sendMode === 'puppeteer' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    自定义 HTML 模板
                                </label>
                                <button 
                                    type="button" 
                                    onClick={() => setCustomHtml('')} 
                                    className="text-xs text-gray-400 hover:text-gray-500"
                                >
                                    清空
                                </button>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-2">可用变量：</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {['{{title}}', '{{link}}', '{{description}}', '{{author}}', '{{pubDate}}', '{{image}}', '{{feedName}}'].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setCustomHtml(customHtml + ' ' + v)}
                                            className="px-2 py-0.5 bg-white dark:bg-amber-900/50 rounded text-xs text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/70 transition-colors font-mono"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                value={customHtml}
                                onChange={(e) => setCustomHtml(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                rows={6}
                                placeholder="<body>{{title}}</body>"
                            />
<p className="text-xs text-gray-400 mt-1.5">留空使用默认模板</p>
                        </div>
                    )}

                    {sendMode === 'forward' && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    自定义转发模板
                                </label>
                                <button 
                                    type="button" 
                                    onClick={() => setCustomForward('')} 
                                    className="text-xs text-gray-400 hover:text-gray-500"
                                >
                                    清空
                                </button>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                                <div className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-2">可用变量：</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {['{title}', '{link}', '{description}', '{author}', '{time}', '{feedName}'].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setCustomForward(customForward + ' ' + v)}
                                            className="px-2 py-0.5 bg-white dark:bg-blue-900/50 rounded text-xs text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors font-mono"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                value={customForward}
                                onChange={(e) => setCustomForward(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                rows={4}
                                placeholder={`【{feedName}】
{title}
{description}
链接: {link}
作者: {author} | 时间: {time}`}
                            />
                            <p className="text-xs text-gray-400 mt-1.5">留空使用默认模板</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <input
                            type="checkbox"
                            id="enabled-modal"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-5 h-5 text-purple-500 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="enabled-modal" className="text-sm text-gray-700 dark:text-gray-300">
                            启用订阅
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 flex-shrink-0">
                        <button type="button" onClick={onClose} className="btn-ghost rounded-full px-6">
                            取消
                        </button>
                        <button type="submit" className="btn-primary rounded-full px-6">
                            保存
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

function ConfirmModal({
    title,
    message,
    onConfirm,
    onCancel,
}: {
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
}) {
    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onCancel}>
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{title}</h3>
                    </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="btn-ghost rounded-full px-5">
                        取消
                    </button>
                    <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-5 py-2 transition-colors">
                        确认删除
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
