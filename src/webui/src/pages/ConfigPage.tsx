import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig, SendMode } from '../types'
import { IconTerminal, IconSettings } from '../components/icons'

export default function ConfigPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (update: Partial<PluginConfig>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, ...update }
            await noAuthFetch('/config', {
                method: 'POST',
                body: JSON.stringify(newConfig),
            })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }, [config])

    const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
        if (!config) return
        const updated = { ...config, [key]: value }
        setConfig(updated)
        saveConfig({ [key]: value })
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载配置中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 stagger-children">
            {/* 基础配置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    基础配置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用插件"
                        desc="全局开关，关闭后不响应任何命令"
                        checked={config.enabled}
                        onChange={(v) => updateField('enabled', v)}
                    />
                    <ToggleRow
                        label="调试模式"
                        desc="启用后输出详细日志到控制台"
                        checked={config.debug}
                        onChange={(v) => updateField('debug', v)}
                    />
                    <InputRow
                        label="命令前缀"
                        desc="触发命令的前缀"
                        value={config.commandPrefix}
                        onChange={(v) => updateField('commandPrefix', v)}
                    />
                    <InputRow
                        label="冷却时间 (秒)"
                        desc="同一命令请求冷却时间，0 表示不限制"
                        value={String(config.cooldownSeconds)}
                        type="number"
                        onChange={(v) => updateField('cooldownSeconds', Number(v) || 0)}
                    />
                </div>
            </div>

            {/* RSS 默认配置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconSettings size={16} className="text-gray-400" />
                    RSS 默认配置
                </h3>
                <div className="space-y-5">
                    <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">默认发送方式</div>
                        <div className="text-xs text-gray-400 mb-3">新订阅默认使用的发送方式</div>
                        <div className="flex gap-2">
                            {[
                                { value: 'forward', label: '📋 合并转发', desc: '适合多条内容' },
                                { value: 'single', label: '📝 单条消息', desc: '简洁快速' },
                                { value: 'puppeteer', label: '🖼️ 图片渲染', desc: '美观但较慢' },
                            ].map((mode) => (
                                <button
                                    key={mode.value}
                                    onClick={() => updateField('defaultSendMode', mode.value as SendMode)}
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                                        config.defaultSendMode === mode.value
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-sm font-medium">{mode.label}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{mode.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">默认轮询间隔</div>
                        <div className="text-xs text-gray-400 mb-3">RSS 源更新检测间隔</div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                                <input
                                    type="number"
                                    className="w-16 bg-transparent text-center text-sm font-medium outline-none"
                                    value={config.defaultUpdateInterval >= 60 ? Math.round(config.defaultUpdateInterval / 60) : config.defaultUpdateInterval}
                                    onChange={(e) => {
                                        const num = Number(e.target.value) || 1
                                        const isMinute = config.defaultUpdateInterval >= 60 && config.defaultUpdateInterval % 60 === 0
                                        if (isMinute) {
                                            updateField('defaultUpdateInterval', num * 60)
                                        } else {
                                            updateField('defaultUpdateInterval', num)
                                        }
                                    }}
                                    min={1}
                                />
                                <select
                                    className="bg-transparent text-xs text-gray-400 outline-none"
                                    value={config.defaultUpdateInterval >= 60 && config.defaultUpdateInterval % 60 === 0 ? 'minute' : 'second'}
                                    onChange={(e) => {
                                        const currentVal = config.defaultUpdateInterval >= 60 
                                            ? Math.round(config.defaultUpdateInterval / 60) 
                                            : config.defaultUpdateInterval
                                        if (e.target.value === 'second') {
                                            updateField('defaultUpdateInterval', currentVal)
                                        } else {
                                            updateField('defaultUpdateInterval', currentVal * 60)
                                        }
                                    }}
                                >
                                    <option value="second">秒</option>
                                    <option value="minute">分钟</option>
                                </select>
                            </div>
                            <span className="text-xs text-gray-400">
                                {config.defaultUpdateInterval >= 60 && config.defaultUpdateInterval % 60 === 0 
                                    ? `(${config.defaultUpdateInterval / 60} 分钟)` 
                                    : `(${config.defaultUpdateInterval} 秒)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Puppeteer 配置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconSettings size={16} className="text-gray-400" />
                    Puppeteer 配置
                </h3>
                <div className="space-y-5">
                    <InputRow
                        label="Puppeteer 服务地址"
                        desc="napcat-plugin-puppeteer 的服务地址"
                        value={config.puppeteerEndpoint}
                        onChange={(v) => updateField('puppeteerEndpoint', v)}
                    />
                </div>
            </div>

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}

/* ---- 子组件 ---- */

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="slider" />
            </label>
        </div>
    )
}

function InputRow({ label, desc, value, type = 'text', onChange }: {
    label: string; desc: string; value: string; type?: string; onChange: (v: string) => void
}) {
    const [local, setLocal] = useState(value)
    useEffect(() => { setLocal(value) }, [value])

    const handleBlur = () => {
        if (local !== value) onChange(local)
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <input
                className="input-field"
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    )
}
