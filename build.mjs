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

// 카테고리 (frontmatter kind → URL slug). 새 kind 는 여기 한 줄 추가.
const KINDS = { '에세이': 'essay', '프레임워크': 'framework', '소개': 'intro', '보고서': 'report' };
const kindSlug = (kind) => KINDS[kind] || 'etc';

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
const fmtDate = (iso) => iso.slice(0, 10); // 표시는 날짜만 — date 는 YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm (시간은 동일 날짜 내 정렬용)
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
const READER_CSS = readFileSync(join(ROOT, 'assets', 'reader.css'), 'utf8');
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
.series-box { margin: 1.4rem 0 0; border: 1px solid var(--border); border-radius: 10px; padding: .85rem 1.1rem; background: var(--tint); font-size: .88rem; }
.series-box .series-label { font-weight: 700; color: var(--accent); font-size: .78rem; letter-spacing: .05em; margin-bottom: .35rem; }
.series-box ol { margin: 0 0 0 1.2rem; }
.series-box li { margin: .18rem 0; }
.series-box .series-here { font-size: .72rem; color: var(--muted); margin-left: .35rem; }
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

/* kind tabs (list pages) */
.kind-nav { display: flex; flex-wrap: wrap; gap: .45rem; padding: 1.2rem 0 0; }
.kind-nav a { font-size: .82rem; font-weight: 600; padding: .3rem .8rem; border: 1px solid var(--border);
  border-radius: 999px; color: var(--muted); }
.kind-nav a:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }
.kind-nav a.active { background: var(--accent); color: var(--accent-on); border-color: var(--accent); }
.kind-nav .count { font-weight: 400; opacity: .75; font-size: .74rem; }
article.post .p-kind a { color: inherit; }

/* search (list pages) */
.search-box { position: relative; margin-top: 1.1rem; }
.search-box input { width: 100%; font: inherit; font-size: .95rem; color: var(--text);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  padding: .6rem 1rem .6rem 2.3rem; outline: none; transition: border-color .15s; }
.search-box input:focus { border-color: var(--accent); }
.search-box svg { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px; color: var(--muted); pointer-events: none; }
.search-results { list-style: none; padding: .4rem 0 0; }
.search-results li { padding: .85rem 0; border-bottom: 1px solid var(--border); }
.search-results .s-meta { font-size: .76rem; color: var(--muted); display: flex; gap: .6rem; }
.search-results .s-meta .p-kind { color: var(--accent); font-weight: 700; }
.search-results h3 { font-size: 1.05rem; font-weight: 700; line-height: 1.4; margin: .15rem 0; }
.search-results h3 a { color: inherit; }
.search-results .s-snippet { font-size: .85rem; color: var(--muted); line-height: 1.6; }
.search-results .s-snippet mark { background: none; color: var(--accent); font-weight: 700; }
.search-empty { padding: 1.2rem 0; color: var(--muted); font-size: .9rem; }

/* related posts */
.related-box { margin: 2.4rem 0 0; border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.2rem; background: var(--tint); }
.related-box .related-label { font-weight: 700; color: var(--accent); font-size: .78rem; letter-spacing: .05em; margin-bottom: .5rem; }
.related-box ul { list-style: none; }
.related-box li { margin: .35rem 0; font-size: .92rem; line-height: 1.5; }
.related-box li .r-kind { font-size: .72rem; color: var(--muted); margin-left: .4rem; }
@media (max-width: 640px) { body { font-size: 16px; } article.post h1 { font-size: 1.6rem; } }
`;

// ─────────────────────── page shell ───────────────────────
function metaTags({ title, desc, url, ogImage, article }) {
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
<meta name="twitter:image:alt" content="${esc(title)}">${article ? `
<meta property="article:published_time" content="${article.published}">
<meta property="article:modified_time" content="${article.modified}">
<meta property="article:author" content="https://cmdspace.work">` : ''}`;
}

const TOGGLE = `<button class="theme-toggle" id="themeToggle" aria-label="테마 전환">
<svg id="iconSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>
<svg id="iconMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 9 0 0 0 9.8 9.8z"/></svg>
</button>
<script>
(function(){var r=document.documentElement,k='jisan-theme',s=null,m=window.matchMedia('(prefers-color-scheme: dark)');
function ap(t){r.setAttribute('data-theme',t);var d=t==='dark';document.getElementById('themeToggle').setAttribute('aria-label',d?'밝은 테마로 전환':'어두운 테마로 전환');document.getElementById('iconSun').style.display=d?'none':'block';document.getElementById('iconMoon').style.display=d?'block':'none';}
try{s=localStorage.getItem(k);}catch{}
ap(s==='dark'||s==='light'?s:(m.matches?'dark':'light'));
m.addEventListener('change',function(e){if(!s)ap(e.matches?'dark':'light');});
document.getElementById('themeToggle').addEventListener('click',function(){var n=r.getAttribute('data-theme')==='dark'?'light':'dark';s=n;try{localStorage.setItem(k,n);}catch{}ap(n);});})();
</script>`;

