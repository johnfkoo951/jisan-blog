// 紙散 (JISAN) blog generator — vault-as-CMS static build
// content/posts/*.md (frontmatter + markdown) → dist/ (index, posts, RSS)
// v4.3 standards: CMDS tokens, accent-on pattern, 17 OG tags, round-logo favicon.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

// ───────────────────────── config ─────────────────────────
const SITE = {
  domain: 'jisan.cmdspace.work',
  url: 'https://jisan.cmdspace.work',
  title: '紙散 · 지산',
  tagline: '기록으로 지식을 세상에 퍼뜨리는 사람',
  description: '구요한(Yohan Koo)의 저자 블로그. 지식관리, AI 시대의 기록, 프레임워크와 에세이의 인용 정본.',
  author: 'Yohan Koo',
  authorKo: '구요한',
  license: 'CC BY-NC-ND 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ko',
  // STAGING: true → noindex (개장 승인 전). 개장 시 false 로 바꾸고 재배포.
  staging: false,
};

const ROOT = new URL('.', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');

// ─────────────────────── frontmatter ───────────────────────
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  let lastKey = null;
  for (const line of m[1].split('\n')) {
    const arr = line.match(/^\s+-\s+(.*)$/);
    if (arr && lastKey) {
      if (!Array.isArray(meta[lastKey])) meta[lastKey] = [];
      meta[lastKey].push(arr[1].replace(/^"|"$/g, ''));
      continue;
    }
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) {
      lastKey = kv[1];
      const v = kv[2].trim().replace(/^"|"$/g, '');
      meta[lastKey] = v === '' ? [] : v;
    }
  }
  return { meta, body: raw.slice(m[0].length) };
}

// ─────────────────────── helpers ───────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => iso; // YYYY-MM-DD 그대로 (ISO 8601, vault 표준)
const readingMin = (text) => Math.max(1, Math.round(text.replace(/\s/g, '').length / 500)); // 한국어 ~500자/분

marked.setOptions({ gfm: true, breaks: false });

// 표를 가로 스크롤 래퍼로 감싼다 (모바일 가로 스크롤 — 페이지 body 는 넘치지 않게)
// 단독 이미지 문단은 <figure> 로 승격: ![alt](src "캡션") 의 title 이 <figcaption> 이 된다.
function postprocess(html) {
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  const lazy = (img) => /loading=/.test(img) ? img : img.replace(/<img /g, '<img loading="lazy" decoding="async" ');
  // ① <img> + <em>캡션</em> 이 한 문단 (레거시 캡션 관례: ![alt](src) 다음 줄 *Figure N. ...*)
  html = html.replace(/<p>((?:<img [^>]*>\s*)+)<em>([\s\S]*?)<\/em><\/p>/g,
    (m, imgs, cap) => `<figure>${lazy(imgs.trim())}<figcaption>${cap}</figcaption></figure>`);
  // ② 이미지(들)만 있는 문단 — title="..." 이 있으면 figcaption 으로
  html = html.replace(/<p>((?:<img [^>]*>\s*)+)<\/p>/g, (m, imgs) => {
    const t = imgs.match(/title="([^"]*)"/);
    const caption = t && t[1] ? `<figcaption>${t[1]}</figcaption>` : '';
    return `<figure>${lazy(imgs.trim())}${caption}</figure>`;
  });
  return html;
}

