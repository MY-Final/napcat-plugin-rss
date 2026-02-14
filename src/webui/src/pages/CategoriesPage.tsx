import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { noAuthFetch } from '../utils/api'
import { showToast as showToastFn } from '../hooks/useToast'

interface Category {
    id: string
    name: string
    color?: string
    createdAt: number
    feedCount?: number
}

interface FeedInfo {
    id: string
    name: string
    url: string
    enabled: boolean
    categoryId?: string
}

const PRESET_COLORS = [
    '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDetail, setShowDetail] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [categoryFeeds, setCategoryFeeds] = useState<FeedInfo[]>([])
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({ name: '', color: '#667eea' })

    const fetchCategories = async () => {
        try {
            const res = await noAuthFetch<Category[]>('/categories')
            if (res.code === 0) {
                setCategories(res.data || [])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchFeedsByCategory = async (categoryId: string) => {
        try {
            const res = await noAuthFetch<FeedInfo[]>('/feeds')
            if (res.code === 0) {
                const feeds = (res.data || []).filter((f: FeedInfo) => f.categoryId === categoryId)
                setCategoryFeeds(feeds)
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            showToastFn('请输入分类名称', 'error')
            return
        }

        try {
            let res
            if (editingCategory) {
                res = await noAuthFetch<{ code: number }>(`/categories/${editingCategory.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                })
            } else {
                res = await noAuthFetch<{ code: number }>('/categories', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                })
            }

            if (res.code === 0) {
                showToastFn(editingCategory ? '分类已更新' : '分类已添加', 'success')
                setShowModal(false)
                setEditingCategory(null)
                setFormData({ name: '', color: '#667eea' })
                fetchCategories()
            } else {
                showToastFn(res.message || '操作失败', 'error')
            }
        } catch (e) {
            showToastFn('操作失败', 'error')
        }
    }

    const handleViewDetail = async (category: Category) => {
        setSelectedCategory(category)
        await fetchFeedsByCategory(category.id)
        setShowDetail(true)
    }

    const handleEdit = (category: Category, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingCategory(category)
        setFormData({ name: category.name, color: category.color || '#667eea' })
        setShowModal(true)
    }

    const handleDelete = async (category: Category, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(`确定要删除分类 "${category.name}" 吗？\n该分类下的订阅将被移至未分类。`)) {
            return
        }

        try {
            const res = await noAuthFetch<{ code: number }>(`/categories/${category.id}`, {
                method: 'DELETE'
            })
            if (res.code === 0) {
                showToastFn('分类已删除', 'success')
                fetchCategories()
            } else {
                showToastFn(res.message || '删除失败', 'error')
            }
        } catch (e) {
            showToastFn('删除失败', 'error')
        }
    }

    const openAddModal = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setEditingCategory(null)
        setFormData({ name: '', color: '#667eea' })
        setShowModal(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">分类管理</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">对订阅源进行分组管理</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + 添加分类
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <div className="text-gray-400 mb-2">暂无分类</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">点击上方按钮添加第一个分类</p>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        添加第一个分类
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            onClick={() => handleViewDetail(category)}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-500 cursor-pointer transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: (category.color || '#667eea') + '20' }}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: category.color || '#667eea' }}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                                            {category.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {category.feedCount || 0} 个订阅
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEdit(category, e)}
                                        className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="编辑"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(category, e)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="删除"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    点击查看详情
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {createPortal(
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowModal(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {editingCategory ? '编辑分类' : '添加分类'}
                                </h3>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        分类名称
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="请输入分类名称"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        颜色
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {editingCategory ? '保存' : '添加'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ),
                document.body
            )}

            {createPortal(
                showDetail && selectedCategory && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowDetail(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: (selectedCategory.color || '#667eea') + '20' }}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: selectedCategory.color || '#667eea' }}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                            {selectedCategory.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {categoryFeeds.length} 个订阅
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetail(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5">
                                {categoryFeeds.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">该分类下暂无订阅</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">可在订阅管理中添加分类</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categoryFeeds.map((feed) => (
                                            <div
                                                key={feed.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${feed.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white">{feed.name}</div>
                                                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{feed.url}</div>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs ${feed.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                                                    {feed.enabled ? '启用' : '禁用'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ),
                document.body
            )}
        </div>
    )
}
