# 🎮 游戏资源站（静态版）

一个**纯静态**的游戏资源站，用来发布各款游戏的网盘下载链接（百度网盘 / 夸克网盘 / 阿里云盘 / 123云盘……）。

- 无需服务器、无需数据库、无需安装任何软件即可运行
- 添加新游戏 = 改一个 JSON 文件 + 放一张图
- 免费托管在 Cloudflare Pages，长期稳定运行

## ✨ 功能

- 🔍 实时搜索（名称 / 原名 / 分类 / 标签 / 简介）
- 🏷️ 分类与标签筛选（**自动**从数据生成，不需要额外配置）
- 🖼️ 游戏封面 + 截图画廊（点击放大）
- 🔗 一个游戏挂多个网盘链接，提取码一键复制
- 📊 访问统计：浏览量、下载点击量、分网盘明细（需 Cloudflare Pages + KV，见下文）
- 📱 手机 / 电脑自适应
- 🌐 零依赖：纯 HTML/CSS/JS，不需要 Node、不需要构建

## 📁 目录结构

```
game-resource-site/
├── index.html            # 首页（含搜索、筛选、游戏列表、详情页）
├── stats.html            # 数据统计页
├── assets/
│   ├── style.css         # 样式
│   └── app.js            # 页面逻辑（一般不用改）
├── data/
│   └── games.json        # ⭐ 站点配置 + 所有游戏数据（你要改的主要是这个文件）
├── images/
│   ├── covers/           # 游戏封面图
│   └── screenshots/      # 游戏截图
├── functions/api/        # Cloudflare Pages Functions（访问统计接口，不用改）
├── favicon.svg           # 站点图标
├── robots.txt            # 搜索引擎规则
└── _headers              # 图片缓存规则
```

## 🚀 本地预览

> ⚠️ 直接双击 `index.html` 打开会因为浏览器安全限制加载不出数据，请用本地服务器预览。

方法一（Windows 自带，推荐）：在项目文件夹按住 Shift 右键 → 「在终端中打开」，执行：

```
python -m http.server 8010
```

然后浏览器打开 http://localhost:8010

方法二（已装 Node）：

```
npx serve .
```

> 本地预览时“数据统计”页会显示未启用，这是正常的——统计功能只在部署到 Cloudflare Pages 后生效。

## ➕ 添加新游戏

1. 把封面图放进 `images/covers/`（截图放进 `images/screenshots/`）
2. 打开 `data/games.json`，在 `"games"` 数组里加一条（**注意：最后一项后面不要加逗号**）：

```json
{
  "id": "hades",
  "title": "哈迪斯",
  "originalTitle": "Hades",
  "category": "动作游戏",
  "tags": ["Roguelike", "希腊神话", "高难度"],
  "cover": "images/covers/hades.jpg",
  "screenshots": ["images/screenshots/hades-1.jpg", "images/screenshots/hades-2.jpg"],
  "version": "v1.38290",
  "size": "9.6 GB",
  "platform": ["Windows"],
  "language": "简体中文",
  "publisher": "Supergiant Games",
  "releaseDate": "2020-09-17",
  "description": "作为冥界王子扎格列欧斯，挥舞众神赐予的武器，一次次冲出冥界……",
  "note": "解压即玩。解压密码：gamelib",
  "featured": true,
  "addedAt": "2024-04-18",
  "links": [
    { "name": "百度网盘", "type": "baidu", "url": "https://pan.baidu.com/s/你的链接", "code": "abcd" },
    { "name": "夸克网盘", "type": "quark", "url": "https://pan.quark.cn/s/你的链接", "code": "" }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 英文/拼音唯一标识，用于详情页地址，不要与其他游戏重复 |
| `title` | ✅ | 游戏名 |
| `originalTitle` | | 游戏原名（卡片和详情页小字显示） |
| `category` | ✅ | 分类名（随意起名，会自动生成分类筛选按钮） |
| `tags` | | 标签数组，自动生成标签筛选 |
| `cover` | ✅ | 封面图路径 |
| `screenshots` | | 截图路径数组，可留空 `[]` |
| `version` / `size` / `platform` / `language` / `publisher` / `releaseDate` | | 详情页信息栏，有就填 |
| `description` | | 游戏介绍 |
| `note` | | 备注（解压密码等），会高亮显示 |
| `featured` | | `true` 时卡片左上角显示 🔥 推荐 |
| `addedAt` | | 添加日期（YYYY-MM-DD），用于“最新添加”排序 |
| `links` | ✅ | 网盘链接数组 |

### links 里每个链接的字段

| 字段 | 说明 |
| --- | --- |
| `name` | 显示名称，如「百度网盘」（同一游戏每个链接名称建议不同，统计按名称区分） |
| `url` | 网盘分享链接 |
| `code` | 提取码，没有就填 `""` |
| `type` | 网盘类型标识，决定圆点颜色。已内置：`baidu` `quark` `aliyun` `123` `lanzou` `xunlei` `tianyi` `weiyun` `onedrive` `mega` `google` `telegram`，其他名称会用默认紫色 |

### 修改站点信息

`data/games.json` 顶部的 `site` 部分可改站名、副标题、公告、页脚文案：

```json
"site": {
  "name": "Gamelib 游戏资源站",
  "description": "收录 PC 单机游戏，提供多网盘下载链接",
  "announcement": "📢 公告内容",
  "footer": "页脚文案"
}
```

> 改完 JSON 记得用 [JSON 校验工具](https://www.json.cn) 检查一遍，多一个逗号或少一个引号整站都会加载失败。

## 🖼️ 图片规范

- 封面建议 **16:9 横图**，宽度 800px 以上（Steam 商店页的横版图可以直接用）
- 截图同样建议 16:9，每张 500KB 以内体验最好（可用 [tinypng.com](https://tinypng.com) 压缩）
- 支持 jpg / png / webp；仓库里现有的 `.svg` 都是占位图，替换后可以删掉

## ☁️ 部署到 Cloudflare Pages（推荐，免费）

### 第 1 步：把代码传到 GitHub

注册 [GitHub](https://github.com) 后，在本机安装 [Git](https://git-scm.com/download/win)，在项目文件夹打开终端执行：

```
git init
git add .
git commit -m "init game resource site"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

