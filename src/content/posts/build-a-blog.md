---
title: 这个博客是怎么搭起来的
description: 一次没有后端的博客实践：Astro 生成静态页面，GitHub Pages 托管，浏览器管理台直接提交 Markdown。
pubDate: 2026-10-26
tags: ['技术', 'Astro', 'GitHub']
draft: false
---

这个博客没有服务器，没有数据库，也没有每个月要续费的空间。它由三部分组成：

1. **Astro**：把 Markdown 编译成静态 HTML。
2. **GitHub 仓库**：存放文章和代码，也是唯一的内容来源。
3. **GitHub Pages**：托管构建产物，免费提供 HTTPS 和自定义域名。

在线编辑则由站点里的管理台完成。它调用 GitHub 的 Contents API，把修改直接提交成一次 commit，然后触发 GitHub Actions 重新构建。

## 一次“发布”发生了什么

```text
浏览器管理台
   │  写入 Markdown
   ▼
GitHub 仓库（main 分支）
   │  push 触发
   ▼
GitHub Actions：pnpm build
   │  生成 dist/
   ▼
GitHub Pages
```

从点击“保存”到线上可见，通常需要一到两分钟。这段时间里，GitHub Actions 会重新安装依赖、构建页面并部署。

## 为什么不用数据库

博客的内容本质上是文本。文本最适合放在 Git 里：有版本历史，可以回滚，可以本地搜索，也不会因为某个服务停止运营而消失。

管理台只是一个“更好用的文本编辑器”。它不保存内容，只负责把内容提交回仓库。即使管理台坏了，文章仍然在仓库里，用任何编辑器都能改。

## 关键配置

部署工作流里，`BASE_PATH` 会根据仓库名自动计算，所以项目站点（`https://用户名.github.io/仓库名/`）不需要手动改路径：

```yaml
- id: pages
  uses: actions/configure-pages@v5

- run: pnpm build
  env:
    BASE_PATH: ${{ steps.pages.outputs.base_path }}
    PUBLIC_REPO_OWNER: ${{ github.repository_owner }}
    PUBLIC_REPO_NAME: ${{ github.event.repository.name }}
```

文章里的站内绝对路径（例如 `/images/photo.jpg`）会在构建时自动加上仓库前缀，Markdown 里不用关心部署路径。

## 安全边界

管理台使用一个细粒度的 GitHub Token，只授予目标仓库的 **Contents: Read and write** 权限。Token 保存在浏览器本地，不会写进仓库，也不经过任何第三方服务器。

这意味着：

- 不要勾选“记住令牌”后使用公共电脑。
- Token 一旦泄露，立刻到 GitHub 设置里撤销并重新生成。
- 管理台页面加了 `noindex`，但真正的安全边界是 Token 权限，不是页面隐藏。

## 接下来

这套结构足够支撑很长一段时间的写作。以后可能会加的：全文搜索、图片压缩、评论系统（如果真的需要）、定时发布。

但这些都是以后的事。现在最重要的，是先把下一篇写出来。
