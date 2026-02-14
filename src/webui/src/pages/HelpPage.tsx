import { useState } from 'react'

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState<'plugin' | 'rss'>('plugin')

    const prefix = '#rss'

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">插件说明</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">使用帮助与功能介绍</p>
                </div>
            </div>

            {/* Tab 切换 */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('plugin')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'plugin'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    插件使用说明
                </button>
                <button
                    onClick={() => setActiveTab('rss')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'rss'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    什么是 RSS
                </button>
            </div>

            {activeTab === 'plugin' ? (
                <div className="space-y-6">
                    {/* 插件介绍 */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
                        <h3 className="text-xl font-bold mb-2">RSS 订阅推送插件</h3>
                        <p className="opacity-90">定时检测 RSS 更新并推送到 QQ 群，让你随时掌握感兴趣的资讯动态</p>
                    </div>

                    {/* 功能特性 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            功能特性
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: '📡', title: '多订阅支持', desc: '支持添加多个 RSS 订阅源' },
                                { icon: '👥', title: '多群推送', desc: '每个订阅源可推送到多个群' },
                                { icon: '📋', title: '三种发送模式', desc: '合并转发/单条消息/图片渲染' },
                                { icon: '🎨', title: '自定义模板', desc: '支持自定义 HTML 模板' },
                                { icon: '🖼️', title: 'Puppeteer 渲染', desc: '生成美观的图片推送' },
                                { icon: '🏷️', title: '分类管理', desc: '对订阅进行分组管理' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 命令列表 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            命令列表
                        </h4>
                        <div className="space-y-3">
                            {[
                                { cmd: `${prefix} add <url> [name]`, desc: '添加订阅' },
                                { cmd: `${prefix} del <id>`, desc: '删除订阅' },
                                { cmd: `${prefix} list`, desc: '查看订阅列表' },
                                { cmd: `${prefix} set <id> <key> <value>`, desc: '修改订阅配置' },
                                { cmd: `${prefix} test <id>`, desc: '测试推送' },
                                { cmd: `${prefix} enable <id>`, desc: '启用订阅' },
                                { cmd: `${prefix} disable <id>`, desc: '禁用订阅' },
                                { cmd: `${prefix} check <id>`, desc: '手动检查更新' },
                                { cmd: `${prefix} status`, desc: '查看状态' },
                                { cmd: `${prefix} cat add <name>`, desc: '添加分类' },
                                { cmd: `${prefix} cat del <id>`, desc: '删除分类' },
                                { cmd: `${prefix} cat list`, desc: '查看分类' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-purple-600 dark:text-purple-400">{item.cmd}</code>
                                    <span className="text-sm text-gray-500">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 配置项说明 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            配置项说明
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-2 px-3 font-medium text-gray-500">配置项</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-500">说明</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3">name</td>
                                        <td className="py-2 px-3">订阅显示名称</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3">updateInterval</td>
                                        <td className="py-2 px-3">轮询间隔（秒/分钟）</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3">sendMode</td>
                                        <td className="py-2 px-3">发送方式：single/forward/puppeteer</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3">groups</td>
                                        <td className="py-2 px-3">推送群列表</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3">customHtmlTemplate</td>
                                        <td className="py-2 px-3">自定义 HTML 模板（仅 puppeteer 模式）</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* HTML 模板变量 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                            HTML 模板变量
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { var: '{{title}}', desc: '文章标题' },
                                { var: '{{link}}', desc: '文章链接' },
                                { var: '{{description}}', desc: '文章摘要' },
                                { var: '{{author}}', desc: '作者' },
                                { var: '{{pubDate}}', desc: '发布时间' },
                                { var: '{{image}}', desc: '封面图 URL' },
                                { var: '{{feedName}}', desc: 'RSS 源名称' },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                                    <code className="text-xs text-purple-600 dark:text-purple-400">{item.var}</code>
                                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 什么是 RSS */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
                        <h3 className="text-xl font-bold mb-2">什么是 RSS？</h3>
                        <p className="opacity-90">RSS (Really Simple Syndication) 是一种信息聚合的技术，可以让你在一个地方统一获取多个网站的更新内容</p>
                    </div>

                    {/* RSS 优势 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            为什么使用 RSS？
                        </h4>
                        <div className="space-y-4">
                            {[
                                { icon: '🚫', title: '无需账号', desc: '无需注册登录任何网站，直接订阅' },
                                { icon: '🔔', title: '主动推送', desc: '内容更新时主动推送给您，无需频繁打开网站查看' },
                                { icon: '📱', title: '统一阅读', desc: '在一个地方阅读所有订阅内容，告别信息碎片化' },
                                { icon: '🔒', title: '保护隐私', desc: '无需暴露个人信息给各个网站' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 如何使用 RSS */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            如何使用 RSS？
                        </h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">1</div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">获取 RSS 链接</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        大多数网站底部都有 RSS 按钮，或者可以使用 RSSHub 为主流网站生成 RSS 链接
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">2</div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">添加订阅</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        在插件中使用 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{prefix} add &lt;链接&gt; [名称]</code> 添加订阅
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">3</div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">设置推送群</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        配置要推送的群聊，插件会自动将更新推送到指定群
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RSSHub 介绍 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            关于 RSSHub
                        </h4>
                        <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                RSSHub 是一个开源的 RSS 源生成器，可以为那些没有提供 RSS 订阅的网站生成 RSS 链接。
                                它支持数百个主流网站，包括微博、知乎，B站、抖音、Twitter 等。
                            </p>
                            <p className="mt-3">
                                访问 <a href="https://rsshub-doc.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">RSSHub 文档</a> 了解更多信息。
                            </p>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <a
                                href="https://rsshub-doc.pages.dev/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                访问 RSSHub 文档
                            </a>
                            <a
                                href="https://github.com/DIYgod/RSSHub"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                GitHub
                            </a>
                        </div>
                    </div>

                    {/* 常见 RSS 源推荐 */}
                    <div className="card p-5">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            常见 RSS 源推荐
                        </h4>
                        <div className="space-y-3">
                            {[
                                { name: '知乎热榜', url: 'https://rsshub.app/zhihu/hotlist' },
                                { name: 'B站热门', url: 'https://rsshub.app/bilibili/popular' },
                                { name: '微博热搜', url: 'https://rsshub.app/weibo/search/hot' },
                                { name: 'GitHub 热门', url: 'https://rsshub.app/github/trending' },
                                { name: '掘金热门', url: 'https://rsshub.app/juejin/trending' },
                                { name: '36氪', url: 'https://rsshub.app/36kr/news' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                                    <code className="text-xs text-gray-500 truncate max-w-[200px]">{item.url}</code>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
