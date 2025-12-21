#!/usr/bin/env node
/**
 * Cloudflare Pages direct upload (wrangler) helper.
 *
 * Usage:
 *   npm run build
 *   npm run deploy:cf
 *
 * Optional:
 *   CF_PROJECT=my-project npm run deploy:cf
 *   CF_BRANCH=main npm run deploy:cf
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function cleanName(n) {
  return String(n || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getDefaultProjectName() {
  // Prefer env override
  if (process.env.CF_PROJECT) return cleanName(process.env.CF_PROJECT);

  // Try package.json name
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    if (pkg && pkg.name) return cleanName(pkg.name);
  } catch {}

  // Fallback to folder name
  return cleanName(path.basename(process.cwd()));
}

const project = getDefaultProjectName();
if (!project) {
  console.error("❌ 无法推断 Cloudflare Pages 项目名。请设置环境变量 CF_PROJECT。");
  process.exit(1);
}

const dist = path.join(process.cwd(), "dist");
if (!fs.existsSync(dist)) {
  console.error("❌ 找不到 dist/。请先运行：npm run build");
  process.exit(1);
}

const branch = process.env.CF_BRANCH ? String(process.env.CF_BRANCH) : "";
const branchArg = branch ? ` --branch ${branch}` : "";

try {
  execSync(`wrangler pages deploy ${dist} --project-name ${project}${branchArg}`, {
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e?.status || 1);
}
