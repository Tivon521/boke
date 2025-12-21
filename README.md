# 杂志风博客（含后台 + 一键部署）

## 你得到了什么
- `build.js`：把 `posts/*.md` 生成到 `dist/`（首页时间线/归档/标签/RSS/上一篇下一篇）
- `/admin/`：Decap CMS 后台界面（静态站可用）
- GitHub Actions：push 到 main 自动部署到 GitHub Pages（自动处理 BASE_PATH）

---

## 1) 本地运行
```bash
npm i
npm run build
npm run dev
```

---

## 2) 一键部署到 GitHub Pages
1. 把整个项目推到 GitHub（默认分支 main）
2. 到仓库 Settings → Pages
   - Build and deployment → Source 选择 **GitHub Actions**
3. 再 push 一次，Actions 跑完后就会发布

> 项目站（/repo）和主页站（/）都会自动处理 BASE_PATH

---

## 3) 后台管理（Decap CMS）
访问：`/admin/`

### 重要：GitHub 登录需要 OAuth 代理
你需要部署一个 OAuth proxy，然后把 `admin/config.yml` 里的：
- `repo`
- `base_url`
- `auth_endpoint`
改成你自己的。

（最省事的替代方案：把站点托管到 Netlify，用 git-gateway。）

---

## 4) 写文章
在 `posts/` 新建 Markdown：

```md
---
title: 标题
date: 2025-12-19
tags: [日常, 读书]
minutes: 3
summary: 一句话摘要
thumb: https://.../image.jpg
coverHue: 210
issueNote: "Issue Notes：本月一句话"
featured: true
---

正文...
```


---

## Cloudflare Pages（可选）
如果你想部署到 Cloudflare Pages：请看 `CLOUDFLARE.md`。
