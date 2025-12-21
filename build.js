// build.js
// Minimal SSG (Markdown + frontmatter) -> dist/
// Features: Home timeline + featured, posts, tags, archive, RSS, prev/next, BASE_PATH for GitHub Pages
// Extras: copies /admin and /uploads into dist for Decap CMS admin UI.
//
// Run:
//   npm run build
//   BASE_PATH=/repo npm run build

const path = require("path");
const fs = require("fs-extra");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const dayjs = require("dayjs");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// ====== Site Config (edit me) ======
const SITE = {
  title: "梦开始的地方",
  description: "记录日常生活的小事、心情与成长。",
  siteUrl: "https://example.com", // e.g. https://username.github.io or https://yourdomain.com
  author: "you",
  email: "you@example.com",
};
// ===================================

// BASE_PATH: "" or "/repo-name"
function normalizeBase(input) {
  let b = String(input || "").trim();
  if (!b) return "";
  if (!b.startsWith("/")) b = "/" + b;
  b = b.replace(/\/+$/g, "");
  return b;
}
const BASE_PATH = normalizeBase(process.env.BASE_PATH);

// Prefix internal absolute paths with base
function href(p) {
  const s = String(p || "");
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) return BASE_PATH + "/" + s;
  return BASE_PATH + s;
}

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "posts");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(DIST, "assets");
const POSTS_OUT = path.join(DIST, "posts");
const TAGS_OUT = path.join(DIST, "tags");
const ARCHIVE_OUT = path.join(DIST, "archive");

const slugify = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

function ensureArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function escHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escXml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rfc822(dateISO) {
  const d = new Date(dateISO + "T00:00:00Z");
  return d.toUTCString();
}

function readAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(POSTS_DIR, f));

  const posts = files.map((fp) => {
    const raw = fs.readFileSync(fp, "utf8");
    const { data, content } = matter(raw);

    const date = data.date ? dayjs(data.date) : dayjs();
    const title = data.title || path.basename(fp, ".md");
    const tags = ensureArray(data.tags);
    const minutes = data.minutes || "";
    const summary = data.summary || "";
    const thumb = data.thumb || "";
    const coverHue = Number.isFinite(Number(data.coverHue)) ? Number(data.coverHue) : null;
    const issueNote = data.issueNote || "";
    const featured = !!data.featured;

    const slug = data.slug ? slugify(data.slug) : slugify(`${date.format("YYYY-MM-DD")}-${title}`);
    const html = md.render(content);

    const url = href(`/posts/${slug}/`);

    return {
      title,
      dateISO: date.format("YYYY-MM-DD"),
      monthKey: date.format("YYYY-MM"),
      monthLabel: date.format("YYYY · MM"),
      tags,
      minutes,
      summary,
      thumb,
      coverHue,
      issueNote,
      featured,
      slug,
      url,
      bodyHtml: html,
    };
  });

  posts.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  return posts;
}

function buildPrevNext(posts) {
  const map = new Map();
  posts.forEach((p, i) => {
    const newer = i > 0 ? posts[i - 1] : null; // 下一篇（更新）
    const older = i < posts.length - 1 ? posts[i + 1] : null; // 上一篇（更旧）
    map.set(p.slug, { newer, older });
  });
  return map;
}

function groupByMonth(posts) {
  const map = new Map();
  for (const p of posts) {
    if (!map.has(p.monthKey)) map.set(p.monthKey, []);
    map.get(p.monthKey).push(p);
  }
  const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  return keys.map((k) => ({
    monthKey: k,
    monthLabel: dayjs(k + "-01").format("YYYY · MM"),
    items: map.get(k),
  }));
}

function groupByTag(posts) {
  const map = new Map(); // tag -> posts
  for (const p of posts) {
    for (const t of p.tags || []) {
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(p);
    }
  }
  const tags = Array.from(map.keys()).sort((a, b) => String(a).localeCompare(String(b), "zh-Hans-CN"));
  return { map, tags };
}

