# 白雲札記 · 可以在线写作的静态博客

一个部署在 **GitHub Pages** 上的个人博客：前台是纯静态页面，后台是站点内置的浏览器管理台。不需要服务器、数据库，也不需要每个月续费。

![首页预览](docs/preview.png)

- 在浏览器里 **新增 / 修改 / 删除** 文章，保存即提交到 GitHub。
- GitHub Actions 自动构建并部署，通常 1–2 分钟后线上生效。
- 文章就是仓库里的 Markdown 文件，随时可以本地编辑、回滚、迁移。
- 自带深色模式、标签、搜索、文章目录、RSS、sitemap 和社交分享图。

## 技术栈

| 部分 | 方案 |
| --- | --- |
| 静态站点 | [Astro 5](https://astro.build/) |
| 内容 | Markdown + Astro Content Collections |
| 部署 | GitHub Pages + GitHub Actions |
| 在线编辑 | 浏览器管理台 + GitHub Contents API |
| 运行时 | 无后端、无数据库、无第三方统计 |

## 它是怎么工作的

```text
┌──────────────────┐
│  浏览器 /admin/   │
│  Markdown 编辑器  │
└────────┬─────────┘
         │ GitHub Contents API（commit）
         ▼
┌──────────────────┐
│   GitHub 仓库     │
│  src/content/...  │
└────────┬─────────┘
         │ push 触发
         ▼
┌──────────────────┐
│  GitHub Actions   │
│  pnpm build       │
└────────┬─────────┘
         │ 上传 dist/
         ▼
┌──────────────────┐
│   GitHub Pages    │
└──────────────────┘
```

管理台不保存内容，只负责把 Markdown 提交回仓库。即使管理台出问题，文章仍然在 Git 里，用任何编辑器都能改。

## 本地运行

要求 **Node.js ≥ 18.20.8**，推荐 Node 22 LTS。先检查：

```bash
node -v
```

如果版本太旧，到 [nodejs.org](https://nodejs.org/) 安装 LTS 版本。然后：

```bash
# 安装 pnpm（只需一次）
npm install -g pnpm@11

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 <http://localhost:4321>。构建和本地预览：

```bash
pnpm build
pnpm preview
```

> `pnpm-workspace.yaml` 里使用了 `nodeLinker: hoisted`，这是为了让依赖在 Windows 上更稳定。不要删除这个文件。

## 部署到 GitHub Pages

### 1. 创建仓库并推送

在 GitHub 新建一个仓库（例如 `my-blog`），然后把当前目录推上去：

```bash
git init
git add .
git commit -m "init: my blog"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 当前目录已经初始化过 Git 并完成了首次提交。如果你直接在这个目录上操作，可以跳过 `git init`、`git add` 和 `git commit`，从 `git remote add` 开始。

### 2. 打开 Pages

进入仓库的 **Settings → Pages**：

- **Build and deployment → Source** 选择 **GitHub Actions**。
- 不需要选择分支，也不需要手动配置 `base`。

推送后 **Actions** 标签页会自动运行 `Deploy blog to GitHub Pages`。如果第一次运行失败，通常是因为 Pages 还没启用：回到 **Settings → Pages** 把 Source 设为 **GitHub Actions**，然后到 Actions 里点 **Re-run all jobs**。

首次部署完成后，地址通常是：

```text
https://<你的用户名>.github.io/<仓库名>/
```

如果仓库名是 `<你的用户名>.github.io`，地址就是 `https://<你的用户名>.github.io/`。

### 3. 子路径会自动适配

GitHub Pages 的项目站点部署在 `/<仓库名>/` 下。工作流会把 `BASE_PATH` 传给 Astro，站内链接、CSS、图片和 Markdown 里的 `/images/...` 都会自动加上前缀，**不需要手动改路径**。

## 在线管理文章

部署完成后打开：

```text
https://<你的用户名>.github.io/<仓库名>/admin/
```

也可以从页脚的「管理」进入。

### 创建 Token

管理台需要一个 **fine-grained personal access token**：

1. 打开 GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. **Repository access** 选择 **Only select repositories**，只勾选这个博客仓库。
3. **Permissions → Repository permissions**：
   - **Contents** 设为 **Read and write**（必需）。
   - **Metadata** 会自动设为 Read-only，保持默认即可。
4. 生成后复制令牌（以 `github_pat_` 开头）。

然后回到 `/admin/`：

1. 填写 GitHub 用户名、仓库名、分支（通常是 `main`）。
2. 粘贴 Token，点击「连接仓库」。
3. 左侧会出现文章列表。点击文章编辑，或点「新建文章」。
4. 点击「保存」后，管理台会提交一个 commit，Actions 自动重新部署。

### 管理台能做什么

- 新建 / 编辑 / 删除 Markdown 文章
- 实时 Markdown 预览（GFM）
- 工具栏：标题、加粗、引用、代码块、链接、列表、表格、分隔线
- 选择图片上传到 `public/images/`，自动插入 Markdown
- 设置标签、摘要、发布日期、封面图、草稿状态
- `Ctrl/Cmd + S` 快速保存
- 未保存修改提醒、删除二次确认
- 保存后直接跳转 GitHub Actions 查看部署进度

### 安全说明

- Token 只保存在**当前浏览器的 localStorage / sessionStorage**，不会写入仓库，也不会发送到 GitHub 以外的服务器。
- 公共电脑上请取消勾选「在这台设备上记住令牌」，用完点「退出并清除令牌」。
- Token 只授予这一个仓库的 Contents 读写权限；不要使用 classic token 的 `repo` 全权限。
- 如果怀疑泄露，立刻到 GitHub 设置中撤销并重新生成。
- `/admin/` 页面加了 `noindex`，但真正的安全边界是 Token 权限，不是“页面藏起来”。

## 写文章的两种方式

### 方式一：管理台

见上文。适合日常更新。

### 方式二：直接编辑 Markdown

在 `src/content/posts/` 下新建 `.md` 文件，文件名就是 URL 里的 slug：

```markdown
---
title: '文章标题'
description: '一句话摘要，会显示在列表和搜索结果里'
pubDate: 2026-11-19
updatedDate: 2026-11-20
tags: ['技术', '随笔']
draft: false
cover: '/images/cover.jpg'
---

正文从这里开始。

## 小标题

支持 GFM：**加粗**、`行内代码`、列表、表格、引用、代码块……
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `description` | 否 | 摘要；留空时列表不显示摘要 |
| `pubDate` | 是 | 发布日期，`YYYY-MM-DD` |
| `updatedDate` | 否 | 最后更新日期 |
| `tags` | 否 | 标签数组 |
| `draft` | 否 | `true` 时生产构建不发布，开发环境可见 |
| `cover` | 否 | 封面图，`/images/...` 或完整 URL |

图片放到 `public/images/`，Markdown 里写 `/images/图片名.png`。构建时会自动适配 GitHub Pages 子路径。

## 常用配置

### 站点名称、作者、简介

编辑 `src/lib/site.ts`：

```ts
export const SITE = {
  title: '白雲札記',
  description: '记录技术、阅读与生活里值得留下的片段。',
  author: '白雲',
  since: 2026,
  // ...
};
```

页头、页脚、RSS、SEO 元信息都会跟着变。

### 关于页

直接编辑 `src/pages/about.md`。

### 社交分享图 / 图标

- `public/og.png`：1200×630 的分享图。
- `public/favicon.svg`、`public/apple-touch-icon.png`：站点图标。

想换成自己的名字或配色，修改 `scripts/generate-assets.py` 后运行：

```bash
python scripts/generate-assets.py
```

需要 Pillow（`pip install Pillow`）。图片已经提交，不运行也没关系。

### 自定义域名

1. 在仓库 **Settings → Pages → Custom domain** 填入域名。
2. 在 `public/CNAME` 新建文件，内容写你的域名（例如 `blog.example.com`）。
3. 按 GitHub 文档配置 DNS（A 记录或 CNAME）。
4. 重新推送。使用自定义域名后站点在根路径，`BASE_PATH` 会自动为空。

## 项目结构

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages 自动部署
├── public/
│   ├── images/                    # 上传的图片
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   └── og.png
├── scripts/generate-assets.py     # 生成分享图和图标（可选）
├── src/
│   ├── components/                # Header / Footer / 文章卡片 / 目录
│   ├── content.config.ts          # 文章 frontmatter 校验
│   ├── content/posts/             # 所有文章（Markdown）
│   ├── layouts/                   # 全站布局、普通页面布局
│   ├── lib/                       # 站点配置、文章工具、路径前缀插件
│   ├── pages/
│   │   ├── admin/                 # 在线管理台
│   │   ├── posts/[...slug].astro  # 文章详情
│   │   ├── tags/                  # 标签页
│   │   ├── index.astro            # 首页
│   │   ├── about.md               # 关于页
│   │   ├── rss.xml.ts
│   │   ├── sitemap.xml.ts
│   │   └── robots.txt.ts
│   ├── scripts/                   # 管理台 / 主题切换脚本
│   └── styles/                    # 全站样式、管理台样式
├── astro.config.mjs
├── pnpm-workspace.yaml
└── package.json
```

## 常见问题

### Actions 构建失败

先在本地复现：

```bash
pnpm install
pnpm build
```

常见原因：

- Node 版本太低（Actions 里固定 Node 22）。
- 没有提交 `pnpm-lock.yaml`，导致 `--frozen-lockfile` 失败。
- 文章 frontmatter 不符合 `src/content.config.ts` 的 schema（例如日期写错、`tags` 不是数组）。
- 图片太大导致仓库或构建异常。

### 部署后页面没有样式 / 404

- 确认 **Settings → Pages → Source** 是 **GitHub Actions**。
- 不要手动在 `astro.config.mjs` 里写死仓库名；工作流会自动传 `BASE_PATH`。
- 首次部署后等待 Actions 完成，再强制刷新页面。

### 管理台提示 404 / 403

- 404：仓库名、用户名或分支写错，或者 Token 没有授权这个仓库。
- 403：Token 没有 **Contents: Read and write** 权限，或触发了 GitHub 限流。
- 401：Token 过期或被撤销，重新生成一个。

### 中文 slug 变成 `%E4%B8%80...`

中文 slug 在 URL 中会被浏览器编码，这是正常的，页面可以访问。如果希望 URL 更短，建议在新建文章时把 slug 手动改成英文，例如 `hello-world`。**slug 创建后不能在管理台修改**，否则文章地址会变。

### 私有仓库可以吗

可以，但 GitHub Pages 对私有仓库的托管通常需要 GitHub Pro；管理台的 Token 也需要该仓库的 Contents 权限。

### 我用的不是 GitHub，是 Gitee

静态页面本身可以部署到任何静态托管。但这个管理台调用的是 **GitHub Contents API**，如果部署到 Gitee Pages，需要把 `src/scripts/admin.ts` 里的 API 层改成 Gitee 的接口（并且 Gitee Pages 的自动部署机制也不同）。建议先用 GitHub Pages。

### 内容备份

所有文章都在 Git 历史里。误删文章可以用 `git log` / `git revert` 找回，也可以在 GitHub 网页上查看历史版本。

## 命令速查

```bash
pnpm dev       # 本地开发（http://localhost:4321）
pnpm build     # 构建到 dist/
pnpm preview   # 预览构建结果
```

---

内容归作者所有，代码可以随意修改。祝写作愉快。