const HEAD_BRAND = `<header class="site-head"><div class="wrap">
<a class="home" href="/"><span class="brand"><span class="hanja">紙散</span><span class="roman">Jisan</span></span></a>
<p class="tagline">${SITE.tagline} — ${SITE.authorKo}의 저자 블로그</p>
</div></header>`;

const FOOT = `<footer class="site-foot"><div class="wrap">
<p>© ${SITE.authorKo} (${SITE.author}) · 별도 표기가 없는 글은 <a href="${SITE.licenseUrl}" rel="license">${SITE.license}</a></p>
<p class="rss" style="margin-top:.3rem"><a href="/feed.xml">RSS 구독</a> · <a href="https://cmdspace.work">CMDSPACE</a> · <a href="https://bio.cmdspace.work">bio</a></p>
</div></footer>`;

function shell({ title, desc, url, body, jsonld, article, ogImageOverride, extraHead }) {
  const ogImage = ogImageOverride || `${SITE.url}/assets/og/og-jisan.png`;
  const ld = jsonld ? `\n<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${metaTags({ title, desc, url, ogImage, article })}${ld}${extraHead || ''}
<script>try{var t=localStorage.getItem('jisan-theme');document.documentElement.dataset.theme=(t==='dark'||t==='light')?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}</script>
<style>${CSS}
${READER_CSS}</style>
</head>
<body>
<a class="skip-link" href="#main">본문으로 건너뛰기</a>
${TOGGLE}
${HEAD_BRAND}
${body}
${FOOT}
<script defer src="/assets/reader.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;
}

// ─────────────────────── build posts ───────────────────────
const postsDir = join(ROOT, 'content', 'posts');
const posts = readdirSync(postsDir).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = readFileSync(join(postsDir, f), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  if (!meta.slug || !meta.title || !meta.date) throw new Error(`missing slug/title/date in ${f}`);
  let html = postprocess(marked.parse(body));
  const toc = [];
  html = html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (match, level, label) => {
    const id = `section-${toc.length + 1}`;
    toc.push({ id, level: Number(level), label });
    return `<h${level} id="${id}">${label}</h${level}>`;
  });
  html = html.replace(/<img ([^>]*?)loading="lazy"/, '<img $1loading="eager" fetchpriority="high"');
  // 검색 인덱스·관련 글 계산용: 소제목 + 마크다운 기호 제거한 플레인텍스트
  const headings = [...body.matchAll(/^#{2,4}\s+(.+)$/gm)].map((m) => m[1].replace(/[*_`]/g, '').trim());
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { ...meta, raw, body, html, toc, headings, plain, min: readingMin(body), url: `${SITE.url}/posts/${meta.slug}/` };
}).sort((a, b) => {
  const k = (p) => p.date.length > 10 ? p.date : p.date + 'T00:00';
  return k(a) === k(b) ? a.slug.localeCompare(b.slug) : k(a) < k(b) ? 1 : -1;
});

// 시리즈 그룹핑 (frontmatter series + seriesOrder)
const seriesMap = {};
for (const p of posts) {
  if (p.series) (seriesMap[p.series] ||= []).push(p);
}
for (const k of Object.keys(seriesMap)) seriesMap[k].sort((a, b) => Number(a.seriesOrder) - Number(b.seriesOrder));

