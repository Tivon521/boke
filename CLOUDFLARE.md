# Cloudflare Pages 部署（可选）

你可以把这个博客部署到 **Cloudflare Pages**（不依赖 GitHub Pages），两种方式：

- A) Dashboard 连接 Git（推荐）
- B) Wrangler 直接上传 dist（更像“一键部署”）

---

## A) 用 Cloudflare Pages Dashboard（连接 GitHub）
1. Cloudflare 控制台 → **Workers & Pages → Pages → Create a project → Connect to Git**
2. 选择你的仓库后，设置构建参数（本项目是纯静态输出）：

- **Build command**：`npm run build`
- **Build output directory**：`dist`

Cloudflare Pages 的构建命令和输出目录就是在这里配置。citeturn0search0

### Node 版本
如果你需要指定 Node 版本，可以在 Pages 的构建设置里加环境变量（例如 `NODE_VERSION=20`）。citeturn0search23

### BASE_PATH
Cloudflare Pages 的站点一般是根路径（`/`），所以 `BASE_PATH` 通常留空即可。

---

## B) 用 Wrangler 直接上传（“命令行一键部署”）
Cloudflare Pages 官方支持 **Direct Upload**（先本地 build 出 dist，然后 wrangler 上传）。citeturn1search6

### 1) 安装 Wrangler 并登录
```bash
npm i -g wrangler
wrangler login
```
Wrangler 是 Cloudflare 的官方 CLI。citeturn1search3

### 2) 本地构建
```bash
npm i
npm run build
```

### 3) 创建 Pages 项目（首次）
```bash
wrangler pages project create <project-name>
```

### 4) 上传 dist
```bash
wrangler pages deploy dist --project-name <project-name>
```
Direct Upload 的流程和 `wrangler pages deploy` 在 Cloudflare Pages 文档里有说明。citeturn1search6

---

## /admin 后台登录（重要）
Decap CMS 的 GitHub backend 需要 OAuth 代理（要处理 `/auth` 和 `/callback`）。citeturn0search5turn0search13

如果你想把 OAuth 代理也放在 Cloudflare 上：
- 可以用社区维护的 Cloudflare Worker 方案（例如 `decap-proxy`）。citeturn0search1turn0search24

配置完成后，修改 `admin/config.yml`：
- `repo: <你的用户名>/<仓库名>`
- `base_url: https://<你的 OAuth proxy 域名>`
- `auth_endpoint: auth`

---

## 本地写作（无需 OAuth）
Decap 支持 `local_backend: true`，本地运行 `npx decap-server` 即可在 localhost 下写作。citeturn0search2turn0search6

---

## 一行命令发布（已内置脚本）
项目里已内置脚本，会自动用以下顺序推断 Cloudflare Pages 项目名：
1) 环境变量 `CF_PROJECT`
2) `package.json` 的 `name`
3) 当前文件夹名

### 发布
```bash
npm run build
npm run deploy:cf
```

### 指定项目名 / 分支
macOS / Linux：
```bash
CF_PROJECT=my-blog CF_BRANCH=main npm run deploy:cf
```

Windows PowerShell：
```powershell
$env:CF_PROJECT="my-blog"; $env:CF_BRANCH="main"; npm run deploy:cf
```
