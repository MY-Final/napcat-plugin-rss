# AGENTS.md
## 目的
- 本仓库是一个使用 TypeScript 编写、由 Vite 打包的 NapCat RSS 订阅插件。
- 后端插件入口是 `src/index.ts`；WebUI 位于 `src/webui/`。
- 保持当前插件架构：入口 -> handlers/services -> `pluginState` 单例 -> WebUI/API。
- 优先做小而准的修改，遵循文件现有风格，不要顺手重排无关代码。

## 仓库结构
- `src/index.ts`：插件生命周期钩子、路由注册、调度器启动与关闭。
- `src/config.ts`：默认配置与 NapCat 配置 Schema 构建。
- `src/core/state.ts`：`pluginState` 单例、配置持久化、数据辅助方法、定时器、统计信息。
- `src/core/scheduler.ts`：RSS 调度与更新检查。
- `src/handlers/message-handler.ts`：QQ群命令解析与命令处理。
- `src/services/api-service.ts`：WebUI HTTP API 接口。
- `src/services/rss/`：RSS 抓取、解析与存储逻辑。
- `src/services/message/`：单条、合并转发、puppeteer 消息发送。
- `src/services/puppeteer/`：模板渲染与远程截图客户端。
- `src/webui/`：React + Vite + Tailwind 管理界面。

## 工具链概览
- 包管理器：仓库根目录和 `src/webui/` 都使用 `pnpm`。
- 模块格式：ESM（`"type": "module"`）。
- 后端构建：Vite library 模式输出到 `dist/index.mjs`。
- TypeScript 模式：根目录 `tsconfig.json` 启用了 `strict: true`。
- WebUI 构建：独立的 Vite 应用，打包到 `src/webui/dist`，并以单文件形式输出。
- Lint：当前没有 lint script，也没有 ESLint/Prettier/Biome 配置。
- 测试：当前没有测试框架、没有 test script，也没有已提交的测试文件。

## 安装与构建命令
- 根依赖安装：`pnpm install`
- 仅安装 WebUI 依赖：`pnpm --dir src/webui install`
- 完整插件构建：`pnpm run build`
- 仅类型检查：`pnpm run typecheck`
- 后端 watch 构建：`pnpm run watch`
- 热重载/开发部署流程：`pnpm run dev`
- 一次性部署别名：`pnpm run push` 和 `pnpm run deploy`
- WebUI 构建：`pnpm --dir src/webui run build` 或 `pnpm run build:webui`
- WebUI 开发服务器：`pnpm --dir src/webui run dev` 或 `pnpm run dev:webui`
- WebUI 预览：`pnpm --dir src/webui run preview`

## Lint 与测试现状
- 当前没有配置 lint 命令。
- 当前没有配置自动化测试命令。
- 当前不支持“单测单跑”，因为仓库里没有安装测试框架。
- 不要凭空使用 `pnpm test`、`pnpm vitest` 或任何单测命令，除非你同时补上对应工具链。
- 如果以后新增测试，也要同时补充“运行单个测试文件”和“运行单个命名测试”的根脚本。
- 目前验证改动时，优先使用 `pnpm run typecheck`、`pnpm run build`，以及针对性的手动 API/UI 验证。

## 构建行为说明
- 根目录 `vite.config.ts` 会先构建后端，再在 `writeBundle()` 中构建并复制 WebUI。
- 根构建会自动生成裁剪后的 `dist/package.json`。
- 如果存在 `templates/` 目录，根构建也会一并复制。
- `pnpm run build` 是当前最接近“全仓验证”的命令。
- `pnpm run dev` 与 `pnpm run push` 会接入 `napcat-plugin-debug-cli` 的热更新/部署能力。

## 架构规则
- 生命周期逻辑集中放在 `src/index.ts`，不要把插件钩子导出拆散到多个文件。
- 共享配置、日志、数据路径、定时器、运行时统计统一通过 `pluginState` 管理。
- RSS 相关逻辑放在 `src/services/rss/`，消息发送相关逻辑放在 `src/services/message/`。
- HTTP 接口统一在 `src/services/api-service.ts` 注册，不要塞进无关模块。
- WebUI 网络访问统一收敛到 `src/webui/src/utils/api.ts` 之类的辅助函数。

## 导入规范
- 仅使用 ESM import。
- 外部包导入放在本地相对导入之前。
- 类型导入使用 `import type`；后端和 WebUI 里都已经普遍采用。
- 本地导入优先使用与当前目录风格一致的相对路径；不要随意引入 path alias。
- 只有在确实能提升复用性时才做类型再导出，例如 `src/types.ts`。

## 格式规范
- 以当前文件已有风格为准。
- 后端 `.ts` 文件通常使用分号，4 空格缩进。
- WebUI `.ts`/`.tsx` 文件通常不写分号，也使用 4 空格缩进。
- 保持代码可读，不要做大范围格式化改动。
- 保留文件原有引号风格；仓库里单引号更常见。