// ─────────────────── 관련 글 (빌드 타임 유사도) ───────────────────
// 음절 바이그램 코사인 유사도 — 한국어에서 형태소 분석 없이 견고한 근사.
function bigramVec(s) {
  const t = s.replace(/\s+/g, '');
  const v = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    v.set(g, (v.get(g) || 0) + 1);
  }
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [, c] of a) na += c * c;
  for (const [, c] of b) nb += c * c;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [g, c] of small) { const d = large.get(g); if (d) dot += c * d; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
const vecs = new Map(posts.map((p) => [p.slug,
  bigramVec([p.title, p.summary || '', p.headings.join(' '), p.plain.slice(0, 3000)].join(' '))]));
const relatedMap = new Map();
for (const p of posts) {
  const scored = posts.filter((q) => q.slug !== p.slug).map((q) => {
    let s = cosine(vecs.get(p.slug), vecs.get(q.slug));
    if (p.series && p.series === q.series) s += 0.15; // 같은 시리즈 가산
    if ((p.kind || '에세이') === (q.kind || '에세이')) s += 0.03;
    return { q, s };
  }).sort((x, y) => y.s - x.s).filter((x) => x.s > 0.08).slice(0, 3);
  relatedMap.set(p.slug, scored.map((x) => x.q));
}

// ─────────────────── 리스트 페이지 공통 (탭 + 검색) ───────────────────
const kindCounts = {};
for (const p of posts) { const k = p.kind || '에세이'; kindCounts[k] = (kindCounts[k] || 0) + 1; }
function kindNav(active) {
  const tabs = [`<a href="/"${active === 'all' ? ' class="active" aria-current="page"' : ''}>전체 <span class="count">${posts.length}</span></a>`];
  for (const k of Object.keys(KINDS)) {
    if (!kindCounts[k]) continue;
    tabs.push(`<a href="/kind/${KINDS[k]}/"${active === k ? ' class="active" aria-current="page"' : ''}>${esc(k)} <span class="count">${kindCounts[k]}</span></a>`);
  }
  return `<nav class="kind-nav" aria-label="글 유형">${tabs.join('')}</nav>`;
}
const SEARCH_UI = `<div class="search-box" role="search">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
<input id="q" type="search" placeholder="글 검색 — 제목·소제목·본문" autocomplete="off" aria-label="블로그 내 검색">
<span class="search-key" aria-hidden="true">⌘ K /</span>
</div>
<p class="search-status" id="searchStatus" role="status" aria-live="polite"></p>
<ul class="search-results" id="sr" hidden></ul>`;
const SEARCH_JS = '<script defer src="/assets/search.js"></script>';
function listPage({ active, items }) {
  return `<main id="main" class="wrap archive-page"><div class="archive-head"><h1>${active === 'all' ? '글 모음' : esc(active)}</h1><span>기록에서 연결로</span></div>${kindNav(active)}${SEARCH_UI}<ul class="post-list" id="postList">${items}</ul></main>${SEARCH_JS}`;
}
const listItem = (p) => {
  const image = p.html.match(/<img [^>]*src="([^"]+)"/);
  const thumb = image ? `<a class="post-thumb" href="/posts/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${esc(image[1])}" alt="" loading="lazy" decoding="async" width="180" height="135"></a>` : '';
  return `<li${image ? '' : ' class="no-thumb"'}><div>
<div class="p-meta"><span class="p-kind">${esc(p.kind || '에세이')}</span><time datetime="${fmtDate(p.date)}">${fmtDate(p.date)}</time><span>${p.min}분 읽기</span></div>
<h2><a href="/posts/${p.slug}/">${esc(p.title)}</a></h2>
<p class="p-summary">${esc(p.summary || '')}</p></div>${thumb}</li>`;
};

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
  const rel = relatedMap.get(p.slug) || [];
  const relatedBox = rel.length ? `<aside class="related-box"><div class="related-label">함께 읽기</div><ul>${rel.map((r) => `<li><a href="/posts/${r.slug}/">${esc(r.title)}</a><span class="r-kind">${esc(r.kind || '에세이')} · ${fmtDate(r.date)}</span></li>`).join('')}</ul></aside>` : '';
  const toc = p.toc.filter(h => h.level === 2);
  const contents = toc.length > 1 ? `<details class="reader-toc"><summary>이 글의 목차 <span class="metrics">${toc.length}개</span></summary><nav aria-label="글 목차"><ol>${toc.map(h => `<li><a href="#${h.id}">${h.label.replace(/<[^>]*>/g, '')}</a></li>`).join('')}</ol></nav></details>` : '';
  const body = `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="main" class="wrap"><article class="post" data-slug="${esc(p.slug)}">
<a class="back-link" href="/">← 글 모음</a>
<div class="p-kind"><a href="/kind/${kindSlug(p.kind || '에세이')}/">${esc(p.kind || '에세이')}</a></div>
<h1>${esc(p.title)}</h1>
<div class="byline"><b>${SITE.authorKo}</b> · 紙散 &nbsp;·&nbsp; <span>발행 <b>${fmtDate(p.date)}</b></span> ${updated} ${firstPub} &nbsp;·&nbsp; ${p.min}분 읽기 <span class="metrics" id="viewCount" title="집계 도입 이후, 브라우저별 하루 한 번 집계한 조회수" hidden></span></div>
${p.summary ? `<p class="article-summary">${esc(p.summary)}</p>` : ''}
${p.series ? `<details class="series-box"><summary class="series-label">${esc(p.series)} <span class="series-here">${p.seriesOrder} / ${seriesMap[p.series].length}편 · 시리즈 보기</span></summary><nav aria-label="시리즈"><ol>${seriesMap[p.series].map((sp) => sp.slug === p.slug ? `<li><b>${esc(sp.title)}</b> <span class="series-here">지금 읽는 글</span></li>` : `<li><a href="/posts/${sp.slug}/">${esc(sp.title)}</a></li>`).join('')}</ol></nav></details>` : ''}
<div class="reader-tools" role="group" aria-label="읽기 도구"><span class="tool-label">글자 크기</span><button class="tool-button" data-font-step="-1" aria-label="본문 글자 작게">가 −</button><button class="tool-button" data-font-step="1" aria-label="본문 글자 크게">가 +</button><button class="tool-button" data-font-reset aria-label="본문 글자 기본 크기로">기본</button><button class="tool-button share-button" data-share>글 공유</button></div>
<p class="action-status" id="actionStatus" role="status" aria-live="polite"></p>
${contents}<div class="prose">${p.html}</div>
<div class="engagement" hidden><div class="engagement-copy"><strong>이 글이 생각에 보탬이 되었나요?</strong><small>로그인 없이 마음을 남겨 주세요.</small></div><button class="tool-button like-button" id="likeButton" aria-pressed="false">♡ 좋아요</button><span class="metrics">집계 시작 이후의 반응입니다. 중복 방지용 익명 쿠키를 사용합니다.</span></div>
${relatedBox}
<div class="cite-block">
<div class="cite-head"><span>이 글을 인용하려면</span><button class="cite-copy" data-cite="${esc(citeText)}">복사</button></div>
<div class="cite-body"><span class="cite-text">${esc(citeText)}</span>
<div class="permalink">영속 주소: <a href="${p.url}">${p.url}</a></div></div>
</div>
<div class="post-foot"><span><a href="/">← 목록으로</a></span><span><a href="${SITE.licenseUrl}" rel="license">${SITE.license}</a> — 출처를 밝히면 자유롭게 공유할 수 있습니다</span></div>
</article></main>
`;
  const dir = join(DIST, 'posts', p.slug);
  mkdirSync(dir, { recursive: true });
  const heroMatch = p.html.match(/<img [^>]*src="([^"]+)"/);
  const heroUrl = heroMatch ? (heroMatch[1].startsWith('http') ? heroMatch[1] : `${SITE.url}${heroMatch[1]}`) : `${SITE.url}/assets/og/og-jisan.png`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.summary || SITE.description,
    url: p.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
    datePublished: p.date.slice(0, 10),
    dateModified: (p.updated || p.date).slice(0, 10),
    inLanguage: 'ko',
    image: heroUrl,
    license: SITE.licenseUrl,
    author: { '@type': 'Person', name: SITE.authorKo, alternateName: SITE.author, url: 'https://cmdspace.work' },
    publisher: { '@type': 'Person', name: SITE.authorKo, alternateName: `${SITE.title} (Jisan)`, url: SITE.url },
    isPartOf: { '@type': 'Blog', name: SITE.title, url: SITE.url },
  };
  writeFileSync(join(dir, 'index.html'), shell({ title: `${p.title} — ${SITE.title}`, desc: p.summary || SITE.description, url: p.url, body, jsonld, ogImageOverride: heroMatch ? heroUrl : undefined, article: { published: p.date.slice(0, 10), modified: (p.updated || p.date).slice(0, 10) }, extraHead: `\n<link rel="alternate" type="text/markdown" href="${p.url}index.md" title="Markdown source">` }));
  // GEO/AIO: 마크다운 원문 엔드포인트 — LLM·에이전트가 정본을 그대로 인용할 수 있게
  writeFileSync(join(dir, 'index.md'), p.raw);
}

