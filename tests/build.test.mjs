import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
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
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, `duplicate ids: ${slug}`);
    for (const [, id] of html.matchAll(/href="#(section-\d+)"/g)) assert.ok(ids.includes(id), `${slug}: ${id}`);
    assert.doesNotMatch(html, /yohankoo|Obsidian_MBP|omnicontrol|file:\/\/\//);
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
    assert.ok(!image.endsWith('/assets/og/og-jisan.png'), slug);
    if (new URL(image).hostname !== 'jisan.cmdspace.work') continue;
    assert.ok(readFileSync(new URL(`dist${new URL(image).pathname}`, root)).length > 0);
    if (/\.jpe?g$/.test(image)) assert.match(html, /property="og:image:type" content="image\/jpeg"/);
  }
});

test('Korean bold closes before particles even after punctuation', () => {
  const html = read('dist/posts/topology-of-knowledge-2/index.html');
  assert.match(html, /<strong>환경의 압도적인 복잡성을 줄이는 것\(Complexity Reduction\)<\/strong>이다/);
  for (const slug of slugs) {
    const text = read(`dist/posts/${slug}/index.html`).replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, '');
    assert.doesNotMatch(text, /\*\*/, `unrendered bold: ${slug}`);
  }
});
