# 安装与部署（GitHub Pages 版）

这份教程对应：**GitHub Pages + GitHub Actions（本仓库已内置工作流）**。

---

## 1) 环境准备
- Node.js 20（建议 LTS）
- Git
- GitHub 账号

---

## 2) 本地运行（先看效果）
在项目根目录执行：

```bash
npm i
npm run build
npm run dev
```

打开终端提示的本地地址即可预览。

> 也可以用：
```bash
npm run preview
# http://localhost:8080
```

---

## 3) 配置站点信息（非常建议）
打开 `build.js` 顶部的 `SITE`，修改：

- `siteUrl`：
  - GitHub Pages 项目站：`https://<用户名>.github.io`
  - 或你的自定义域名（例如 `https://example.com`）
- `title` / `description` / `author` / `email`

---

## 4) 写文章
在 `posts/` 里新建 Markdown，例如 `posts/2025-12-19-hello.md`：

```md
---
title: Hello
date: 2025-12-19
tags: [日常]
minutes: 2
summary: 我开始写博客了。
featured: true
coverHue: 210
issueNote: "Issue Notes：新的一期开始。"
---

正文从这里开始……
```

然后：

```bash
npm run build
```

---

## 5) 一键部署到 GitHub Pages（本项目推荐方式）
### 5.1 推送到 GitHub
新建仓库（默认分支 main），然后在本地：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

### 5.2 开启 GitHub Pages 的 Actions 发布源
进入仓库：
- **Settings → Pages**
- **Build and deployment → Source** 选择 **GitHub Actions** citeturn0search1turn0search9

然后再 push 一次（或在 Actions 页面手动运行 workflow）。

### 5.3 访问地址
- 如果仓库名是：`<用户名>.github.io` → 站点根路径 `/`
- 否则（项目站）→ `https://<用户名>.github.io/<仓库名>/`

> 本仓库 Actions 会自动判断并设置 BASE_PATH，避免 CSS/资源路径 404。citeturn0search0turn0search4

---

## 6) 后台管理（/admin）
部署后访问：`https://你的站点/admin/`

### 6.1 本地写作（无需登录）
本项目已在 `admin/config.yml` 开了 `local_backend: true`，你可以在本地用 Decap 的本地模式编辑内容：citeturn0search3

```bash
npx decap-server
```

然后打开你的本地站点 `/admin/`。

### 6.2 线上写作（GitHub Pages 上登录）
如果你希望线上也能登录后台并直接写文章：
- Decap CMS 的 GitHub backend **需要一个 OAuth Proxy**（单独部署在另一个域名/子域名），并处理 `/auth` 与 `/callback` 等路径。citeturn0search2turn0search10

你要做：
1) 在 GitHub 创建 OAuth App  
2) 部署 OAuth Proxy（示例：Cloudflare Worker 版本的社区实现 `decap-proxy`）citeturn0search6  
3) 修改 `admin/config.yml` 里的：
   - `repo: <你的用户名>/<仓库名>`
   - `base_url: https://<你的 OAuth Proxy 域名>`
   - `auth_endpoint: auth`

> 如果你想“最省事”的线上后台登录方案，通常会选择 Netlify 的 git-gateway（但那就不是 GitHub Pages 托管了）。

---

## 7) 常见问题
### 7.1 我部署到项目站，页面资源 404
确认你是用本仓库的 GitHub Actions 部署，并且 Pages Source 是 GitHub Actions。citeturn0search1turn0search0

### 7.2 我直接双击 dist/index.html 看起来不对
请用本地 server 预览（`npm run dev` / `npm run preview`），不要 file:// 方式打开。

### 7.3 图片怎么管理
- 推荐放 `uploads/`，在文章里用 `/uploads/xxx.jpg`
- 构建时会复制到 `dist/uploads/`（已内置）
