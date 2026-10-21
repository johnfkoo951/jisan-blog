import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { SITE } from '../site.config.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const has = slug => existsSync(new URL(`content/posts/${slug}.md`, root));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugs = readdirSync(new URL('content/posts/', root)).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
test('every article retains exact Markdown source and reader landmarks', () => {
  for (const slug of slugs) {
    const html = read(`dist/posts/${slug}/index.html`);
    assert.equal(read(`dist/posts/${slug}/index.md`), read(`content/posts/${slug}.md`), slug);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, slug);
    assert.match(html, /id="main"/); assert.match(html, /class="engagement" hidden/);
    assert.match(html, /id="actionStatus" role="status"/);
    assert.match(html, /조회수·좋아요와 익명 쿠키 안내/);
    assert.match(html, /한국 시간 오전 9시/);
    assert.match(html, /data-font-reset aria-label="본문 글자 기본 크기로">기본<\/button>/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); // \s: Pele SVG의 data-id 는 id 가 아니다
    assert.equal(ids.length, new Set(ids).size, `duplicate ids: ${slug}`);
    for (const [, id] of html.matchAll(/href="#(section-\d+)"/g)) assert.ok(ids.includes(id), `${slug}: ${id}`);
    assert.doesNotMatch(html, new RegExp(['\\/Users\\/', 'file:\\/\\/\\/', ...(SITE.privateMarkers || [])].join('|')));
  }
});
test('archive has one title, all article links, current category and search feedback', () => {
  const html = read('dist/index.html');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  for (const slug of slugs) assert.ok(html.includes(`href="/posts/${slug}/"`));
  assert.match(html, /aria-current="page"/); assert.match(html, /id="searchStatus"/);
});

test('all articles have an existing hero and truthful image metadata', () => {
  for (const slug of slugs) {
    const html = read(`dist/posts/${slug}/index.html`);
    const image = html.match(/property="og:image" content="([^"]+)"/)[1];
    assert.ok(!image.endsWith(SITE.ogImage), slug);
    if (new URL(image).hostname !== SITE.domain) continue;
    assert.ok(readFileSync(new URL(`dist${new URL(image).pathname}`, root)).length > 0);
    if (/\.jpe?g$/.test(image)) assert.match(html, /property="og:image:type" content="image\/jpeg"/);
  }
});

test('Korean bold closes before particles even after punctuation', () => {
  // 지산 원고의 실제 사례. 다른 사이트에서는 이 줄만 건너뛰고 아래 전수 검사는 그대로 한다.
  if (has('topology-of-knowledge-2')) assert.match(read('dist/posts/topology-of-knowledge-2/index.html'), /<strong>환경의 압도적인 복잡성을 줄이는 것\(Complexity Reduction\)<\/strong>이다/);
  for (const slug of slugs) {
    const text = read(`dist/posts/${slug}/index.html`).replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, '');
    assert.doesNotMatch(text, /\*\*/, `unrendered bold: ${slug}`);
  }
});

// 저자 용어 표기 가드 — 정본은 볼트 「지산 퍼블리싱 프로그램/11-용어집」. 금지 표기를 찾으면 실패한다.
const BANNED_TERMS = SITE.bannedTerms || {};
test('posts use the author glossary spelling', () => {
  for (const slug of slugs) {
    const src = read(`content/posts/${slug}.md`);
    for (const [bad, good] of Object.entries(BANNED_TERMS)) assert.ok(!src.includes(bad), `${slug}: ${bad} → ${good}`);
  }
});

test('all articles receive two accessible rails without losing fallback navigation', () => {
  for (const slug of slugs) {
    const html=read(`dist/posts/${slug}/index.html`);
    for(const id of ['reader-toc-panel','reader-info-panel','reader-toc-title','reader-info-title','article-title']) assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${slug}: ${id}`);
    assert.match(html,/data-panel-toggle="toc" aria-controls="reader-toc-panel" aria-expanded="false"/);
    assert.match(html,/data-panel-toggle="info" aria-controls="reader-info-panel" aria-expanded="false"/);
    assert.match(html,/마크다운 원문/);
    assert.match(html,/data-copy-url/);
    assert.match(html,new RegExp(`data-copy-markdown="/posts/${slug}/index.md"`));
    assert.match(html,/id="markdown-copy-status" role="status" aria-live="polite"/);
  }
  assert.doesNotMatch(read('dist/index.html'),/id="reader-toc-panel"/);
});
test('keyword search index is populated only with bounded text labels', () => {
  const index=JSON.parse(read('dist/search-index.json'));
  for(const post of index){assert(Array.isArray(post.keywords));assert(post.keywords.length<=8);assert(post.keywords.every(k=>typeof k==='string'&&k.trim().length>0));}
  if (has('omnisearch-google-research')) assert(index.find(p=>p.slug==='omnisearch-google-research').keywords.includes('Omnisearch'));
});

test('every article exposes both Korean and English APA reference copies', () => {
  for(const slug of slugs){
    const html=read(`dist/posts/${slug}/index.html`);
    assert.equal((html.match(/data-cite-lang="ko"/g)||[]).length,2,slug);
    assert.equal((html.match(/data-cite-lang="en"/g)||[]).length,2,slug);
    assert.match(html,new RegExp(escRe(SITE.citation.en.author)));assert.match(html,new RegExp(escRe(SITE.citation.ko.author)));
    assert.match(html,new RegExp(`<i>${escRe(SITE.citation.en.blog)}</i>`));assert.match(html,new RegExp(`<i>${escRe(SITE.citation.ko.blog)}</i>`));
  }
});

test('citation section headings remain reader-facing and concise', () => {
  for (const slug of slugs) {
    const html=read(`dist/posts/${slug}/index.html`);
    assert.match(html,/<h3>인용하기<\/h3>/);
    assert.match(html,/<div class="cite-head"><span>인용하기<\/span><\/div>/);
    assert.doesNotMatch(html,/APA 7 인용과 공유|이 글을 인용하려면 — APA 7/);
  }
});