// ─────────────────────── index + 카테고리 페이지 ───────────────────────
const blogJsonld = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: SITE.title,
  alternateName: 'Jisan',
  description: SITE.description,
  url: SITE.url,
  inLanguage: 'ko',
  author: { '@type': 'Person', name: SITE.authorKo, alternateName: SITE.author, url: 'https://cmdspace.work', sameAs: ['https://bio.cmdspace.work', 'https://github.com/johnfkoo951'] },
  blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: p.url, datePublished: p.date.slice(0, 10) })),
};

writeFileSync(join(DIST, 'index.html'), shell({
  title: `${SITE.title} — ${SITE.tagline}`,
  desc: SITE.description,
  url: `${SITE.url}/`,
  body: listPage({ active: 'all', items: posts.map(listItem).join('\n') }),
  jsonld: blogJsonld,
}));

for (const [kind, slug] of Object.entries(KINDS)) {
  const kposts = posts.filter((p) => (p.kind || '에세이') === kind);
  if (!kposts.length) continue;
  const dir = join(DIST, 'kind', slug);
  mkdirSync(dir, { recursive: true });
  const url = `${SITE.url}/kind/${slug}/`;
  writeFileSync(join(dir, 'index.html'), shell({
    title: `${kind} — ${SITE.title}`,
    desc: `${SITE.title} — ${kind} 글 ${kposts.length}편. ${SITE.description}`,
    url,
    body: listPage({ active: kind, items: kposts.map(listItem).join('\n') }),
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${kind} — ${SITE.title}`,
      url,
      inLanguage: 'ko',
      isPartOf: { '@type': 'Blog', name: SITE.title, url: SITE.url },
      hasPart: kposts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: p.url, datePublished: p.date.slice(0, 10) })),
    },
  }));
}

// ─────────────────────── 검색 인덱스 ───────────────────────
writeFileSync(join(DIST, 'search-index.json'), JSON.stringify(posts.map((p) => ({
  slug: p.slug,
  title: p.title,
  kind: p.kind || '에세이',
  date: p.date,
  summary: p.summary || '',
  headings: p.headings,
  text: p.plain,
}))));

// ─────────────────────── RSS ───────────────────────
const rssItems = posts.map((p) => `<item>
<title>${esc(p.title)}</title>
<link>${p.url}</link>
<guid isPermaLink="true">${p.url}</guid>
<pubDate>${new Date(p.date.length > 10 ? p.date + ':00+09:00' : p.date + 'T09:00:00+09:00').toUTCString()}</pubDate>
<category>${esc(p.kind || '에세이')}</category>
<description>${esc(p.summary || '')}</description>
<content:encoded><![CDATA[${p.html.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
</item>`).join('\n');

writeFileSync(join(DIST, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
<atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
<atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>
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
  const latest = posts.map((p) => p.updated || p.date).sort().pop();
  const entries = [
    { loc: `${SITE.url}/`, lastmod: latest.slice(0, 10) },
    ...Object.entries(KINDS).filter(([k]) => kindCounts[k]).map(([k, slug]) => {
      const kl = posts.filter((p) => (p.kind || '에세이') === k).map((p) => p.updated || p.date).sort().pop();
      return { loc: `${SITE.url}/kind/${slug}/`, lastmod: kl.slice(0, 10) };
    }),
    ...posts.map((p) => ({ loc: p.url, lastmod: (p.updated || p.date).slice(0, 10) })),
  ];
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `<url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod></url>`).join('\n')}
</urlset>`);
}

// ─────────────────────── llms.txt (GEO/AIO — LLM용 사이트 안내) ───────────────────────
const llmsPosts = Object.entries(KINDS).filter(([k]) => kindCounts[k]).map(([k, slug]) =>
  `## ${k} (${kindCounts[k]}편)\n\n` +
  posts.filter((p) => (p.kind || '에세이') === k)
    .map((p) => `- [${p.title}](${p.url}): ${p.summary || ''} (발행 ${fmtDate(p.date)} · [Markdown](${p.url}index.md))`)
    .join('\n')
).join('\n\n');
writeFileSync(join(DIST, 'llms.txt'), `# 紙散 (Jisan) — ${SITE.authorKo}(${SITE.author})의 저자 블로그

> ${SITE.description} 모든 글은 ${SITE.license} 라이선스이며, 각 글의 영속 URL이 인용 정본이다. 각 글 URL 뒤에 index.md 를 붙이면 마크다운 원문을 그대로 읽을 수 있다 (LLM·에이전트 인용 권장 경로).

- 저자: ${SITE.authorKo} (${SITE.author}) — https://cmdspace.work · https://bio.cmdspace.work
- 인용 형식: ${SITE.authorKo}. (연도). 제목. 紙散(지산). URL
- RSS (전문 포함): ${SITE.url}/feed.xml
- 사이트맵: ${SITE.url}/sitemap.xml

${llmsPosts}
`);

// IndexNow key file (Bing·Naver 즉시 색인 핑용)
writeFileSync(join(DIST, '64f0d0ae272fc4c0937b9f98a9ca9e9c.txt'), '64f0d0ae272fc4c0937b9f98a9ca9e9c');

console.log(`✅ built ${posts.length} post(s) → dist/ (staging=${SITE.staging})`);
