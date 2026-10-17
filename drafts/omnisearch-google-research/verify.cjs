// Usage: node verify.cjs <built-site-directory> <canonical-userscript>
// Requires Playwright (or PLAYWRIGHT_MODULE) and installed Chrome.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dist = path.resolve(process.argv[2]);
const canonical = readFileSync(process.argv[3], 'utf8');
const base = 'omnisearch-google-research';
const publicText = readFileSync(path.join(dist, `posts/${base}/index.html`), 'utf8');
assert(!/yohankoo|Obsidian_MBP|omnicontrol|file:\/\/\/|hook:\/\//.test(publicText));
assert(publicText.includes('href="/kind/tech/"'));
assert(readFileSync(path.join(dist, 'kind/tech/index.html'), 'utf8').includes(`/posts/${base}/`));
assert.equal(readFileSync(path.join(dist, `images/${base}/obsidian-omnisearch-google-cmds-v0.14.1.user.js`), 'utf8'), canonical);
const server = createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(dist, '.' + pathname);
    if (!file.startsWith(dist + path.sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    const type = {'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.css':'text/css','.js':'text/javascript','.md':'text/plain'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type}); res.end(readFileSync(file));
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser = await chromium.launch({headless:true,channel:'chrome'});
    try {
        const context = await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
        const page = await context.newPage();
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        const origin=`http://127.0.0.1:${server.address().port}`;
        await page.goto(`${origin}/posts/${base}/`);
        assert.equal(await page.locator('article figure img').count(),5);
        for(const img of await page.locator('article img').all()) {await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());assert((await img.evaluate(el=>el.naturalWidth))>0);}
        await page.evaluate(()=>scrollTo(0,0));
        assert.equal(await page.locator('h1').count(),1);
        assert((await page.locator('h1').innerText()).includes('Google 검색'));
        const og=await page.locator('meta[property="og:image"]').getAttribute('content');
        assert(og.endsWith(`/images/${base}/hero-${base}.png`));
        assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'),'1200');
        assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'),'630');
        const srcLinks=page.locator(`article a[href="/images/${base}/source.html"]`);
        assert.equal(await srcLinks.count(),2);
        if(process.env.TEST_OUTPUT_DIR) await page.screenshot({path:path.join(process.env.TEST_OUTPUT_DIR,'guide-blog-desktop.png')});
        await page.setViewportSize({width:390,height:844});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        if(process.env.TEST_OUTPUT_DIR) await page.screenshot({path:path.join(process.env.TEST_OUTPUT_DIR,'guide-blog-mobile.png')});
        await page.goto(`${origin}/images/${base}/source.html`);
        assert.equal(await page.locator('#source').textContent(),canonical);
        await page.locator('#copy').click();
        assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),canonical);
        assert.equal(await page.locator('#status').innerText(),'전체 코드를 복사했습니다.');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex');
        assert.deepEqual(errors,[]);
        console.log('PASS: tech category, five loaded figures, 1200×630 hero, source links, source-byte identity, clipboard copy, desktop/mobile layout, no runtime errors.');
    } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