// ─────────────────────── shared css ───────────────────────
const CSS = `
:root {
  --max: 720px;
  --text: #1a1a1a; --muted: #666; --bg: #fff;
  --accent: #134538; --accent-light: #1a5c4a; --accent-on: #fff;
  --border: #e5e5e5; --code-bg: #f5f5f5; --card-bg: #fff; --tint: #f4f9f7;
}
[data-theme="dark"] {
  --text: #f2f4f3; --muted: #9aa39d; --bg: #06080a;
  --accent: #E985A2; --accent-light: #F4A4B8; --accent-on: #0b0f0d;
  --border: #1a231f; --code-bg: #161c19; --card-bg: #0d1411; --tint: #101814;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { color-scheme: light dark; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Pretendard', 'Segoe UI', system-ui, sans-serif;
  color: var(--text); background: var(--bg); line-height: 1.78; font-size: 17px;
  -webkit-font-smoothing: antialiased; transition: background-color .2s, color .2s;
  word-break: keep-all; overflow-wrap: break-word;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: var(--max); margin: 0 auto; padding: 0 1.5rem; }

/* header */
.site-head { padding: 2.2rem 0 1.4rem; border-bottom: 1px solid var(--border); }
.site-head .brand { display: flex; align-items: baseline; gap: .6rem; }
.site-head .hanja { font-size: 1.9rem; font-weight: 800; letter-spacing: .04em; color: var(--accent); }
.site-head .roman { font-size: .95rem; font-weight: 700; letter-spacing: .18em; color: var(--muted); text-transform: uppercase; }
.site-head .tagline { margin-top: .35rem; color: var(--muted); font-size: .9rem; }
.site-head a.home { color: inherit; text-decoration: none; }

/* theme toggle */
.theme-toggle { position: fixed; top: 1rem; right: 1rem; z-index: 100; width: 36px; height: 36px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 50%; cursor: pointer;
  display: grid; place-items: center; color: var(--text); transition: border-color .15s; }
.theme-toggle:hover { border-color: var(--accent); }
.theme-toggle svg { width: 16px; height: 16px; }

/* index list */
.post-list { list-style: none; padding: 1.6rem 0 3rem; }
.post-list li { padding: 1.3rem 0; border-bottom: 1px solid var(--border); }
.post-list .p-meta { font-size: .8rem; color: var(--muted); display: flex; gap: .7rem; margin-bottom: .3rem; }
.post-list .p-kind { color: var(--accent); font-weight: 700; }
.post-list h2 { font-size: 1.3rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.35; }
.post-list h2 a { color: inherit; }
.post-list h2 a:hover { color: var(--accent); text-decoration: none; }
.post-list .p-summary { margin-top: .4rem; color: var(--muted); font-size: .95rem; }

/* article */
article.post { padding: 2.4rem 0 1rem; }
article.post .p-kind { font-size: .8rem; font-weight: 700; color: var(--accent); letter-spacing: .06em; }
article.post h1 { font-size: 2rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.28; margin: .4rem 0 .7rem; }
.byline { color: var(--muted); font-size: .87rem; padding-bottom: 1.6rem; border-bottom: 1px solid var(--border); }
.byline b { color: var(--text); font-weight: 600; }
.prose { padding-top: 1.8rem; }
.prose h2 { font-size: 1.45rem; font-weight: 800; letter-spacing: -.02em; margin: 2.4rem 0 .7rem; line-height: 1.35; }
.prose h3 { font-size: 1.15rem; font-weight: 700; margin: 1.8rem 0 .5rem; }
.prose p { margin: .95rem 0; }
.prose ul, .prose ol { margin: .95rem 0 .95rem 1.4rem; }
.prose li { margin: .3rem 0; }
.prose blockquote { border-left: 3px solid var(--accent); padding: .55rem 1.1rem; margin: 1.3rem 0;
  background: var(--tint); border-radius: 0 8px 8px 0; color: var(--text); }
.prose blockquote p { margin: .4rem 0; }
.prose strong { font-weight: 700; }
.prose code { background: var(--code-bg); padding: .12em .38em; border-radius: 4px; font-size: .88em;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace; }
.prose pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 1rem; overflow-x: auto; margin: 1.2rem 0; }
.prose pre code { background: none; padding: 0; }
.prose hr { border: none; border-top: 1px solid var(--border); margin: 2.2rem 0; }
.prose img { max-width: 100%; border-radius: 8px; }
.prose figure { margin: 1.7rem 0; }
.prose figure img { display: block; width: 100%; border-radius: 10px; border: 1px solid var(--border); }
.prose figcaption { margin-top: .55rem; font-size: .82rem; color: var(--muted); text-align: center; line-height: 1.5; }
.table-wrap { overflow-x: auto; margin: 1.2rem 0; border: 1px solid var(--border); border-radius: 8px; }
.prose table { border-collapse: collapse; width: 100%; font-size: .88rem; line-height: 1.55; }
.prose th, .prose td { border-bottom: 1px solid var(--border); padding: .55rem .8rem; text-align: left; vertical-align: top; }
.prose th { background: var(--tint); font-weight: 700; white-space: nowrap; }
.prose tr:last-child td { border-bottom: none; }

/* citation + license */
.cite-block { margin: 2.6rem 0 1rem; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.cite-head { background: var(--accent); color: var(--accent-on); font-size: .78rem; font-weight: 700;
  letter-spacing: .08em; padding: .45rem .9rem; display: flex; justify-content: space-between; align-items: center; }
.cite-copy { background: rgba(255,255,255,.16); color: var(--accent-on); border: none; border-radius: 5px;
  font-size: .72rem; font-weight: 600; padding: .22rem .6rem; cursor: pointer; font-family: inherit; }
[data-theme="dark"] .cite-copy { background: rgba(0,0,0,.18); }
.cite-body { padding: .8rem .9rem; font-size: .85rem; color: var(--muted); line-height: 1.6; }
.cite-body .cite-text { color: var(--text); }
.permalink { margin-top: .45rem; font-size: .8rem; }
.post-foot { margin: 1.4rem 0 3rem; font-size: .8rem; color: var(--muted); display: flex; flex-wrap: wrap; gap: .4rem 1rem; }

/* footer */
.site-foot { border-top: 1px solid var(--border); padding: 1.6rem 0 2.6rem; font-size: .8rem; color: var(--muted); }
.site-foot .rss a { font-weight: 600; }
@media (max-width: 640px) { body { font-size: 16px; } article.post h1 { font-size: 1.6rem; } }
`;

