import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateImageCaptions} from '../lib/image-captions.mjs';
import {SITE} from '../site.config.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const registry=JSON.parse(read('content/image-captions.json')).images;
test('all published content images have type and topic captions and provenance records',()=>{
 let total=0;
 for(const slug of readdirSync(new URL('dist/posts/',root))){
  const html=read(`dist/posts/${slug}/index.html`).toString();
  const prose=html.split('<div class="prose">')[1].split('<details class="reader-details">')[0];
  total+=validateImageCaptions(prose,registry,slug);
 }
 assert(total>=(SITE.checks?.minCaptionedImages??0));assert(Object.keys(registry).length>=(SITE.checks?.minImageRecords??0));
 for(const [src,record] of Object.entries(registry)) if(src.startsWith('/images/'))assert.equal(createHash('sha256').update(read('content'+src)).digest('hex'),record.sha256,src);
});
test('missing, unclassified and grouped captions fail instead of being inferred',()=>{
 const records={'/x.png':{kind:'ai-illustration',evidence:'test',caption:'AI 생성 일러스트. 주제 설명.'}};
 assert.throws(()=>validateImageCaptions('<img src="/x.png" alt="x">',records,'p'),/lack figure/);
 assert.throws(()=>validateImageCaptions('<figure><img src="/x.png" alt="x"></figure>',records,'p'),/caption\/registry drift/);
 assert.throws(()=>validateImageCaptions('<figure><img src="/x.png" alt="x"><img src="/x.png" alt="x"><figcaption>AI 생성 일러스트. 주제 설명.</figcaption></figure>',records,'p'),/each content image/);
});
