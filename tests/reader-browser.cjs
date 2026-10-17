// Browser integration: uses installed Chrome; all engagement requests stay on this local fixture server.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, readdirSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dist = path.resolve(__dirname, '../dist');
const slugs = readdirSync(path.join(dist,'posts'));
const server = createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/engagement/')) {res.writeHead(200,{'Content-Type':'application/json'});res.end('{"enabled":false}');return;}
  if(url.pathname.startsWith('/_vercel/')) {res.writeHead(200,{'Content-Type':'text/javascript'});res.end('');return;}
  let name=decodeURIComponent(url.pathname);if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(dist,'.'+name);
  if(!file.startsWith(dist+path.sep)||!existsSync(file)){res.writeHead(404);res.end();return;}
  let data=readFileSync(file);
  if(url.searchParams.has('legacy')) {
    const html=data.toString();const start=html.indexOf('<div class="reader-panel-controls"');const end=html.indexOf('<main id="main"',start);
    data=Buffer.from(html.slice(0,start)+html.slice(end));
  }
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});res.end(data);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const passed=[];
 const test=async(name,fn)=>{await fn();passed.push(name);console.log('PASS',name);};
 const newPage=async(width=1440,options={})=>{
   const context=await browser.newContext({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write'],...options});
   const page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));return page;
 };
 const goto=async(page,slug='omnisearch-google-research',suffix='')=>{await page.goto(`${base}/posts/${slug}/${suffix}`);await page.waitForFunction(()=>document.documentElement.dataset.readerPanels==='ready');};
 const box=async(page)=>page.locator('.prose').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,width:r.width};});
 const openInfo=async(page)=>{if(await page.locator('#reader-info-panel').isHidden())await page.locator('[data-panel-toggle=info]').click();};
 try {
  const page=await newPage();
  await test(`all ${slugs.length} articles initialize and keep their reading column when toggled`,async()=>{
    for(const slug of slugs){
      await goto(page,slug);const initial=await box(page);
      await openInfo(page);
      assert.deepEqual(await box(page),initial,slug);
      const prose=await page.locator('.prose').boundingBox();const right=await page.locator('#reader-info-panel').boundingBox();
      assert(right.x>=prose.x+prose.width+12,slug);
      if(await page.locator('#reader-toc-panel').isHidden())await page.locator('[data-panel-toggle=toc]').click();
      const left=await page.locator('#reader-toc-panel').boundingBox();assert(left.x+left.width<=prose.x-12,slug);
      await page.locator('[data-panel-close=info]').click();assert.deepEqual(await box(page),initial,slug);
    }
    assert.deepEqual(page.errors,[]);
  });
  await test('wide preference persists across reload and URL/citation copy remains exact',async()=>{
    await goto(page);await openInfo(page);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.readerPanels==='ready');
    assert(await page.locator('#reader-info-panel').isVisible());
    await page.locator('[data-copy-url]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://jisan.cmdspace.work/posts/omnisearch-google-research/');
    const cite=page.locator('#reader-info-panel .cite-copy');const expected=await cite.getAttribute('data-cite');await cite.click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),expected);
  });
  await test('heading click and scroll synchronize active section and child headings',async()=>{
    await goto(page);const target=page.locator('[data-toc-section]').filter({hasText:'10분 안에'}).first();const id=await target.getAttribute('data-toc-section');
    await target.click();await page.waitForFunction(id=>document.querySelector(`[data-toc-section="${id}"]`).getAttribute('aria-current')==='location',id);
    assert.equal(await page.locator(`[data-toc-children="${id}"]`).getAttribute('hidden'),null);
    const child=page.locator(`[data-toc-children="${id}"] a`).first();const childId=await child.getAttribute('data-toc-section');await child.click();
    await page.waitForFunction(id=>document.querySelector(`[data-toc-section="${id}"]`).getAttribute('aria-current')==='location',childId);
    assert.equal(await page.locator('[data-toc-section][aria-current=location]').count(),1);
    await page.locator('[data-copy-section]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),`https://jisan.cmdspace.work/posts/omnisearch-google-research/#${childId}`);
    await child.focus();await page.locator('.prose h2').last().scrollIntoViewIfNeeded();await page.waitForTimeout(50);assert(await child.isVisible());
  });
  await test('shortcuts respect inputs, modifiers and IME composition',async()=>{
    await goto(page);await page.evaluate(()=>{const i=document.createElement('input');i.id='typing-test';document.querySelector('.prose').prepend(i);});
    const input=page.locator('#typing-test');await input.focus();const before=await page.locator('[data-panel-toggle=info]').getAttribute('aria-expanded');await page.keyboard.type('[]');
    assert.equal(await input.inputValue(),'[]');assert.equal(await page.locator('[data-panel-toggle=info]').getAttribute('aria-expanded'),before);
    assert.equal(await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{key:']',bubbles:true,cancelable:true,isComposing:true});document.body.dispatchEvent(e);return e.defaultPrevented;}),false);
    assert.equal(await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{key:'[',ctrlKey:true,bubbles:true,cancelable:true});document.body.dispatchEvent(e);return e.defaultPrevented;}),false);
    await page.evaluate(()=>document.querySelector('#typing-test').remove());
  });
  for(const width of [320,390,768,1024,1280,1360,1920]) await test(`${width}px layout: no overflow, no main-column shift, correct panel mode`,async()=>{
    const p=await newPage(width);await goto(p);const initial=await box(p);
    if(width<1360){
      assert(await p.locator('#reader-toc-panel').isHidden());assert(await p.locator('#reader-info-panel').isHidden());
      await p.locator('[data-panel-toggle=toc]').click();assert.equal(await p.locator('#reader-toc-panel').getAttribute('role'),'dialog');
      assert(await p.locator('#main').evaluate(el=>el.inert));assert.deepEqual(await box(p),initial);
      await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.dataset.panelClose),'toc');
      await p.keyboard.press('Shift+Tab');assert(await p.evaluate(()=>document.querySelector('#reader-toc-panel').contains(document.activeElement)));
      await p.keyboard.press('Escape');assert(await p.locator('#reader-toc-panel').isHidden());
      assert.equal(await p.evaluate(()=>document.activeElement.dataset.panelToggle),'toc');assert.equal(await p.locator('#main').evaluate(el=>el.inert),false);
      await p.locator('[data-panel-toggle=info]').click();assert(await p.locator('#reader-toc-panel').isHidden());
      await p.locator('[data-copy-url]').click();await p.waitForFunction(()=>document.querySelector('#reader-info-panel [data-panel-status]').textContent==='글 주소를 복사했습니다.');assert.equal(await p.locator('#reader-info-panel [data-panel-status]').innerText(),'글 주소를 복사했습니다.');
      const back=p.locator('.reader-backdrop');await back.click({position:{x:2,y:2}});assert(await p.locator('#reader-info-panel').isHidden());
    }else{assert(await p.locator('#reader-toc-panel').isVisible());await openInfo(p);assert.deepEqual(await box(p),initial);}
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(p.errors,[]);await p.context().close();
  });
  await test('narrow TOC navigation closes the drawer and focuses the destination',async()=>{
    const p=await newPage(390);await goto(p);await p.locator('[data-panel-toggle=toc]').click();
    const link=p.locator('[data-toc-section]').first(),id=await link.getAttribute('data-toc-section');await link.click();
    assert(await p.locator('#reader-toc-panel').isHidden());assert.equal(await p.evaluate(()=>document.activeElement.id),id);assert.equal(await p.locator('#main').evaluate(el=>el.inert),false);await p.context().close();
  });
  await test('keyword links prefill archive search and find the source article',async()=>{
    await goto(page);await openInfo(page);const keyword=page.locator('.rail-keywords a').filter({hasText:'Omnisearch'}).first();await keyword.click();
    await page.waitForSelector('#sr:not([hidden])');assert.equal(await page.locator('#q').inputValue(),'Omnisearch');
    assert(await page.locator('#sr a[href="/posts/omnisearch-google-research/"]').count());
  });
  await test('breakpoint changes release modal state and restore wide preferences',async()=>{
    await goto(page);await openInfo(page);await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('#reader-info-panel').hidden);await page.locator('[data-panel-toggle=info]').click();
    await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.documentElement.classList.contains('reader-modal-open'));
    assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);assert(await page.locator('#reader-info-panel').isVisible());
  });
  await test('blocked browser storage does not break panels or reading tools',async()=>{
    const p=await newPage();await p.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});
    await goto(p);await openInfo(p);await p.locator('[data-font-step="1"]').click();assert.equal(await p.locator('.prose').evaluate(el=>el.style.getPropertyValue('--reading-size')),'19px');assert.deepEqual(p.errors,[]);await p.context().close();
  });
  await test('cached legacy HTML retains existing reading tools without sidebar errors',async()=>{
    const p=await newPage();await p.goto(`${base}/posts/omnisearch-google-research/?legacy=1`);await p.locator('[data-font-step="1"]').click();
    assert.equal(await p.locator('.prose').evaluate(el=>el.style.getPropertyValue('--reading-size')),'19px');assert.deepEqual(p.errors,[]);await p.context().close();
  });
  await test('without JavaScript the original inline TOC and article remain usable',async()=>{
    const p=await newPage(390,{javaScriptEnabled:false});await p.goto(`${base}/posts/omnisearch-google-research/`);
    assert(await p.locator('.reader-toc').isVisible());assert(await p.locator('.reader-panel-controls').isHidden());assert(await p.locator('.prose').isVisible());await p.context().close();
  });
  await test('light/dark/reduced-motion and print retain readable content',async()=>{
    await page.setViewportSize({width:1600,height:1000});await goto(page);await openInfo(page);
    if(process.env.TEST_OUTPUT_DIR) await page.screenshot({path:path.join(process.env.TEST_OUTPUT_DIR,'reader-sidebars-light.png')});
    await page.locator('#themeToggle').click();await page.emulateMedia({reducedMotion:'reduce'});
    if(process.env.TEST_OUTPUT_DIR) await page.screenshot({path:path.join(process.env.TEST_OUTPUT_DIR,'reader-sidebars-dark.png')});
    await page.emulateMedia({media:'print'});assert(await page.locator('#reader-toc-panel').isHidden());assert(await page.locator('#reader-info-panel').isHidden());assert(await page.locator('.prose').isVisible());
    await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});await page.locator('[data-panel-toggle=info]').click();
    if(process.env.TEST_OUTPUT_DIR) await page.screenshot({path:path.join(process.env.TEST_OUTPUT_DIR,'reader-sidebars-mobile.png')});
  });
  console.log(`\n${passed.length} browser scenarios passed across ${slugs.length} posts.`);
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