function writeAssets() {
  fs.ensureDirSync(ASSETS);

  const css = `
:root{--bg:#fcfcfd;--card:#fff;--text:#111827;--muted:#6b7280;--border:#e5e7eb;--accent:#2563eb;--max:980px;--r:16px;--s1:8px;--s2:16px;--s3:24px;--s4:32px;--s5:48px;--s6:64px;}
:root[data-theme="dark"]{--bg:#0b0f19;--card:#111827;--text:#e5e7eb;--muted:#9ca3af;--border:#1f2937;--accent:#60a5fa;}
*{box-sizing:border-box;} html{scroll-behavior:smooth;}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;font-size:17px;line-height:1.85;text-rendering:optimizeLegibility;}
a{color:inherit;text-decoration:none;} .container{max-width:var(--max);margin:0 auto;padding:0 var(--s2);}

.topbar{position:sticky;top:0;z-index:30;backdrop-filter:saturate(180%) blur(12px);background:color-mix(in srgb,var(--bg) 75%,transparent);border-bottom:1px solid color-mix(in srgb,var(--border) 65%,transparent);}
.topbar .row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;gap:12px;}
.brand{display:flex;align-items:baseline;gap:10px;font-weight:750;letter-spacing:.2px;}
.brand small{font-weight:600;font-size:12px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;}
.nav{display:flex;align-items:center;gap:14px;}
.nav a{font-size:14px;color:var(--muted);} .nav a:hover{color:var(--text);}
.toggle{width:34px;height:34px;border-radius:12px;border:1px solid var(--border);background:var(--card);display:grid;place-items:center;font-size:14px;cursor:pointer;user-select:none;}

.hero{padding:var(--s6) 0 var(--s5);display:grid;grid-template-columns:1fr;gap:var(--s4);align-items:end;}
@media(min-width:900px){.hero{grid-template-columns:1.25fr .75fr;}}
.hero h1{margin:0;font-size:46px;line-height:1.05;letter-spacing:.2px;}
.hero p{margin:14px 0 0;color:color-mix(in srgb,var(--text) 70%,var(--muted));font-size:16px;line-height:1.75;max-width:46ch;}
.hero-actions{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;justify-content:center;height:38px;padding:0 14px;border-radius:14px;border:1px solid var(--border);background:var(--card);font-size:14px;color:var(--text);cursor:pointer;user-select:none;}
.btn.primary{border-color:color-mix(in srgb,var(--accent) 35%,var(--border));background:color-mix(in srgb,var(--accent) 10%,var(--card));}
.btn.ghost{color:var(--muted);background:transparent;} .btn.ghost:hover{color:var(--text);}
.mark{border:1px solid var(--border);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 18%,var(--card)),var(--card));border-radius:26px;min-height:180px;display:flex;padding:18px;position:relative;overflow:hidden;}
.mark::before{content:"";position:absolute;inset:-40px;background:radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 55%);transform:rotate(12deg);}
.mark .label{position:relative;margin-top:auto;display:flex;flex-direction:column;gap:6px;}
.label .k{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);}
.label .v{font-size:14px;color:color-mix(in srgb,var(--text) 86%,var(--muted));line-height:1.6;}

.section{padding:var(--s5) 0;border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent);}
.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:var(--s3);}
.section-head h2{margin:0;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.seg{display:inline-flex;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--card) 92%,transparent);}
.seg button{height:34px;padding:0 12px;border:none;background:transparent;color:var(--muted);font-size:13px;cursor:pointer;}
.seg button:hover{color:var(--text);}
.seg button.active{background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--text);border-left:1px solid color-mix(in srgb,var(--accent) 18%,var(--border));border-right:1px solid color-mix(in srgb,var(--accent) 18%,var(--border));}

.timeline{display:grid;grid-template-columns:1fr;gap:22px;}
@media(min-width:900px){.timeline{grid-template-columns:1fr 1fr;gap:18px 18px;}}
.group{border:1px solid var(--border);background:var(--card);border-radius:var(--r);overflow:hidden;}
.mcover{height:56px;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:12px 16px;}
.mcover::after{content:"";position:absolute;inset:-40px;background:radial-gradient(circle at 28% 35%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%);transform:rotate(10deg);opacity:.95;}
.mcover .mtext{position:relative;display:flex;flex-direction:column;gap:4px;min-width:0;}
.mcover .label{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--text) 55%,var(--muted));}
.mcover .note{font-size:13px;color:color-mix(in srgb,var(--text) 82%,var(--muted));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:68ch;}

.group-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:14px 16px;}
.group-left{display:flex;flex-direction:column;gap:8px;min-width:0;}
.gtitle{display:flex;align-items:baseline;gap:10px;min-width:0;}
.group-head b{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);white-space:nowrap;}
.count{font-size:12px;color:var(--muted);white-space:nowrap;}
.gsum{display:none;font-size:13px;line-height:1.6;color:color-mix(in srgb,var(--text) 72%,var(--muted));max-width:60ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.group[data-collapsed="true"] .gsum{display:block;}
.gbtn{width:34px;height:34px;border-radius:12px;border:1px solid var(--border);background:color-mix(in srgb,var(--card) 92%,transparent);display:grid;place-items:center;cursor:pointer;user-select:none;}
.chev{display:block;width:10px;height:10px;border-right:2px solid color-mix(in srgb,var(--text) 70%,var(--muted));border-bottom:2px solid color-mix(in srgb,var(--text) 70%,var(--muted));transform:rotate(45deg);transition:transform .14s ease;}
.group[data-collapsed="true"] .chev{transform:rotate(-45deg);}
.group-body{overflow:hidden;height:auto;transition:height .22s ease;border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent);}
.group-body-inner{padding:12px 16px 14px;}

.subhead{margin:12px 0 6px;display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.subhead b{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);}
.subhead span{font-size:12px;color:var(--muted);white-space:nowrap;}
.subline{height:1px;background:color-mix(in srgb,var(--border) 70%,transparent);margin:8px 0 10px;}

.tlist{position:relative;margin:0;padding:0 0 0 18px;list-style:none;}
.tlist::before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:1px;background:color-mix(in srgb,var(--border) 85%,transparent);}
.titem{position:relative;padding:10px 10px 10px 0;}
.titem + .titem{border-top:1px dashed color-mix(in srgb,var(--border) 75%,transparent);}
.titem::before{content:"";position:absolute;left:-18px;top:18px;width:10px;height:10px;border-radius:999px;background:color-mix(in srgb,var(--accent) 40%,var(--border));box-shadow:0 0 0 3px color-mix(in srgb,var(--bg) 80%,transparent);}
.meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:13px;margin:0;}
.pill{padding:2px 10px;border-radius:999px;border:1px solid var(--border);background:color-mix(in srgb,var(--card) 86%,transparent);font-size:12px;color:var(--muted);}
.trow{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.tdate{font-size:12px;color:var(--muted);letter-spacing:.06em;white-space:nowrap;}
.item{display:grid;grid-template-columns:0px 1fr;gap:12px;align-items:start;margin-top:8px;}
.thumb{display:none;width:112px;aspect-ratio:3/2;border-radius:14px;border:1px solid var(--border);background:color-mix(in srgb,var(--card) 92%,transparent);overflow:hidden;}
.thumb img{width:100%;height:100%;object-fit:cover;display:block;}
.titem[data-thumb="1"] .item{grid-template-columns:112px 1fr;}
.titem[data-thumb="1"] .thumb{display:block;}
.ttitle{margin:0;font-size:16px;font-weight:650;line-height:1.25;}
.tdesc{margin:7px 0 0;color:var(--muted);font-size:14px;line-height:1.7;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

.progress{position:fixed;top:0;left:0;right:0;height:2px;z-index:50;}
.progress>i{display:block;height:100%;width:0%;background:var(--accent);transition:width .06s linear;}
.article-wrap{max-width:980px;margin:0 auto;padding:calc(var(--s6) + 10px) var(--s2) var(--s6);}
.article{max-width:720px;margin:0 auto;}
.article header{padding-bottom:var(--s4);border-bottom:1px solid var(--border);margin-bottom:var(--s4);}
.article .kicker{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);}
.article h1{margin:10px 0 0;font-size:40px;line-height:1.12;}
.article .deck{margin:12px 0 0;font-size:18px;color:color-mix(in srgb,var(--text) 72%,var(--muted));line-height:1.7;}
.article .ameta{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:13px;}
.article h2{margin:1.9em 0 .6em;font-size:26px;line-height:1.25;scroll-margin-top:90px;}
.article p{margin:0 0 1.1em;}
.article blockquote{margin:1.4em 0;padding:0 0 0 16px;border-left:2px solid var(--border);color:color-mix(in srgb,var(--text) 80%,var(--muted));}
.footer{padding:var(--s6) 0;color:var(--muted);font-size:13px;border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent);margin-top:var(--s6);}
.footrow{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:var(--s4);}
.card{border:1px solid var(--border);background:var(--card);border-radius:var(--r);padding:14px 16px;}
.list{display:flex;flex-direction:column;gap:10px;}
.muted{color:var(--muted);}
`;
  fs.writeFileSync(path.join(ASSETS, "styles.css"), css, "utf8");

  const app = `
// assets/app.js
(function(){
  // theme
  const root = document.documentElement;
  const btn = document.getElementById('themeBtn');
  if (btn){
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
    function currentTheme(){
      if (root.dataset.theme) return root.dataset.theme;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function setTheme(t){
      root.dataset.theme = t;
      localStorage.setItem('theme', t);
      btn.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    btn.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  }

  // reading progress
  const bar = document.getElementById('prog');
  const article = document.getElementById('articleBody');
  if (bar && article){
    function update(){
      const rect = article.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height - vh * 0.2;
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const pct = Math.min(100, Math.max(0, (passed / Math.max(total, 1)) * 100));
      bar.style.width = pct.toFixed(2) + '%';
    }
    update();
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
  }

  // homepage timeline render (data-driven)
  const timeline = document.getElementById('timeline');
  const dataEl = document.getElementById('postsData');
  if (!timeline || !dataEl) return;

  const COLLAPSE_KEY = 'timelineCollapsed.build.v2';
  const MODE_KEY = 'timelineGroupMode.v1';

  let posts = [];
  try { posts = JSON.parse(dataEl.textContent || '[]'); } catch {}

  const months = new Map();
  for (const p of posts){
    if (!months.has(p.monthKey)) months.set(p.monthKey, []);
    months.get(p.monthKey).push(p);
  }
  const monthKeys = Array.from(months.keys()).sort((a,b)=>b.localeCompare(a));

  function weekKey(dateStr){
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '未知周';
    const day = d.getDay();
    const deltaToMon = (day + 6) % 7;
    d.setDate(d.getDate() - deltaToMon);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return \`Week of \${y}-\${m}-\${dd}\`;
  }
  function prettyWeekLabel(key){
    const m = key.match(/Week of (\\d{4})-(\\d{2})-(\\d{2})/);
    if (!m) return key;
    return \`\${m[1]} · \${m[2]}/\${m[3]} 起\`;
  }

  const seg = document.getElementById('groupMode');
  const segBtns = seg ? Array.from(seg.querySelectorAll('button[data-mode]')) : [];
  function getMode(){
    const saved = localStorage.getItem(MODE_KEY);
    return (saved === 'tag' || saved === 'week') ? saved : 'week';
  }
  function setMode(mode){
    localStorage.setItem(MODE_KEY, mode);
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    renderAll(mode);
  }
  segBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === getMode()));

  const savedCollapse = (() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }
    catch { return {}; }
  })();
  const hasAnySaved = Object.keys(savedCollapse).length > 0;

  function setCollapsed(group, collapsed, animate=true){
    const body = group.querySelector('.group-body');
    const inner = group.querySelector('.group-body-inner');
    const btn2 = group.querySelector('.gbtn');
    if (!body || !inner) return;

    group.dataset.collapsed = collapsed ? 'true' : 'false';
    if (btn2) btn2.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

    if (!animate){
      body.style.height = collapsed ? '0px' : 'auto';
      return;
    }

    const isAuto = body.style.height === '' || body.style.height === 'auto';
    const start = isAuto ? body.getBoundingClientRect().height : parseFloat(body.style.height || '0');

    body.style.height = start + 'px';
    body.offsetHeight;

    if (collapsed){
      requestAnimationFrame(() => { body.style.height = '0px'; });
    } else {
      const target = inner.scrollHeight;
      requestAnimationFrame(() => { body.style.height = target + 'px'; });
      const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        body.style.height = 'auto';
        body.removeEventListener('transitionend', onEnd);
      };
      body.addEventListener('transitionend', onEnd);
    }
  }

  function buildItem(p){
    const hasThumb = !!p.thumb;
    return \`
<li class="titem" \${hasThumb ? 'data-thumb="1"' : ''}>
  <a href="\${p.url}">
    <div class="trow">
      <div class="meta">
        \${(p.tags||[]).slice(0,2).map(t=>\`<span class="pill">\${t}</span>\`).join('')}
        \${p.minutes ? \`<span class="pill">\${p.minutes} 分钟</span>\` : ''}
      </div>
      <span class="tdate">\${p.dateISO.slice(5).replace('-', '/')}</span>
    </div>
    <div class="item">
      <div class="thumb">\${hasThumb ? \`<img alt="" src="\${p.thumb}"/>\` : '<img alt=""/>'}</div>
      <div>
        <div class="ttitle">\${p.title}</div>
        <div class="tdesc">\${p.summary || ''}</div>
      </div>
    </div>
  </a>
</li>\`;
  }

  function renderGroupItems(items, mode){
    const buckets = new Map();
    for (const p of items){
      const key = (mode === 'tag') ? ((p.tags && p.tags[0]) || '未分类') : weekKey(p.dateISO);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p);
    }

    const keys = Array.from(buckets.keys());
    if (mode === 'week'){
      keys.sort((a,b)=>{
        const da = a.match(/(\\d{4}-\\d{2}-\\d{2})/)?.[1] || '0000-00-00';
        const db = b.match(/(\\d{4}-\\d{2}-\\d{2})/)?.[1] || '0000-00-00';
        return db.localeCompare(da);
      });
    } else {
      keys.sort((a,b)=> String(a).localeCompare(String(b),'zh-Hans-CN'));
    }

    return keys.map(k=>{
      const arr = buckets.get(k) || [];
      return \`
<div class="subhead">
  <b>\${mode === 'tag' ? k : prettyWeekLabel(k)}</b>
  <span>\${arr.length} 篇</span>
</div>
<div class="subline"></div>
<ul class="tlist">\${arr.map(buildItem).join('')}</ul>\`;
    }).join('');
  }

  function renderAll(mode){
    timeline.innerHTML = '';

    const blocks = monthKeys.map((mk, idx)=>{
      const items = months.get(mk) || [];
      const first = items[0] || {};
      const monthLabel = first.monthLabel || mk.replace('-',' · ');
      const count = items.length;

      const hue = Number.isFinite(Number(first.coverHue)) ? Number(first.coverHue) : null;
      const issueNote = first.issueNote || 'Issue Notes：本月写一点点，慢慢变厚。';

      const collapsed = hasAnySaved ? !!savedCollapse[mk] : idx >= 2;

      const coverStyle = hue === null ? '' : \`style="background: linear-gradient(135deg, hsla(\${hue},82%,62%,.22), hsla(\${hue},60%,45%,.08), var(--card))"\`;

      return \`
<div class="group" data-collapsed="\${collapsed ? 'true':'false'}">
  <div class="mcover" \${coverStyle}>
    <div class="mtext">
      <div class="label">Issue Notes</div>
      <div class="note">\${issueNote}</div>
    </div>
  </div>
  <div class="group-head">
    <div class="group-left">
      <div class="gtitle"><b>\${monthLabel}</b><span class="count">\${count} 篇</span></div>
    </div>
    <div class="gbtn" role="button" tabindex="0" aria-label="toggle month" aria-expanded="\${collapsed ? 'false':'true'}">
      <span class="chev" aria-hidden="true"></span>
    </div>
  </div>
  <div class="group-body" style="height:\${collapsed ? '0px' : 'auto'}">
    <div class="group-body-inner">
      <div class="render">\${renderGroupItems(items, mode)}</div>
    </div>
  </div>
</div>\`;
    }).join('');

    timeline.insertAdjacentHTML('beforeend', blocks);

    const gEls = Array.from(timeline.querySelectorAll('.group'));
    gEls.forEach((g, i)=>{
      const btn3 = g.querySelector('.gbtn');
      const toggle = ()=>{
        const now = g.dataset.collapsed === 'true';
        setCollapsed(g, !now, true);
        savedCollapse[monthKeys[i]] = !now;
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(savedCollapse));
      };
      btn3?.addEventListener('click', toggle);
      btn3?.addEventListener('keydown', (e)=>{ if (e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); }});
    });

    document.getElementById('expandAll')?.addEventListener('click', ()=>{
      gEls.forEach((g, i)=>{ setCollapsed(g,false,true); savedCollapse[monthKeys[i]]=false; });
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(savedCollapse));
    }, { once:true });

    document.getElementById('collapseAll')?.addEventListener('click', ()=>{
      gEls.forEach((g, i)=>{ setCollapsed(g,true,true); savedCollapse[monthKeys[i]]=true; });
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(savedCollapse));
    }, { once:true });
  }

  renderAll(getMode());
})();`;

  fs.writeFileSync(path.join(ASSETS, "app.js"), app, "utf8");
}

