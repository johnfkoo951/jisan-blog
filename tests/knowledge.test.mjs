// 지식 지도: 별칭 세기, 어휘 검증, 태그 검증, 연결 규칙, 빌드 산출물.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { compileMatcher, countMentions, validateEntities, validateTags, buildGraph, mentionWeight, MENTION_WEIGHTS, isGlobal } from '../lib/knowledge.mjs';
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const ent = (label, type, aliases = [], extra = {}) => ({ id: label, label, type, aliases: [label, ...aliases], note: '', posts: [], ...extra });
const post = (slug, plain, extra = {}) => ({ slug, title: slug, summary: '', headings: [], plain, date: '2026-01-01', ...extra });

test('longer aliases win and the masked text is not counted again', () => {
  const m = compileMatcher([ent('에이전트 하네스', 'topic'), ent('하네스', 'concept'), ent('세례요한', 'person'), ent('요한', 'person')], ['구요한']);
  const c = countMentions('에이전트 하네스와 하네스, 세례요한과 구요한', m);
  assert.equal(c.get('에이전트 하네스'), 1);
  assert.equal(c.get('하네스'), 1);
  assert.equal(c.get('세례요한'), 1);
  assert.equal(c.get('요한'), undefined, 'the author name is masked, 세례요한 is consumed');
});

test('Latin aliases match whole tokens only, case-insensitively', () => {
  const m = compileMatcher([ent('RAG', 'concept'), ent('CMDS', 'tool'), ent('Karpathy', 'person')]);
  const c = countMentions('AVERAGE and CMDSPACE are not hits; rag, CMDS and karpathy are.', m);
  assert.equal(c.get('RAG'), 1); assert.equal(c.get('CMDS'), 1); assert.equal(c.get('Karpathy'), 1);
});

test('vocabulary validation rejects shared aliases, unknown types and long notes', () => {
  assert.throws(() => validateEntities([ent('A', 'concept', ['x']), ent('B', 'concept', ['X'])]), /belongs to both/);
  assert.throws(() => validateEntities([ent('A', 'thing')]), /unknown type/);
  assert.throws(() => validateEntities([{ ...ent('A', 'concept'), note: 'x'.repeat(61) }]), /longer than 60/);
});

test('tags must be known; topic tags need the post listed, other tags need a mention', () => {
  const byId = new Map([ent('주제', 'topic', [], { posts: ['a'] }), ent('개념', 'concept')].map((e) => [e.id, e]));
  assert.deepEqual(validateTags({ slug: 'a', tags: ['주제', '개념'] }, [{ id: '개념' }], byId), ['주제', '개념']);
  assert.throws(() => validateTags({ slug: 'a', tags: ['없음'] }, [], byId), /not in content\/knowledge/);
  assert.throws(() => validateTags({ slug: 'b', tags: ['주제'] }, [], byId), /topic that does not list/);
  assert.throws(() => validateTags({ slug: 'a', tags: ['개념'] }, [], byId), /no mention/);
  assert.throws(() => validateTags({ slug: 'a', tags: ['1', '2', '3', '4', '5', '6'] }, [], byId), /at most 5/);
});

test('mention weight follows the score table and caps body repetition', () => {
  const w = MENTION_WEIGHTS;
  assert.equal(mentionWeight({ title: 1, summary: 1, headings: 1, body: 100 }), w.title + w.summary + w.headings + w.body * w.bodyCap);
  assert.equal(mentionWeight({ title: 0, summary: 0, headings: 0, body: 1 }), w.body);
});

test('link rules: topics only where listed, plain concepts only where listed, people and global concepts anywhere at minWeight', () => {
  const entities = [
    ent('주제', 'topic', [], { posts: ['a'] }), ent('차이', 'concept', [], { posts: ['a'] }), ent('리좀', 'concept', [], { posts: ['a'], global: true }),
    ent('루만', 'person', [], { posts: ['a'] }), ent('스친 인물', 'person'),
  ];
  assert.equal(isGlobal(entities[1]), false); assert.equal(isGlobal(entities[2]), true); assert.equal(isGlobal(entities[0]), false);
  const posts = [post('a', '차이 리좀 루만'), post('b', '주제 차이 차이 리좀 리좀 루만 루만 스친 인물')];
  const mentionsBySlug = new Map(posts.map((p) => [p.slug, [...countMentions(p.plain, compileMatcher(entities))].map(([id, n]) => ({ id, counts: { title: 0, summary: 0, headings: 0, body: n }, weight: n }))]));
  const run = () => buildGraph({ posts, entities, mentionsBySlug, seriesMap: {}, minWeight: 2 });
  const g = run();
  const linked = (slug) => g.links.filter((l) => l.s === `post:${slug}`).map((l) => l.t).sort();
  assert.deepEqual(linked('a'), ['루만', '리좀', '주제', '차이']);
  assert.deepEqual(linked('b'), ['루만', '리좀'], 'b has 2 mentions of 차이 but 차이 is not global; 스친 인물 has only 1');
  assert.deepEqual(run().nodes.map((n) => [n.id, n.x, n.y]), g.nodes.map((n) => [n.id, n.x, n.y]), 'layout is deterministic');
  assert.ok(!g.nodes.some((n) => n.id === '스친 인물'), 'an entity linked to nothing is not drawn');
});

test('build output: tags on every card and article, filters in the search index, network page with every post', () => {
  const slugs = readdirSync(new URL('content/posts/', root)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  const index = JSON.parse(read('dist/search-index.json'));
  const home = read('dist/index.html');
  for (const row of index) {
    assert(Array.isArray(row.tags) && Array.isArray(row.entities), row.slug);
    for (const tag of row.tags) {
      assert(row.entities.includes(tag), `${row.slug}: tag ${tag} is a graph link`);
      assert(home.includes(`href="/?tag=${encodeURIComponent(tag)}"`), `${row.slug}: tag ${tag} on the card`);
    }
    if (row.series) assert(home.includes(`href="/?series=${encodeURIComponent(row.series)}"`));
  }
  assert(index.every((row) => row.tags.length >= 1), 'every post has at least one tag');
  const html = read('dist/network/index.html');
  const data = JSON.parse(html.match(/id="netData">([\s\S]*?)<\/script>/)[1]);
  const ids = new Set(data.nodes.map((n) => n.id));
  for (const slug of slugs) assert(ids.has(`post:${slug}`), slug);
  for (const l of data.links) assert(ids.has(l.s) && ids.has(l.t), `${l.s} → ${l.t}`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /class="net-index"/);
  assert.match(read('dist/sitemap.xml'), /\/network\/<\/loc>/);
  assert.match(read('dist/llms.txt'), /\/network\//);
});
