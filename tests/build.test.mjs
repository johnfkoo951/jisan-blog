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