function layout({ title, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="zh-CN" data-base="${escHtml(BASE_PATH)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escHtml(title)}</title>
  <link rel="stylesheet" href="${href("/assets/styles.css")}" />
  ${extraHead}
</head>
<body>
  <div class="topbar">
    <div class="container">
      <div class="row">
        <div class="brand">${escHtml(SITE.title)} <small>journal</small></div>
        <div class="nav">
          <a href="${href("/")}">首页</a>
          <a href="${href("/archive/")}">归档</a>
          <a href="${href("/tags/")}">标签</a>
          <a href="${href("/admin/")}">后台</a>
          <a href="${href("/rss.xml")}">RSS</a>
          <button class="toggle" id="themeBtn" aria-label="toggle theme">🌙</button>
        </div>
      </div>
    </div>
  </div>
  ${body}
  <script src="${href("/assets/app.js")}"></script>
</body>
</html>`;
}

function renderPostCard(p) {
  const tag = (p.tags && p.tags[0]) ? `<span class="pill">${escHtml(p.tags[0])}</span>` : "";
  const min = p.minutes ? `<span class="pill">${escHtml(String(p.minutes))} 分钟</span>` : "";
  return `
<div class="card">
  <div class="muted" style="font-size:13px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
    <span>${escHtml(p.dateISO)}</span>${tag}${min}
  </div>
  <div style="margin-top:6px;font-size:18px;font-weight:650;line-height:1.25;">
    <a href="${p.url}">${escHtml(p.title)}</a>
  </div>
  ${p.summary ? `<div class="muted" style="margin-top:8px;font-size:14px;line-height:1.7;">${escHtml(p.summary)}</div>` : ""}
</div>`;
}

function renderIndex(posts) {
  const featured = posts.filter(p => p.featured).slice(0, 3);
  const picked = featured.length ? featured : posts.slice(0, 3);

  const postsJson = JSON.stringify(posts.map(p => ({
    title: p.title,
    dateISO: p.dateISO,
    monthKey: p.monthKey,
    monthLabel: p.monthLabel,
    tags: p.tags,
    minutes: p.minutes,
    summary: p.summary,
    thumb: p.thumb,
    coverHue: p.coverHue,
    issueNote: p.issueNote,
    url: p.url,
  })));

  const body = `
<main class="container">
  <section class="hero">
    <div>
      <h1>${escHtml(SITE.title)}</h1>
      <p>${escHtml(SITE.description)}</p>
      <div class="hero-actions">
        <a class="btn primary" href="${posts[0] ? posts[0].url : "#"}">阅读最新</a>
        <a class="btn" href="${href("/archive/")}">归档</a>
        <a class="btn" href="${href("/tags/")}">标签</a>
        <a class="btn" href="${href("/admin/")}">后台写作</a>
      </div>
    </div>
    <div class="mark" aria-hidden="true">
      <div class="label">
        <div class="k">Today</div>
        <div class="v">写一点点，就会留下来。<br/>留白也算内容。</div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>精选</h2>
      <div class="controls">
        <a class="btn ghost" href="${href("/archive/")}">全部 →</a>
      </div>
    </div>
    <div class="list">${picked.map(renderPostCard).join("")}</div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>时间线</h2>
      <div class="controls">
        <div class="seg" id="groupMode">
          <button type="button" data-mode="week">按周</button>
          <button type="button" data-mode="tag">按标签</button>
        </div>
        <button class="btn ghost" id="expandAll" type="button">展开全部</button>
        <button class="btn ghost" id="collapseAll" type="button">收起全部</button>
      </div>
    </div>

    <script type="application/json" id="postsData">${postsJson}</script>
    <div class="timeline" id="timeline"></div>
  </section>

  <footer class="footer">
    <div class="footrow">
      <div>© ${new Date().getFullYear()} ${escHtml(SITE.title)} · ${escHtml(SITE.author)}</div>
      <div>${escHtml(SITE.email)}</div>
    </div>
  </footer>
</main>`;

  return layout({ title: SITE.title, body });
}

function renderPost(post, nav) {
  const tagPills = (post.tags || []).map(t => `<span class="pill">${escHtml(t)}</span>`).join("");
  const newer = nav?.newer ? `<a class="btn" href="${nav.newer.url}">下一篇（更新）</a>` : "";
  const older = nav?.older ? `<a class="btn" href="${nav.older.url}">上一篇（更旧）</a>` : "";

  const body = `
<div class="progress" aria-hidden="true"><i id="prog"></i></div>
<main class="article-wrap">
  <article class="article">
    <header>
      <div class="kicker">Journal · Daily</div>
      <h1>${escHtml(post.title)}</h1>
      ${post.summary ? `<p class="deck">${escHtml(post.summary)}</p>` : ""}
      <div class="ameta">
        <span>${escHtml(post.dateISO)}</span>
        ${tagPills}
        ${post.minutes ? `<span>${escHtml(String(post.minutes))} 分钟</span>` : ""}
      </div>
    </header>

    <div id="articleBody">${post.bodyHtml}</div>

    <div style="margin-top:40px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${older}
        ${newer}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a class="btn ghost" href="${href("/archive/")}">归档</a>
        <a class="btn ghost" href="${href("/tags/")}">标签</a>
        <a class="btn ghost" href="${href("/")}">首页</a>
      </div>
    </div>

    <footer class="footer" style="border-top:none;margin-top:40px;">
      <div class="muted">${escHtml(SITE.siteUrl.replace(/\/$/,"") + post.url)}</div>
    </footer>
  </article>
</main>`;

  return layout({ title: post.title, body });
}

function renderTagsIndex(tags, tagCounts) {
  const items = tags.map(t => {
    const slug = slugify(t);
    const n = tagCounts.get(t) || 0;
    return `<a class="btn" href="${href(`/tags/${slug}/`)}">${escHtml(t)} · ${n}</a>`;
  }).join(" ");

  const body = `
<main class="container" style="padding:64px 16px 96px;">
  <div style="max-width:720px;margin:0 auto;">
    <div class="muted" style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;">Tags</div>
    <h1 style="margin:10px 0 0;font-size:40px;line-height:1.12;">标签</h1>
    <p class="muted" style="margin-top:12px;">按标签浏览文章。</p>
    <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">${items}</div>
  </div>
</main>`;
  return layout({ title: `标签 · ${SITE.title}`, body });
}

function renderTagPage(tag, posts) {
  const body = `
<main class="container" style="padding:64px 16px 96px;">
  <div style="max-width:720px;margin:0 auto;">
    <div class="muted" style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;">Tag</div>
    <h1 style="margin:10px 0 0;font-size:40px;line-height:1.12;">${escHtml(tag)}</h1>
    <p class="muted" style="margin-top:12px;">共 ${posts.length} 篇</p>
    <div class="list" style="margin-top:18px;">${posts.map(renderPostCard).join("")}</div>
  </div>
</main>`;
  return layout({ title: `${tag} · 标签 · ${SITE.title}`, body });
}

function renderArchivePage(monthGroups) {
  const blocks = monthGroups.map(g => {
    return `
<div class="card">
  <div class="muted" style="letter-spacing:.16em;text-transform:uppercase;font-size:12px;">${escHtml(g.monthLabel)} · ${g.items.length} 篇</div>
  <div class="list" style="margin-top:12px;">
    ${g.items.map(p => `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap;">
        <a href="${p.url}" style="font-weight:650;">${escHtml(p.title)}</a>
        <span class="muted" style="font-size:13px;">${escHtml(p.dateISO)}</span>
      </div>
    `).join("")}
  </div>
</div>`;
  }).join("");

  const body = `
<main class="container" style="padding:64px 16px 96px;">
  <div style="max-width:720px;margin:0 auto;">
    <div class="muted" style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;">Archive</div>
    <h1 style="margin:10px 0 0;font-size:40px;line-height:1.12;">归档</h1>
    <p class="muted" style="margin-top:12px;">按年月整理。</p>
    <div class="list" style="margin-top:18px;">${blocks}</div>
  </div>
</main>`;
  return layout({ title: `归档 · ${SITE.title}`, body });
}

function renderAbout() {
  const body = `
<main class="container" style="padding:64px 16px 96px;">
  <div style="max-width:720px;margin:0 auto;">
    <div class="muted" style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;">About</div>
    <h1 style="margin:10px 0 0;font-size:40px;line-height:1.12;">关于</h1>
    <p class="muted" style="margin-top:12px;">这里写你的自我介绍与博客理念。</p>
  </div>
</main>`;
  return layout({ title: `关于 · ${SITE.title}`, body });
}

function renderRss(posts) {
  const origin = SITE.siteUrl.replace(/\/$/g, "");
  const items = posts.slice(0, 30).map(p => {
    const link = origin + p.url; // p.url already includes BASE_PATH
    return `
<item>
  <title>${escXml(p.title)}</title>
  <link>${escXml(link)}</link>
  <guid>${escXml(link)}</guid>
  <pubDate>${escXml(rfc822(p.dateISO))}</pubDate>
  <description>${escXml(p.summary || "")}</description>
</item>`;
  }).join("");

  const channelLink = origin + href("/");
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escXml(SITE.title)}</title>
    <link>${escXml(channelLink)}</link>
    <description>${escXml(SITE.description)}</description>
    <language>zh-CN</language>
    ${items}
  </channel>
</rss>`;
}

async function main() {
  await fs.ensureDir(DIST);
  await fs.ensureDir(ASSETS);
  await fs.ensureDir(POSTS_OUT);
  await fs.ensureDir(TAGS_OUT);
  await fs.ensureDir(ARCHIVE_OUT);

  // Copy Decap CMS admin folder + uploads into dist (static hosting requirement)
  if (await fs.pathExists(path.join(ROOT, "admin"))) {
    await fs.copy(path.join(ROOT, "admin"), path.join(DIST, "admin"));
  }
  if (await fs.pathExists(path.join(ROOT, "uploads"))) {
    await fs.copy(path.join(ROOT, "uploads"), path.join(DIST, "uploads"));
  }

  writeAssets();

  const posts = readAllPosts();
  if (!posts.length) {
    console.log("No posts found in /posts");
    return;
  }

  const navMap = buildPrevNext(posts);
  const monthGroups = groupByMonth(posts);
  const { map: tagMap, tags } = groupByTag(posts);
  const tagCounts = new Map(tags.map(t => [t, (tagMap.get(t) || []).length]));

  await fs.writeFile(path.join(DIST, "index.html"), renderIndex(posts), "utf8");

  for (const p of posts) {
    const outDir = path.join(POSTS_OUT, p.slug);
    await fs.ensureDir(outDir);
    await fs.writeFile(path.join(outDir, "index.html"), renderPost(p, navMap.get(p.slug)), "utf8");
  }

  await fs.writeFile(path.join(TAGS_OUT, "index.html"), renderTagsIndex(tags, tagCounts), "utf8");
  for (const t of tags) {
    const outDir = path.join(TAGS_OUT, slugify(t));
    await fs.ensureDir(outDir);
    await fs.writeFile(path.join(outDir, "index.html"), renderTagPage(t, tagMap.get(t) || []), "utf8");
  }

  await fs.writeFile(path.join(ARCHIVE_OUT, "index.html"), renderArchivePage(monthGroups), "utf8");

  await fs.ensureDir(path.join(DIST, "about"));
  await fs.writeFile(path.join(DIST, "about", "index.html"), renderAbout(), "utf8");

  await fs.writeFile(path.join(DIST, "rss.xml"), renderRss(posts), "utf8");

  console.log("Build complete -> dist/");
  console.log("BASE_PATH =", BASE_PATH || "(empty)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
