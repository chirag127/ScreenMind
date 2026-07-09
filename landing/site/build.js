/* ScreenMind site generator — pre-renders each doc page to a real, crawlable
   static HTML file (SEO-first), plus sitemap.xml + robots.txt.
   Run from the site/ folder:  node build.js
   Single source of truth = content.js (window.SITE_CONTENT).            */
const fs = require('fs');
const path = require('path');

// ⚠️ Set this to your final domain before deploying (used for canonical + sitemap + OG).
const BASE = 'https://screenmind.app';

// ── load content.js (it assigns window.SITE_CONTENT) ──
const code = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const window = {};
eval(code);
const SITE = window.SITE_CONTENT;
const PAGES = SITE.pages, NAV = SITE.nav;

// per-page SEO descriptions (hand-written for quality)
const DESC = {
  'features': 'ScreenMind is a 100% local, open-source AI memory of your screen — captured and understood by a single Gemma 4 model. See the features and how it compares to Microsoft Recall and Screenpipe.',
  'how-it-works': 'How ScreenMind works under the hood: smart capture, one local Gemma 4 model sharing a single GPU, per-app caching and hybrid SQLite/FTS5 search — the architecture at a glance.',
  'compare': 'ScreenMind vs Microsoft Recall vs Screenpipe — a fully open-source, 100% local, privacy-first screen memory that runs on any 4GB GPU with one model for vision, audio and reasoning.',
  'install': 'Install ScreenMind with pip and run it locally in minutes — plus the developer install from source. Requirements, first-run model download, and configuration.',
  'chat-search': 'Search and chat with your screen history — hybrid semantic + keyword search and a conversational RAG agent, running entirely on your machine.',
  'voice-meetings': 'Voice memos and automatic meeting transcription in ScreenMind — one local Gemma 4 model with a native audio encoder records, transcribes and summarizes. No Whisper, no cloud.',
  'agents': 'Build automations on your screen data with plain-English Markdown agents or Python plugins that run on a schedule — powered by your local model.',
  'mcp': 'Expose your ScreenMind screen history to Claude Desktop, Cursor and VS Code over the Model Context Protocol (MCP) — 8 read-only, local tools.',
  'privacy': 'ScreenMind is private by design: 100% local, zero telemetry, encryption at rest, dashboard PIN lock, incognito mode and automatic redaction of secrets. Privacy & security first.',
  'architecture': "Inside ScreenMind's architecture: async workers, one llama.cpp server, per-app pHash caching, SQLite + FTS5 and cross-platform capture.",
};

