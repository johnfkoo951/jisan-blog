// Browser integration for /network/: deep links, IME-safe search, type filters, keyboard, phone width.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dist = path.resolve(__dirname, '../dist');
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/_vercel/') || url.pathname.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(''); return; }
  let name = decodeURIComponent(url.pathname); if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(dist, '.' + name);
  if (!file.startsWith(dist + path.sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff': 'font/woff' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime }); res.end(readFileSync(file));
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const data = JSON.parse(readFileSync(path.join(dist, 'network/index.html'), 'utf8').match(/id="netData">([\s\S]*?)<\/script>/)[1]);
  const passed = [];
  const test = async (name, fn) => { await fn(); passed.push(name); console.log('PASS', name); };
  const open = async (hash = '', width = 1440, scheme = 'light') => {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: scheme });
    const page = await context.newPage(); page.errors = []; page.on('pageerror', (e) => page.errors.push(e.message));
    await page.goto(`${base}/network/${hash}`); await page.waitForSelector('.net-node'); await page.waitForTimeout(200);
    return page;
  };
  const panelTitle = (p) => p.locator('#netPanel h2').innerText();
  try {
    await test('every node is drawn, leaves stay hidden until asked, hub labels are placed', async () => {
      const p = await open();
      assert.equal(await p.locator('.net-node').count(), data.nodes.length);
      const leaf = data.nodes.find((n) => n.leaf);
      if (leaf) {
        assert.equal(await p.locator('.net-node.is-leaf').first().isVisible(), false);
        await p.locator('.net-chip-leaf').click();
        assert.equal(await p.locator('.net-node.is-leaf').first().isVisible(), true);
      }
      assert(await p.locator('.net-node.label-on').count() > 3);
      assert.deepEqual(p.errors, []); await p.context().close();
    });
    await test('#n= deep link selects the node, shows its posts, and panel buttons move the selection', async () => {
      const target = data.nodes.filter((n) => n.type === 'person').sort((a, b) => b.d - a.d)[0];
      const p = await open(`#n=${encodeURIComponent(target.id)}`);
      assert.equal(await panelTitle(p), target.label);
      assert.equal(await p.locator('.net-node.is-selected').count(), 1);
      const first = p.locator('#netPanel .np-posts .np-link').first();
      const postTitle = await first.innerText(); await first.click();
      assert.equal(await panelTitle(p), postTitle);
      assert.match(await p.locator('#netPanel .np-actions a.primary').getAttribute('href'), /^\/posts\/[^/]+\/$/);
      assert.match(decodeURIComponent(await p.evaluate(() => location.hash)), /^#n=post:/);
      assert.deepEqual(p.errors, []); await p.context().close();
    });
    await test('search shows matches while Korean is still composing, then Enter picks the committed match', async () => {
      const target = data.nodes.filter((n) => n.type === 'person' && /[가-힣]/.test(n.label)).sort((a, b) => b.d - a.d)[0];
      const word = target.label.split(' ').at(-1);
      const p = await open(); await p.locator('#netq').focus();
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Input.imeSetComposition', { text: word, selectionStart: word.length, selectionEnd: word.length });
      await p.waitForFunction((label) => !document.querySelector('#netSuggest').hidden && document.querySelector('#netSuggest').textContent.includes(label), target.label, { timeout: 3000 });
      await cdp.send('Input.insertText', { text: word });
      await p.waitForTimeout(150);
      const index = await p.locator('#netSuggest [data-node]').evaluateAll((els, id) => els.findIndex((el) => el.dataset.node === id), target.id);
      assert(index >= 0, 'target is among the suggestions');
      for (let i = 0; i < index; i++) await p.keyboard.press('ArrowDown');
      await p.keyboard.press('Enter');
      assert.equal(await panelTitle(p), target.label);
      assert.deepEqual(p.errors, []); await p.context().close();
    });
    await test('type chips and number keys hide and show a node type; / ? Esc work', async () => {
      const p = await open();
      const chip = p.locator('.net-chip[data-type="concept"]');
      const key = String(await p.locator('.net-chip').evaluateAll((els) => els.findIndex((el) => el.dataset.type === 'concept') + 1));
      await chip.click();
      assert.equal(await chip.getAttribute('aria-pressed'), 'false');
      assert.equal(await p.locator('.net-node[data-type="concept"]:not(.is-hidden)').count(), 0);
      await p.locator('body').click({ position: { x: 5, y: 5 } }); await p.keyboard.press(key);
      assert.equal(await chip.getAttribute('aria-pressed'), 'true');
      await p.keyboard.press('/'); assert.equal(await p.evaluate(() => document.activeElement.id), 'netq');
      await p.keyboard.press('Escape'); await p.locator('body').click({ position: { x: 5, y: 5 } });
      await p.keyboard.press('?'); assert(await p.locator('#netHelp').isVisible());
      await p.keyboard.press('Escape'); assert(await p.locator('#netHelp').isHidden());
      assert.deepEqual(p.errors, []); await p.context().close();
    });
    await test('phone width in dark mode: no page-level horizontal scroll, canvas and panel stacked', async () => {
      const p = await open(`#n=${encodeURIComponent(data.nodes.find((n) => n.type === 'post').id)}`, 390, 'dark');
      assert(await p.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1));
      const [c, panel] = await Promise.all([p.locator('#netCanvas').boundingBox(), p.locator('#netPanel').boundingBox()]);
      assert(panel.y >= c.y + c.height - 1, 'panel sits below the canvas');
      assert.deepEqual(p.errors, []); await p.context().close();
    });
    console.log(`\n${passed.length} network browser scenarios passed (${data.nodes.length} nodes, ${data.links.length} links).`);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { await browser.close(); server.close(); }
})();
