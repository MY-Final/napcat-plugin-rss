![napcat-plugin-rss](https://count.getloli.com/@MY-Final_napcat-plugin-rss?name=napcat-plugin-rss&theme=minecraft&padding=6&offset=0&align=top&scale=1&pixelated=1&darkmode=auto)

# napcat-plugin-rss

NapCat RSS 订阅推送插件，定时检测 RSS 更新并推送到 QQ 群。

## 功能特性

- **多订阅支持**：支持添加多个 RSS 订阅源
- **多群推送**：每个订阅源可推送到多个群
- **三种发送模式**：
  - 单条消息：直接发送文本消息
  - 合并转发：使用 QQ 合并转发功能
  - Puppeteer 图片渲染：使用 napcat-plugin-puppeteer 生成图片推送
- **自定义 HTML 模板**：支持用户自定义 Puppeteer 渲染模板
- **WebUI 管理界面**：可视化订阅管理
- **命令管理**：支持 QQ 群内命令管理订阅

## 安装

### 方式一：从 GitHub Release 下载

1. 前往 [Release 页面](https://github.com/MY-Final/napcat-plugin-rss/releases) 下载最新版本
2. 解压到 NapCat 插件目录

### 方式二：手动部署

```bash
# 克隆仓库
git clone https://github.com/MY-Final/napcat-plugin-rss.git
cd napcat-plugin-rss

# 安装依赖
pnpm install

# 构建
pnpm run build

# 部署
cp -r dist/* /path/to/napcat/plugins/napcat-plugin-rss/
```

## 使用方法

### 命令列表

```
#rss add <url> [name]   - 添加订阅
#rss del <id>           - 删除订阅
#rss list               - 查看订阅列表
#rss set <id> <key> <value>  - 修改订阅配置
#rss test <id>          - 测试推送
#rss enable <id>        - 启用订阅
#rss disable <id>       - 禁用订阅
#rss check <id>         - 手动检查更新
#rss status             - 查看状态
#rss help               - 查看帮助
```

### 配置项说明

| 配置项 | 说明 |
|--------|------|
| name | 订阅显示名称 |
| updateInterval | 轮询间隔（分钟） |
| sendMode | 发送方式：single/forward/puppeteer |
| groups | 推送群列表 |
| customHtmlTemplate | 自定义 HTML 模板（仅 puppeteer 模式） |

### HTML 模板变量

使用 Puppeteer 图片渲染时，可使用以下变量：

| 变量 | 说明 |
|------|------|
| `{{title}}` | 文章标题 |
| `{{link}}` | 文章链接 |
| `description` | 文章摘要 |
| `{{author}}` | 作者 |
| `{{pubDate}}` | 发布时间 |
| `{{image}}` | 封面图 URL |
| `{{feedName}}` | RSS 源名称 |

### 调试模式

开启调试模式后，轮询间隔会自动改为 1 分钟，方便开发测试。

## 依赖

- [napcat-plugin-puppeteer](https://github.com/NapNeko/napcat-plugin-puppeteer)：用于图片渲染（仅 Puppeteer 模式需要）

## 配置

在 WebUI 中配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 命令前缀 | #rss | 触发命令的前缀 |
| 默认发送方式 | forward | 新订阅默认使用的发送方式 |
| 默认轮询间隔 | 30 分钟 | RSS 源更新检测间隔 |
| Puppeteer 地址 | http://127.0.0.1:6099 | napcat-plugin-puppeteer 服务地址 |

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 开发模式（热重载）
pnpm run dev
```

## 许可证

MIT
