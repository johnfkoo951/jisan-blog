import test from 'node:test';
import assert from 'node:assert/strict';
import { readerKeywords, preferredRelated, articleResources, stringList } from '../lib/reader-metadata.mjs';

test('explicit keywords win, are trimmed/deduplicated and capped', () => {
  const result = readerKeywords({ keywords:[' 직접 지정 ', '직접 지정', '두 번째'], title:'Omnisearch' });
  assert.deepEqual(result, {source:'author',terms:['직접 지정','두 번째']});
  assert.equal(readerKeywords({keywords:Array.from({length:12},(_,i)=>`term${i}`)}).terms.length,8);
});
test('derived keywords need visible lexical evidence, with Latin token boundaries', () => {
  assert.deepEqual(readerKeywords({title:'An unrelated reagent'}),{source:'text',terms:[]});
  const result=readerKeywords({title:'Knowledge connectivity',summary:'루만과 Obsidian의 관계'});
  assert.equal(result.source,'text');assert.equal(result.terms[0],'지식 연결성');
  assert(result.terms.includes('니클라스 루만'));assert(result.terms.includes('옵시디언'));
  assert(!result.terms.includes('LLM Wiki'));
});
test('title emphasis outranks body-only mentions and fallback remains small', () => {
  const result=readerKeywords({title:'Omnisearch',plain:'기록 질문 회고 옵시디언 루만 마크다운 하네스 스키마 PKM'});
  assert.equal(result.terms[0],'Omnisearch');assert(result.terms.length<=6);
});
test('no metadata/evidence does not invent filler keywords', () => {
  assert.deepEqual(readerKeywords({}),{source:'text',terms:[]});
  assert.deepEqual(stringList(null),[]);
});
test('author related posts are first, deduplicated and never self-linked', () => {
  const posts=[{slug:'one'},{slug:'two'},{slug:'three'},{slug:'four'}];
  assert.deepEqual(preferredRelated({slug:'one',relatedPosts:['three','one','three']},[posts[1],posts[2],posts[3]],posts).map(p=>p.slug),['three','two','four']);
});
test('bad author-related targets fail the build instead of becoming broken links', () => {
  assert.throws(()=>preferredRelated({slug:'one',relatedPosts:['missing']},[],[{slug:'one'}]),/Unknown relatedPosts/);
});
test('only already-linked public attachments from this article are surfaced', () => {
  const post={slug:'one',html:'<a href="/images/one/source.html"><b>전체 코드</b></a><a href="/images/one/source.html">again</a><a href="/images/one/paper.pdf">PDF</a><a href="/images/other/private.pdf">Other</a><a href="javascript:alert(1)">bad</a><a href="https://example.com">External</a>'};
  assert.deepEqual(articleResources(post),[{href:'/images/one/source.html',label:'전체 코드'},{href:'/images/one/paper.pdf',label:'PDF'}]);
});

test('attachment extraction rejects traversal and preserves query separators', () => {
  const result=articleResources({slug:'one',html:'<a href="/images/one/../other/paper.pdf">Other</a><a href="/images/one/source.html?a=1&amp;b=2">Code</a>'});
  assert.deepEqual(result,[{href:'/images/one/source.html?a=1&b=2',label:'Code'}]);
});