// ── renderers (kept in sync with app.js) ──
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    if (b.h)    return `<h2>${b.h}</h2>`;
    if (b.h3)   return `<h3>${b.h3}</h3>`;
    if (b.p)    return `<p>${b.p}</p>`;
    if (b.code) return `<div class="code">${esc(b.code).replace(/\n/g, '<br>')}</div>`;
    if (b.list) return `<ul>${b.list.map(i => `<li>${i}</li>`).join('')}</ul>`;
    if (b.callout) return `<div class="callout">${b.callout}</div>`;
    if (b.cards) return `<div class="cards">${b.cards.map(c => `<div class="card"><div class="ci">${c.i}</div><div class="ct">${c.t}</div><div class="cd">${c.d}</div></div>`).join('')}</div>`;
    if (b.steps) return `<div class="steps">${b.steps.map((s, idx) => `<div class="step"><div class="sn">${idx + 1}</div><div class="st">${s.t}</div><div class="sd">${s.d}</div></div>`).join('')}</div>`;
    if (b.youtube) return `<div class="ytembed"><iframe src="https://www.youtube.com/embed/${b.youtube}" title="ScreenMind demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    if (b.img) return `<img class="media" src="${b.img}" alt="${b.alt || 'ScreenMind'}" loading="lazy">`;
    if (b.loopvideo) return `<video class="media" src="${b.loopvideo}" autoplay muted loop playsinline preload="metadata"></video>`;
    if (b.video) return `<video class="media" src="${b.video}" controls playsinline preload="metadata">Your browser can't play this video.</video>`;
    if (b.table) return `<div class="tablewrap"><table class="ctable"><thead><tr>${b.table.head.map((h,i)=>`<th${i===1?' class="sm"':''}>${h}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map(r=>`<tr>${r.map((cell,ci)=>`<td${ci===1?' class="sm"':''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.stats) return `<div class="statrow">${b.stats.map(s => `<div class="statbox"><div class="statn">${s.n}</div><div class="statl">${s.l}</div></div>`).join('')}</div>`;
    if (b.diagram) return `<pre class="diagram">${esc(b.diagram)}</pre>`;
    return '';
  }).join('');
}
function docNavHTML(active) {
  return NAV.map(g =>
    `<div class="grp">${g.group}</div>` +
    g.items.map(([k, label]) => `<a href="/${k}/" data-nav="${k}"${k === active ? ' class="active"' : ''}>${label}</a>`).join('')
  ).join('');
}
function docSelHTML(active) {
  return NAV.map(g => `<optgroup label="${g.group}">` +
    g.items.map(([k, label]) => `<option value="${k}"${k === active ? ' selected' : ''}>${label}</option>`).join('') +
    `</optgroup>`).join('');
}
function docMoreHTML(active) {
  const links = NAV.map(g => g.items.filter(([k]) => k !== active).map(([k, label]) => `<a href="/${k}/" data-nav="${k}">${label}</a>`).join('')).join('');
  return `<div class="docmore"><div class="grp">Explore more</div>${links}</div>` +
    `<div class="docfoot"><a href="https://github.com/ayushh0110/ScreenMind" target="_blank" rel="noopener">GitHub</a><a href="https://pypi.org/project/screenmind/" target="_blank" rel="noopener">PyPI</a><a href="https://youtu.be/CxkkBT_EvPw?si=I3McH0k1vIhVxyMz" target="_blank" rel="noopener">Walkthrough</a><a href="https://github.com/ayushh0110/ScreenMind/issues/new" target="_blank" rel="noopener">Raise an issue</a><a href="https://x.com/ayushh_ss" target="_blank" rel="noopener">X</a><a href="https://www.linkedin.com/in/ayushhss/" target="_blank" rel="noopener">LinkedIn</a><a href="mailto:shekharayush5678@gmail.com">Email</a><div class="copy">ScreenMind — 100% local, MIT-licensed.</div></div>`;
}
function articleHTML(key) {
  const P = PAGES[key];
  return `<div class="tag">${P.tag || ''}</div><h1 class="lumin">${P.title}</h1>` +
    renderBlocks(P.blocks) + docMoreHTML(key) +
    `<a class="jump" href="/" data-jump="__home">↯ back to the brain</a>`;
}