// ─────────────────────── page shell ───────────────────────
function metaTags({ title, desc, url, ogImage }) {
  const robots = SITE.staging ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">';
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${SITE.authorKo} (${SITE.author})">
${robots}
<link rel="icon" type="image/png" href="/assets/logos/cmds-logo-round.png">
<link rel="apple-touch-icon" href="/assets/logos/cmds-logo-round.png">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.title)}" href="${SITE.url}/feed.xml">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE.title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:locale" content="ko_KR">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${esc(title)}">`;
}

const TOGGLE = `<button class="theme-toggle" id="themeToggle" aria-label="테마 전환">
<svg id="iconSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>
<svg id="iconMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 9 0 0 0 9.8 9.8z"/></svg>
</button>
<script>
(function(){var r=document.documentElement,k='jisan-theme',s=localStorage.getItem(k),m=window.matchMedia('(prefers-color-scheme: dark)');
function ap(t){r.setAttribute('data-theme',t);var d=t==='dark';document.getElementById('iconSun').style.display=d?'none':'block';document.getElementById('iconMoon').style.display=d?'block':'none';}
ap(s||(m.matches?'dark':'light'));
document.getElementById('themeToggle').addEventListener('click',function(){var n=r.getAttribute('data-theme')==='dark'?'light':'dark';localStorage.setItem(k,n);ap(n);});})();
</script>`;

const HEAD_BRAND = `<header class="site-head"><div class="wrap">
<a class="home" href="/"><span class="brand"><span class="hanja">紙散</span><span class="roman">Jisan</span></span></a>
<p class="tagline">${SITE.tagline} — ${SITE.authorKo}의 저자 블로그</p>
</div></header>`;

const FOOT = `<footer class="site-foot"><div class="wrap">
<p>© ${SITE.authorKo} (${SITE.author}) · 별도 표기가 없는 글은 <a href="${SITE.licenseUrl}" rel="license">${SITE.license}</a></p>
<p class="rss" style="margin-top:.3rem"><a href="/feed.xml">RSS 구독</a> · <a href="https://cmdspace.work">CMDSPACE</a> · <a href="https://bio.cmdspace.work">bio</a></p>
</div></footer>`;

