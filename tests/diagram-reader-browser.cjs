// 도식 픽스처 브라우저 검사: 설치된 Chrome, 임시 폴더에 픽스처를 빌드해 로컬 서버로 연다 (네트워크 없음).
// 폭 320~1920 가로 넘침 없음, 폰 폭 S 변형 전환, 라이트/다크/인쇄 토큰, 도식 글꼴 로드, 라벨이 도형 안에 들어가는지.
// TEST_OUTPUT_DIR 를 주면 1280·390 라이트/다크 스크린숏을 남긴다.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), fx = path.join(__dirname, 'fixtures', 'diagrams');
const dist = mkdtempSync(path.join(os.tmpdir(), 'blog-diagram-dist-'));
execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'ignore', env: { ...process.env, JISAN_CONTENT_DIR: path.join(fx, 'content'), JISAN_DIST_DIR: dist, JISAN_DIAGRAM_FONTS_DIR: path.join(fx, 'fonts') } });
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"enabled":false}'); return; }
  if (url.pathname.startsWith('/_vercel/')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(''); return; }
  let name = decodeURIComponent(url.pathname); if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(dist, '.' + name);
  if (!file.startsWith(dist + path.sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff': 'font/woff', '.md': 'text/plain' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime }); res.end(readFileSync(file));
});
(async () => {
  const { SITE } = await import('../site.config.mjs');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/posts/diagram-fixture/`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const out = process.env.TEST_OUTPUT_DIR;
  let passed = 0;
  const test = async (name, fn) => { await fn(); passed++; console.log('PASS', name); };
  const open = async (width, theme = 'light', media = 'screen') => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage(); page.errors = []; page.on('pageerror', (e) => page.errors.push(e.message));
    await page.addInitScript(([k, t]) => { try { localStorage.setItem(k, t); } catch {} }, [SITE.themeStorageKey, theme]);
    await page.emulateMedia({ media });
    await page.goto(base); await page.evaluate(() => document.fonts.ready);
    return page;
  };
  const visible = (page) => page.$$eval('figure.diagram .diagram-view', (vs) => vs.map((v) => getComputedStyle(v).display !== 'none'));
  // 보이는 SVG 안의 라벨 글자 상자가 자기 도형 상자 안에 있는지 (측정 글꼴 = 표시 글꼴 확인)
  const labelOverflow = (page) => page.$$eval('figure.diagram .diagram-view', (views) => {
    const bad = [];
    for (const v of views) {
      if (getComputedStyle(v).display === 'none') continue;
      for (const n of v.querySelectorAll('.pele-node')) {
        const shape = n.querySelector('rect,polygon,circle,ellipse,path'), text = n.querySelector('text');
        if (!shape || !text) continue;
        const s = shape.getBBox(), t = text.getBBox();
        if (t.x < s.x - 1 || t.x + t.width > s.x + s.width + 1) bad.push(`${n.getAttribute('data-id')}: text ${t.width.toFixed(1)} vs box ${s.width.toFixed(1)}`);
      }
    }
    return bad;
  });
  try {
    await test('no horizontal page overflow and the right variant per width', async () => {
      for (const w of [320, 390, 540, 541, 768, 1024, 1280, 1920]) {
        const page = await open(w);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(over <= 0, `${w}px overflows by ${over}px`);
        const v = await visible(page);
        assert.deepEqual(v, w <= 540 ? [false, true, false, true] : [true, false, true, false], `${w}px variants ${v}`);
        assert.deepEqual(await labelOverflow(page), [], `${w}px labels`);
        assert.deepEqual(page.errors, []);
        await page.context().close();
      }
    });
    await test('diagram font subset loads and is the measuring family', async () => {
      const page = await open(1280);
      assert(await page.evaluate(() => document.fonts.check('16px "CMDS Pele Sans"')));
      const fam = await page.$eval('figure.diagram svg.pele', (s) => getComputedStyle(s).fontFamily);
      assert.match(fam, /^"CMDS Pele Sans"/);
      const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.family.includes('CMDS Pele Sans') && f.status === 'loaded').length);
      assert(loaded >= 1, 'subset not loaded');
      // 측정 글꼴(설치된 Pretendard, pele-render 가 잰 것)과 표시 글꼴의 글자 폭이 같아야 한다.
      // 방문자 기기에 Pretendard 가 없을 때를 흉내 내려고 부분집합 뒤에 serif 를 둔다 (빠진 글자가 있으면 폭이 달라진다).
      const widths = async (font) => {
        await page.evaluate((f) => document.querySelectorAll('figure.diagram').forEach((x) => { x.style.setProperty('--cp-font', f); x.style.setProperty('--cp-font-mono', f); }), font);
        await page.evaluate(() => document.fonts.ready);
        return page.$$eval('figure.diagram .diagram-view text', (ts) => ts.filter((t) => t.getClientRects().length).map((t) => +t.getComputedTextLength().toFixed(2)));
      };
      const measured = await widths('"Pretendard"'), subset = await widths('"CMDS Pele Sans", serif'), other = await widths('serif');
      assert(measured.length > 10);
      assert.deepEqual(subset.map((w, i) => Math.abs(w - measured[i]) <= 0.5), measured.map(() => true), 'subset metrics equal the measuring font');
      assert(other.some((w, i) => Math.abs(w - measured[i]) > 2), 'negative control: a different font changes widths');
      assert.deepEqual(await labelOverflow(page), [], 'labels fit with the subset alone');
      await page.context().close();
    });
    const tokens = (page) => page.$eval('figure.diagram', (f) => { const cs = getComputedStyle(f); const node = f.querySelector('.pele-node:not(.cmds-key):not(.cmds-interp) rect'); return { bg: cs.getPropertyValue('--pele-bg').trim(), border: cs.getPropertyValue('--pele-border').trim(), stroke: node && getComputedStyle(node).stroke, accent: cs.getPropertyValue('--pele-accent').trim() }; });
    await test('light, dark and print tokens follow the site theme', async () => {
      const light = await open(1280, 'light'); const L = await tokens(light);
      const dark = await open(1280, 'dark'); const D = await tokens(dark);
      const print = await open(1280, 'dark', 'print'); const P = await tokens(print);
      assert.equal(L.accent, '#134538'); assert.equal(D.accent, '#E985A2');
      assert.equal(L.bg, '#faf9f6'); assert.equal(D.bg, '#101411'); assert.equal(P.bg, '#fff');
      assert.equal(L.stroke, 'rgb(125, 131, 123)'); assert.equal(D.stroke, 'rgb(119, 130, 122)'); assert.equal(P.stroke, 'rgb(125, 131, 123)');
      assert.equal(P.accent, '#134538');
      for (const p of [light, dark, print]) await p.context().close();
    });
    await test('captions are visible below each diagram', async () => {
      const page = await open(390);
      const caps = await page.$$eval('figure.diagram figcaption', (c) => c.map((x) => x.innerText));
      assert.equal(caps.length, 2); assert(caps.every((c) => c.startsWith('코드로 렌더링한 도식.')));
      await page.context().close();
    });
    if (out) await test('screenshots 1280/390 light/dark', async () => {
      for (const theme of ['light', 'dark']) for (const w of [1280, 390]) {
        const page = await open(w, theme);
        await page.locator('figure.diagram').first().scrollIntoViewIfNeeded();
        await page.locator('.prose').screenshot({ path: path.join(out, `diagram-${theme}-${w}.png`) });
        await page.context().close();
      }
    });
    console.log(`\n${passed} diagram browser scenarios passed.`);
  } finally { await browser.close(); server.close(); rmSync(dist, { recursive: true, force: true }); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