// ── shared shell (topnav / hero panels / doc containers / footer) ──
function topnav() {
  return `<nav class="topnav">
    <a class="brand" href="/" data-home><img class="logo" src="/assets/logo.png" alt="ScreenMind" />Screen<span>Mind</span></a>
    <div class="navlinks">
      <a href="/features/" data-doc="features">Overview</a>
      <a href="/install/" data-doc="install">Docs</a>
      <a href="/how-it-works/" data-doc="how-it-works">Under the hood</a>
      <a class="cta" href="https://github.com/ayushh0110/ScreenMind" target="_blank" rel="noopener">GitHub ↗</a>
    </div>
  </nav>`;
}
function heroPanels() {
  return `<main class="stage">
    <section class="panel" data-a="0.00" data-b="0.16"><div class="tag">A mind of its own</div><h1 class="lumin">Your screen,<br>remembered.</h1><p>Thousands of screen-moments, connected like neurons — running entirely on your machine.</p><span class="pill copyable" data-copy="pip install screenmind" role="button" tabindex="0" title="Click to copy"><span class="pilltext">pip install screenmind</span><svg class="copyico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></span><div class="hstat"><b>1,500+</b> downloads · <b>MIT</b> · runs on <b>4&nbsp;GB</b> VRAM</div></section>
    <section class="panel" data-a="0.22" data-b="0.46"><div class="tag">Understand</div><h2 class="lumin">Every synapse<br>is a moment.</h2><p>One local model reads every frame — apps, text, mood, layout — and remembers what it means.</p><a class="learn" href="/how-it-works/" data-doc="how-it-works">Learn how it works ↯</a></section>
    <section class="panel" data-a="0.50" data-b="0.72"><div class="tag">Automate</div><h2 class="lumin">Agents that live<br>in your memory.</h2><p>Drop a Markdown file and it runs on your screen history — no code needed.</p><a class="learn" href="/agents/" data-doc="agents">Build an agent ↯</a></section>
    <section class="panel" data-a="0.76" data-b="1.01"><div class="tag">Private</div><h2 class="lumin">All in your<br>head. Literally.</h2><p>Zero cloud. Zero telemetry. Your mind stays yours.</p><a class="learn" href="/privacy/" data-doc="privacy">See how it stays private ↯</a></section>
  </main>`;
}
function footer() {
  return `<footer class="sitefoot"><div class="cols">
    <div><div class="grp">Overview</div><a href="/features/" data-doc="features">Overview</a></div>
    <div><div class="grp">Docs</div><a href="/install/" data-doc="install">Install &amp; run</a><a href="/chat-search/" data-doc="chat-search">Chat &amp; Search</a><a href="/voice-meetings/" data-doc="voice-meetings">Voice &amp; meetings</a><a href="/agents/" data-doc="agents">Agents</a><a href="/mcp/" data-doc="mcp">MCP server</a><a href="/privacy/" data-doc="privacy">Nothing leaves</a></div>
    <div><div class="grp">Deep dive</div><a href="/how-it-works/" data-doc="how-it-works">Under the hood</a></div>
    <div><div class="grp">Project</div><a href="https://github.com/ayushh0110/ScreenMind" target="_blank" rel="noopener">GitHub ↗</a><a href="https://pypi.org/project/screenmind/" target="_blank" rel="noopener">PyPI ↗</a><a href="https://youtu.be/CxkkBT_EvPw?si=I3McH0k1vIhVxyMz" target="_blank" rel="noopener">Walkthrough ↗</a><a href="https://github.com/ayushh0110/ScreenMind/issues/new" target="_blank" rel="noopener">Raise an issue ↗</a></div>
    <div><div class="grp">Connect</div><a href="https://x.com/ayushh_ss" target="_blank" rel="noopener">X ↗</a><a href="https://www.linkedin.com/in/ayushhss/" target="_blank" rel="noopener">LinkedIn ↗</a><a href="mailto:shekharayush5678@gmail.com">Email</a></div>
  </div><div class="copy">ScreenMind — 100% local, MIT-licensed. Built with Gemma 4 E2B.</div></footer>`;
}
function jsonld(key) {
  const P = PAGES[key];
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "TechArticle",
    "headline": P.title, "description": DESC[key],
    "url": `${BASE}/${key}/`,
    "isPartOf": { "@type": "WebSite", "name": "ScreenMind", "url": BASE + '/' },
    "publisher": { "@type": "Organization", "name": "ScreenMind" }
  });
}
function docPage(key) {
  const P = PAGES[key];
  const title = `${P.seoTitle || P.title} — ScreenMind`;
  const url = `${BASE}/${key}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${esc(DESC[key])}" />
<link rel="canonical" href="${url}" />
<meta name="theme-color" content="#05060d" />
<link rel="icon" href="/favicon.ico" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="ScreenMind" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(DESC[key])}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${BASE}/assets/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(DESC[key])}" />
<meta name="twitter:image" content="${BASE}/assets/og.png" />
<link rel="stylesheet" href="/style.css" />
<script type="application/ld+json">${jsonld(key)}</script>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/"
}}
</script>
</head>
<body class="is-doc">
  ${topnav()}
  <select id="docsel" class="docsel" aria-label="Jump to a docs page">${docSelHTML(key)}</select>
  <div id="flash"></div>
  <div id="strand"></div>
  ${heroPanels()}
  <div id="doc"><aside id="docnav">${docNavHTML(key)}</aside><article class="article" id="article">${articleHTML(key)}</article></div>
  ${footer()}
<script src="/content.js"></script>
<script type="module" src="/app.js"></script>
</body>
</html>
`;
}

// ── write pages ──
const keys = Object.keys(PAGES);
let written = 0;
for (const key of keys) {
  const dir = path.join(__dirname, key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), docPage(key));
  written++;
}

// ── sitemap.xml (home + all docs) ──
const urls = ['/'].concat(keys.map(k => `/${k}/`));
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap);

// ── robots.txt ──
fs.writeFileSync(path.join(__dirname, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

// ── _redirects (Cloudflare Pages) — merged pages 301 to their new home (SEO-safe) ──
const REDIRECTS = [
  ['/compare/', '/features/'],
  ['/architecture/', '/how-it-works/'],
];
fs.writeFileSync(path.join(__dirname, '_redirects'), REDIRECTS.map(([from, to]) => `${from} ${to} 301`).join('\n') + '\n');

console.log(`Generated ${written} doc pages: ${keys.join(', ')}`);
console.log(`+ sitemap.xml (${urls.length} urls) + robots.txt`);
console.log(`BASE = ${BASE}  (change in build.js before deploy if the domain differs)`);