function shell({ title, desc, url, body }) {
  const ogImage = `${SITE.url}/assets/og/og-jisan.png`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${metaTags({ title, desc, url, ogImage })}
<style>${CSS}</style>
</head>
<body>
${TOGGLE}
${HEAD_BRAND}
${body}
${FOOT}
</body>
</html>`;
}

// ─────────────────────── build posts ───────────────────────
const postsDir = join(ROOT, 'content', 'posts');
const posts = readdirSync(postsDir).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = readFileSync(join(postsDir, f), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  if (!meta.slug || !meta.title || !meta.date) throw new Error(`missing slug/title/date in ${f}`);
  const html = postprocess(marked.parse(body));
  return { ...meta, body, html, min: readingMin(body), url: `${SITE.url}/posts/${meta.slug}/` };
}).sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));

mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
// 본문 이미지: content/images/{slug}/ → dist/images/{slug}/ (본문에서 /images/{slug}/파일명 으로 참조)
if (existsSync(join(ROOT, 'content', 'images'))) {
  cpSync(join(ROOT, 'content', 'images'), join(DIST, 'images'), { recursive: true });
}

for (const p of posts) {
  const citeText = `${SITE.authorKo}. (${p.date.slice(0, 4)}). ${p.title}. 紙散(지산). ${p.url}`;
  const firstPub = p.firstPublished ? `<span>최초 발행 <b>${esc(p.firstPublished)}</b></span>` : '';
  const updated = p.updated && p.updated !== p.date ? `<span>수정 <b>${fmtDate(p.updated)}</b></span>` : '';
  const body = `<main class="wrap"><article class="post">
<div class="p-kind">${esc(p.kind || '에세이')}</div>
<h1>${esc(p.title)}</h1>
<div class="byline"><b>${SITE.authorKo}</b> · 紙散 &nbsp;·&nbsp; <span>발행 <b>${fmtDate(p.date)}</b></span> ${updated} ${firstPub} &nbsp;·&nbsp; ${p.min}분 읽기</div>
<div class="prose">${p.html}</div>
<div class="cite-block">
<div class="cite-head"><span>이 글을 인용하려면</span><button class="cite-copy" data-cite="${esc(citeText)}">복사</button></div>
<div class="cite-body"><span class="cite-text">${esc(citeText)}</span>
<div class="permalink">영속 주소: <a href="${p.url}">${p.url}</a></div></div>
</div>
<div class="post-foot"><span><a href="/">← 목록으로</a></span><span><a href="${SITE.licenseUrl}" rel="license">${SITE.license}</a> — 출처를 밝히면 자유롭게 공유할 수 있습니다</span></div>
</article></main>
<script>document.querySelectorAll('.cite-copy').forEach(function(b){b.addEventListener('click',function(){navigator.clipboard.writeText(b.dataset.cite).then(function(){b.textContent='복사됨';setTimeout(function(){b.textContent='복사';},1500);});});});</script>`;
  const dir = join(DIST, 'posts', p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), shell({ title: `${p.title} — ${SITE.title}`, desc: p.summary || SITE.description, url: p.url, body }));
}

// ─────────────────────── index ───────────────────────
const listItems = posts.map((p) => `<li>
<div class="p-meta"><span class="p-kind">${esc(p.kind || '에세이')}</span><span>${fmtDate(p.date)}</span><span>${p.min}분</span></div>
<h2><a href="/posts/${p.slug}/">${esc(p.title)}</a></h2>
<p class="p-summary">${esc(p.summary || '')}</p>
</li>`).join('\n');

writeFileSync(join(DIST, 'index.html'), shell({
  title: `${SITE.title} — ${SITE.tagline}`,
  desc: SITE.description,
  url: `${SITE.url}/`,
  body: `<main class="wrap"><ul class="post-list">${listItems}</ul></main>`,
}));

// ─────────────────────── RSS ───────────────────────
const rssItems = posts.map((p) => `<item>
<title>${esc(p.title)}</title>
<link>${p.url}</link>
<guid isPermaLink="true">${p.url}</guid>
<pubDate>${new Date(p.date + 'T09:00:00+09:00').toUTCString()}</pubDate>
<description>${esc(p.summary || '')}</description>
</item>`).join('\n');

writeFileSync(join(DIST, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(SITE.title)}</title>
<link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
<language>ko</language>
${rssItems}
</channel></rss>`);

// robots.txt — staging 중엔 전체 차단, 개장 시 sitemap 안내
writeFileSync(join(DIST, 'robots.txt'), SITE.staging
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);

if (!SITE.staging) {
  const urls = [`${SITE.url}/`, ...posts.map((p) => p.url)];
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}
</urlset>`);
}

console.log(`✅ built ${posts.length} post(s) → dist/ (staging=${SITE.staging})`);
