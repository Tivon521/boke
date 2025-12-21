#!/usr/bin/env node
/**
 * Run Cloudflare Pages local dev server for dist/ (wrangler pages dev).
 *
 * Usage:
 *   npm run build
 *   npm run cf:dev
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dist = path.join(process.cwd(), "dist");
if (!fs.existsSync(dist)) {
  console.error("❌ 找不到 dist/。请先运行：npm run build");
  process.exit(1);
}

try {
  execSync(`wrangler pages dev ${dist}`, { stdio: "inherit" });
} catch (e) {
  process.exit(e?.status || 1);
}
