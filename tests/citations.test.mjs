import test from 'node:test';
import assert from 'node:assert/strict';
import { apaBlogCitations, romanizeTitle } from '../lib/citations.mjs';
import { SITE } from '../site.config.mjs';
const { ko, en } = SITE.citation, url = `${SITE.url}/posts/sample/`;
const post={slug:'sample',title:'원문 제목',date:'2026-10-17T12:30',updated:'2026-10-18',url,citationTitleSource:'원문 제목',citationTitleEn:'Original title',citationTitleRomanized:'Wonmun jemok'};
test('Korean APA application preserves full-name punctuation and full original date',()=>{
 const c=apaBlogCitations(post).ko;
 assert.equal(c.plain,`${ko.author} (2026. 10. 17.). 원문 제목. ${ko.blog}. ${url}`);
 assert.equal(c.inText,`(${ko.inText}, 2026)`);assert(c.fragment.includes(`<i>${ko.blog}</i>`));assert(!c.plain.endsWith('.'));
});
test('English APA blog reference has initials, full date, romanized title and bracketed translation',()=>{
 const c=apaBlogCitations(post).en;
 assert.equal(c.plain,`${en.author} (2026, October 17). Wonmun jemok [Original title]. ${en.blog}. ${url}`);
 assert.equal(c.inText,`(${en.inText}, 2026)`);assert(c.fragment.includes(`<i>${en.blog}</i>`));assert(!c.fragment.includes('<i>Wonmun'));
 assert(c.html.includes('padding-left:0.5in'));assert(c.html.includes('text-indent:-0.5in'));assert(c.html.includes('line-height:2'));
});
test('dates cannot shift by timezone or silently use a UI modification date',()=>{
 const c=apaBlogCitations({...post,date:'2025-12-31T23:59:00-10:00'}).en;
 assert(c.plain.includes('(2025, December 31).'));
 assert.throws(()=>apaBlogCitations({...post,date:'2026-02-30'}),/Invalid citation date/);
});
test('stale or missing title translations stop publication',()=>{
 assert.throws(()=>apaBlogCitations({...post,citationTitleSource:'Old title'}),/drift/);
 assert.throws(()=>apaBlogCitations({...post,citationTitleEn:''}),/Missing bilingual/);
});
test('citation markup escapes content and avoids doubled terminal title periods',()=>{
 const c=apaBlogCitations({...post,title:'질문?',citationTitleSource:'질문?',citationTitleRomanized:'Jilmun?',citationTitleEn:'A question?'});
 assert(!c.ko.plain.includes('?.'));assert(c.en.plain.includes('Jilmun? [A question?].'));
 const unsafe=apaBlogCitations({...post,title:'<img>',citationTitleSource:'<img>'});assert(!unsafe.ko.fragment.includes('<img>'));
});
test('romanization preserves Latin product spelling and checked Korean forms',()=>{
 assert.equal(romanizeTitle('Google 검색 옆에 내 노트를 꺼내 놓기'),'Google geomsaek yeope nae noteureul kkeonae noki');
 assert(romanizeTitle('읽기가 먼저다').startsWith('Ilgiga'));
 assert(romanizeTitle('AI 시대의 기록').startsWith('AI sidaeui girok'));
});
