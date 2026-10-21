// 코드로 렌더링한 도식: 픽스처(tests/fixtures/diagrams)를 임시 폴더에 빌드해 계약을 확인한다. 실제 글은 건드리지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { countCaptionedFigures, validateImageCaptions } from '../lib/image-captions.mjs';
import { SITE } from '../site.config.mjs';

const root = new URL('../', import.meta.url).pathname;
const fx = join(root, 'tests', 'fixtures', 'diagrams');
const build = (content = join(fx, 'content'), fonts = join(fx, 'fonts')) => {
  const dist = mkdtempSync(join(tmpdir(), 'blog-diagram-test-'));
  const r = spawnSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, JISAN_CONTENT_DIR: content, JISAN_DIST_DIR: dist, JISAN_DIAGRAM_FONTS_DIR: fonts } });
  return { ...r, dist };
};
const copyContent = () => { const dir = mkdtempSync(join(tmpdir(), 'blog-diagram-content-')); cpSync(join(fx, 'content'), dir, { recursive: true }); return dir; };
const ok = build();
test.after(() => rmSync(ok.dist, { recursive: true, force: true }));

test('fixture with diagrams builds without a browser', () => assert.equal(ok.status, 0, ok.stderr));

test('diagram page has captioned figures, both variants, unique ids and the diagram styles', () => {
  const html = readFileSync(join(ok.dist, 'posts/diagram-fixture/index.html'), 'utf8');
  const prose = html.split('<div class="prose">')[1].split('<details class="reader-details">')[0];
  const figures = [...prose.matchAll(/<figure class="diagram[^"]*"[^>]*>[\s\S]*?<\/figure>/g)].map((m) => m[0]);
  assert.equal(figures.length, 2);
  for (const f of figures) {
    assert.match(f, /<figcaption>코드로 렌더링한 도식\. [^<]{6,}<\/figcaption>/);
    assert.equal((f.match(/<svg /g) || []).length, 2, 'L and S variants');
    assert.equal((f.match(/role="img" aria-label="[^"]+"/g) || []).length, 2);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate ids');
  assert.deepEqual(countCaptionedFigures(prose, JSON.parse(readFileSync(join(fx, 'content/image-captions.json'), 'utf8')).images, 'diagram-fixture'), { images: 0, diagrams: 2 });
  assert.match(html, /cmds-pele \d+\.\d+\.\d+ · Pele \d+\.\d+\.\d+ theme/);
  assert.match(html, /@font-face\{font-family:"CMDS Pele Sans";[^}]*font-weight:400;[^}]*url\("\/assets\/fonts\/cmds-pele-sans-400\.woff\?v=[0-9a-f]{8}"\)/);
  assert.match(html, /\.prose figure\.diagram\{margin/);
  assert.match(prose, /<code class="language-markdown">```mermaid/, 'a fence inside a longer example fence stays code');
  assert.doesNotMatch(html, new RegExp(['\\/Users\\/', 'file:\\/\\/\\/', ...(SITE.privateMarkers || [])].join('|')));
  assert.equal(readFileSync(join(ok.dist, 'posts/diagram-fixture/index.md'), 'utf8'), readFileSync(join(fx, 'content/posts/diagram-fixture.md'), 'utf8'));
  for (const f of readdirSync(join(fx, 'fonts'))) assert.ok(readFileSync(join(ok.dist, 'assets/fonts', f)).length > 1000, f);
});

test('pages without diagrams get no diagram markup, styles or fonts', () => {
  const html = readFileSync(join(ok.dist, 'posts/plain-fixture/index.html'), 'utf8');
  assert.doesNotMatch(html, /cmds-pele|CMDS Pele Sans|figure class="diagram/);
  assert.match(html, /<code class="language-text">/);
});

test('RSS carries the PNG with its caption, never inline SVG', () => {
  const feed = readFileSync(join(ok.dist, 'feed.xml'), 'utf8');
  assert.doesNotMatch(feed, /<svg/);
  const site = SITE.url.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const imgs = [...feed.matchAll(new RegExp(`<figure><img src="${site}\\/images\\/diagram-fixture\\/diagram-([0-9a-f]{8})\\.png" alt="[^"]+" width="\\d+" height="\\d+"><figcaption>코드로 렌더링한 도식\\.`, 'g'))];
  assert.equal(imgs.length, 2);
  for (const [, sha8] of imgs) assert.ok(readFileSync(join(ok.dist, `images/diagram-fixture/diagram-${sha8}.png`)).length > 0);
});

const fails = (mutate, pattern) => {
  const content = copyContent();
  try { mutate(content); const r = build(content); rmSync(r.dist, { recursive: true, force: true }); assert.notEqual(r.status, 0, 'build should fail'); assert.match(r.stderr, pattern); assert.doesNotMatch(r.stderr, /Please report this/, 'no marked bug-report suffix'); }
  finally { rmSync(content, { recursive: true, force: true }); }
};
const post = (c) => join(c, 'posts/diagram-fixture.md');
test('an edited fence without re-rendering fails the build (stale cache)', () =>
  fails((c) => writeFileSync(post(c), readFileSync(post(c), 'utf8').replace('마스터 노트', '마스터 노트 수정')), /missing cache .*run npm run diagrams/));
test('a cache entry that does not match its source hash fails the build', () =>
  fails((c) => { const p = join(c, 'diagrams/diagram-fixture/0e1500ca.json'); const j = JSON.parse(readFileSync(p, 'utf8')); j.srcSha256 = '0'.repeat(64); writeFileSync(p, JSON.stringify(j)); }, /source hash mismatch.*run npm run diagrams/));
test('a missing PNG export fails the build', () =>
  fails((c) => rmSync(join(c, 'images/diagram-fixture/diagram-d6b4fb7d.png')), /PNG missing.*run npm run diagrams/));
test('a font subset that lacks diagram glyphs fails the build', () =>
  fails((c) => { const p = join(c, 'diagrams/_font.json'); const j = JSON.parse(readFileSync(p, 'utf8')); j.chars = j.chars.replace('볼', ''); writeFileSync(p, JSON.stringify(j)); }, /font subset lacks 볼: run npm run diagrams/));
test('a missing or drifted registry record fails the build', () => {
  const edit = (fn) => (c) => { const p = join(c, 'image-captions.json'); const j = JSON.parse(readFileSync(p, 'utf8')); fn(j.images); writeFileSync(p, JSON.stringify(j)); };
  fails(edit((r) => delete r['diagram:diagram-fixture:0e1500ca']), /missing diagram provenance for diagram:diagram-fixture:0e1500ca/);
  fails(edit((r) => { r['diagram:diagram-fixture:0e1500ca'].caption += ' 추가'; }), /caption\/registry drift for diagram:diagram-fixture:0e1500ca/);
  fails(edit((r) => { r['diagram:diagram-fixture:0e1500ca'].kind = 'rendered-chart'; }), /missing diagram provenance/);
});
test('a diagram without the italic caption line fails the build', () =>
  fails((c) => writeFileSync(post(c), readFileSync(post(c), 'utf8').replace('*코드로 렌더링한 도식. 도식 도입을', '코드로 렌더링한 도식. 도식 도입을').replace('정리했다.*', '정리했다.')), /needs an italic caption line/));

// npm run diagrams 는 렌더러 cmds-pele 가 있어야 돈다. 없으면 그 부분만 건너뛴다(빌드 검사는 그대로).
const HAS_PELE = existsSync(join(process.env.CMDS_PELE_DIR || join(root, '..', 'cmds-pele'), 'dist', 'cmds-pele.version.json'));
const diagramsScript = (content, args = [], env = {}) => spawnSync(process.execPath, ['scripts/diagrams.mjs', '--content', content, '--fonts', join(fx, 'fonts'), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
const LIST_FENCE = '\n## 목록 안 도식\n\n- 첫 항목\n- 둘째 항목\n\n  ```mermaid\n  flowchart LR\n    LA --> LB\n  ```\n  *코드로 렌더링한 도식. 목록 안의 시험 도식이다.*\n';
test('a mermaid fence inside a list item fails the build and npm run diagrams with the post and line', () => {
  const content = copyContent();
  try {
    writeFileSync(post(content), readFileSync(post(content), 'utf8') + LIST_FENCE);
    const line = readFileSync(post(content), 'utf8').split('\n').findIndex((l) => l === '  ```mermaid') + 1;
    const r = build(content); rmSync(r.dist, { recursive: true, force: true });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, new RegExp(`posts/diagram-fixture\\.md:${line}: a mermaid diagram inside a list item`));
    assert.doesNotMatch(r.stderr, /Please report this/);
    if (HAS_PELE) {
      const s = diagramsScript(content, ['--check']);
      assert.equal(s.status, 1);
      assert.match(s.stderr, new RegExp(`diagram-fixture\\.md:${line}\\b`));
    }
  } finally { rmSync(content, { recursive: true, force: true }); }
});
test('npm run diagrams --check reports registry gaps that would fail the build', { skip: !HAS_PELE && 'cmds-pele not installed' }, () => {
  const content = copyContent();
  try {
    writeFileSync(join(content, 'image-captions.json'), JSON.stringify({ images: {} }));
    const r = diagramsScript(content, ['--check']);
    assert.equal(r.status, 1);
    assert.equal((r.stdout.match(/^REGISTRY .*missing diagram provenance\. 빌드가 실패한다/gm) || []).length, 2);
    assert.match(r.stdout, /2 REGISTRY item\(s\) fail the build/);
  } finally { rmSync(content, { recursive: true, force: true }); }
});
test('a missing renderer python names PELE_PYTHON and what it needs', { skip: !HAS_PELE && 'cmds-pele not installed' }, () => {
  const content = copyContent();
  try {
    writeFileSync(post(content), readFileSync(post(content), 'utf8').replace('마스터 노트', '마스터 노트 수정'));
    const r = diagramsScript(content, [], { PELE_PYTHON: '/nonexistent/python' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /PELE_PYTHON 에 playwright 와 fontTools 가 설치된 파이썬을 지정한다/);
  } finally { rmSync(content, { recursive: true, force: true }); }
});

test('the validator counts diagrams separately and keeps the image contract', () => {
  const reg = { 'diagram:p:abcdef12': { kind: 'code-diagram', caption: '코드로 렌더링한 도식. 주제 설명입니다.', alt: '설명', evidence: 'test', srcSha256: 'abcdef12' + '0'.repeat(56) } };
  const view = '<div class="diagram-view" role="img" aria-label="설명" style="--dw:10px"><svg class="pele"></svg></div>';
  assert.deepEqual(countCaptionedFigures(`<figure class="diagram cmds-pele" data-diagram="abcdef12">${view}<figcaption>코드로 렌더링한 도식. 주제 설명입니다.</figcaption></figure>`, reg, 'p'), { images: 0, diagrams: 1 });
  assert.equal(validateImageCaptions(`<figure class="diagram cmds-pele" data-diagram="abcdef12">${view}<figcaption>코드로 렌더링한 도식. 주제 설명입니다.</figcaption></figure>`, reg, 'p'), 0);
  assert.throws(() => countCaptionedFigures(`<figure class="diagram" data-diagram="abcdef12">${view}</figure>`, reg, 'p'), /italic caption line/);
  assert.throws(() => countCaptionedFigures(`<figure class="diagram" data-diagram="abcdef12">${view.replace(' role="img" aria-label="설명"', '')}<figcaption>코드로 렌더링한 도식. 주제 설명입니다.</figcaption></figure>`, reg, 'p'), /alt text/);
  assert.throws(() => countCaptionedFigures(`<figure class="diagram" data-diagram="abcdef12">${view}<img src="/x.png" alt="x"><figcaption>코드로 렌더링한 도식. 주제 설명입니다.</figcaption></figure>`, reg, 'p'), /must not contain an <img>/);
});