> 不会用 Git 的话，也可以：GitHub 网页上新建仓库 → 「uploading an existing file」→ 把整个项目文件夹拖进去上传。

### 第 2 步：Cloudflare 创建 Pages 项目

1. 注册登录 [Cloudflare](https://dash.cloudflare.com)（免费）
2. 左侧点 **Workers 和 Pages** → **创建** → **Pages** 选项卡 → **连接到 Git** → 授权并选择你的仓库 → **开始设置**
3. 构建设置：
   - 框架预设：**无**（None）
   - 构建命令：**留空**
   - 构建输出目录：填 **`.`**（一个点）
4. 点 **保存并部署**，几分钟后访问 `https://你的项目名.pages.dev` 就能看到站点 ✅

> 也可以把默认域名 `xxx.pages.dev` 直接发给朋友使用。

### 第 3 步：开启访问统计（KV）

1. Cloudflare 控制台左侧点 **存储和数据库 → KV** → **创建命名空间**，名字随意（如 `GAME_STATS`），创建
2. 回到你的 Pages 项目 → **Settings → Functions → KV 命名空间绑定** → **添加绑定**：
   - 变量名称：**必须填 `GAME_STATS`**（代码里写死的）
   - KV 命名空间：选刚创建的那个
3. 保存后回到 **部署** 页面，对最新部署点 **⋯ → 重试部署**（重新部署一次绑定才生效）
4. 部署完成后：首页游戏卡片会出现下载计数，`stats.html` 统计页也能看到明细了 ✅

### 第 4 步（可选）：自定义域名 + 全站流量统计

- **自定义域名**：Pages 项目 → **自定义域** → 设置你自己的域名（把域名的 NS 迁到 Cloudflare 即可，自动配好 HTTPS）
- **全站访问量**：Cloudflare 控制台 → **分析与日志 → Web Analytics** → 添加站点，把给出的 `<script>` 片段贴进 `index.html` 的 `</head>` 前

> 💡 每次修改 `games.json` 或图片后，`git push` 一下，Cloudflare 会自动重新部署，约 1 分钟后更新。

## 🧱 备用方案：GitHub Pages / Vercel

代码是纯静态的，也可以免费托管到别处：

- **GitHub Pages**：仓库 Settings → Pages → Build and deployment 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → Save。
- **Vercel**：导入 GitHub 仓库，框架预设选 Other，直接部署。

> 注意：这两个平台**没有** Cloudflare Pages Functions，因此「访问统计」功能不可用（页面其他功能全部正常）。也可以用 [Cloudflare Web Analytics](https://www.cloudflare.com/zh-cn/web-analytics/) 或 [Umami](https://umami.is) 等第三方免费统计代替。

## ❓ 常见问题

**Q：双击 index.html 打开是空白的？**
A：正常现象。请用本地服务器预览（见上文），部署后访问网页不会遇到这个问题。

**Q：统计页一直显示“统计未启用”？**
A：按第 3 步检查：是否部署在 Cloudflare Pages？KV 绑定变量名是否为 `GAME_STATS`？绑定后是否重新部署过？

**Q：改了 games.json 页面没变化？**
A：本地预览刷新浏览器；线上站点等 Cloudflare 重新部署完成（约 1 分钟），或先检查 JSON 格式是否合法（多逗号会加载失败）。

**Q：国内访问速度如何？**
A：Cloudflare Pages 免费版走海外节点，速度一般但可稳定访问。如果以后有国内服务器/备案域名，这套静态文件也可以原样搬过去。

## ⚠️ 免责声明

本站点仅用于技术学习与交流。发布游戏资源前请确认内容合法合规、尊重版权，分享的链接由发布者自行负责。建议只收录无版权争议的内容（免费游戏、开源游戏、正版购买链接等），避免法律风险。