## 类型规范
- 保持严格类型，不要无故放宽签名。
- 共享对象结构优先用 `interface`，联合类型优先用 `type`，例如 `SendMode`。
- API 边界要为请求/响应数据写清楚类型。
- 能用 `unknown` 或可收窄类型时，不要直接上 `any`。
- 仓库里现有少量 `catch (e: any)` 用于外部错误；保持这种用法局部且克制。
- NapCat action 返回的未知结构，只在边界处做必要的类型断言。

## 命名规范
- 变量、函数、对象属性使用 `camelCase`。
- 接口、React 组件、导出类型使用 `PascalCase`。
- 模块级常量使用 `UPPER_SNAKE_CASE`，例如 `DEFAULT_CONFIG`、`DEFAULT_TEMPLATE`。
- 服务/工具命名尽量语义明确，例如 `feedScheduler`、`pluginState`、`registerApiRoutes`、`sendGroupMessage`。
- 命令处理函数保持动作导向命名，例如 `handleAdd`、`handleDelete`、`handleCheck`。

## 错误处理
- I/O、网络、调度器和 NapCat action 调用都要包 `try/catch`。
- 后端统一通过 `ctx.logger` 或 `pluginState.logger` 记录错误；不要静默吞错。
- API 路由返回结构化错误：`res.status(...).json({ code: -1, message: ... })`。
- 修改状态前先校验必须的路由参数或请求体字段。
- 解析未知配置或磁盘数据时，要清洗成安全默认值，不要直接信任输入。
- UI 侧失败要通过 toast 或清晰的兜底状态反馈给用户。

## 状态与持久化
- 写配置时使用 `pluginState.updateConfig()` 或 `pluginState.replaceConfig()`。
- 插件自有 JSON 数据使用 `pluginState.loadDataFile()` 与 `pluginState.saveDataFile()`。
- 定时器句柄统一放进 `pluginState.timers`，确保 cleanup 可以全部停止。
- 群级启用判断使用 `pluginState.isGroupEnabled()`。
- Feed 持久化优先使用 `src/services/rss/storage.ts` 中的辅助方法，不要自己散写文件逻辑。

## NapCat 与 API 约定
- 使用 `ctx.actions.call(action, params, ctx.adapterName, ctx.pluginManager.config)`。
- 无参数 OneBot action 传 `{}`，不要传 `undefined`。
- 先用 `EventType.MESSAGE` 过滤消息事件，再进入消息处理逻辑。
- 路由助手保持统一：鉴权接口用 `get/post`，插件 WebUI 接口用 `getNoAuth/postNoAuth`。
- 成功响应应遵循 `{ code: 0, data?: ... }`。
- 错误响应应遵循 `{ code: -1, message: ... }`，并返回合适的 HTTP 状态码。
- 路由处理器保持轻量：做校验、调用 service/storage helper、返回类型明确的数据。
- 当 feed 的启用状态、间隔或 URL 变化时，要同步重算调度器状态。

## WebUI 约定
- 使用 React 函数组件和 hooks。
- API 调用统一放在 `noAuthFetch()` / `authFetch()` 这类辅助函数后面。
- 复用现有组件模式：卡片、圆角控件、Portal 弹窗、toast 提示。
- 样式系统是 Tailwind；优先沿用现有 utility 组合，不要引入 CSS-in-JS。
- 遵循 `src/webui/tailwind.config.js` 和现有组件中的粉色主题。

## 需要继承的 Copilot 规则
- 当 `.github/copilot-instructions.md` 比本文件更严格时，以它为准。
- 代码、日志、UI 文案里不要使用 emoji；前端图标请使用 SVG 组件或内联 SVG。
- 如果后端日志需要装饰性文本，优先使用颜文字而不是 emoji。
- 在模板字符串里小心反引号；必要时转义，或改用字符串拼接。
- `napcat-types` 的导入路径要严格沿用仓库现有的深路径写法。
- 尽量通过 `pluginState` 访问共享状态，而不是层层传递 context/config。
- 数据存储目录保持在 `ctx.dataPath` 下。
- 在 `plugin_cleanup` 中清理定时器和其他资源。

## 仓库特定注意事项
- 目前部分文件仍包含 emoji、紫色强调和渐变 UI；新增改动时把 Copilot 规则视为首选方向。
- 仓库没有格式化工具约束，避免在同一文件里混用后端与 WebUI 风格。
- 根脚本 `build:webui` 和 `dev:webui` 内部使用了 shell `cd`；外部脚本调用时优先写成 `pnpm --dir src/webui ...`。
- 由于当前没有测试，不要在提交说明里声称已经做了完整行为覆盖。

## 推荐验证方式
- 仅后端改动：`pnpm run typecheck`
- 后端构建或打包改动：`pnpm run build`
- 仅 WebUI 改动：`pnpm --dir src/webui run build`
- 跨端改动：同时运行上面两个构建命令。
- 如果需要手动验证，直接操作受影响的 WebUI 页面或 API 路由。
