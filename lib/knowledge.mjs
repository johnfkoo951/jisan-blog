// 지식 지도 (연결망 페이지, 글 태그, 목록 필터의 공통 데이터).
// 사람이 정하는 것은 어휘뿐이다: content/knowledge/entities.json 의 대상마다 유형, 정식 표기, 본문 표기(별칭), 한 줄 설명.
// 어느 글이 무엇과 이어지는지는 빌드가 공개 본문에서 별칭을 세어 정한다. 본문에 없는 연결은 만들지 않는다.
import { readFileSync, existsSync } from 'node:fs';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';

export const ENTITY_TYPES = { topic: '주제', concept: '개념', person: '인물', tool: '도구' };
// 그래프 노드 유형 (표시 순서 = 필터 단축키 1~6)
export const NODE_TYPES = { post: '글', series: '시리즈', ...ENTITY_TYPES };

const LATIN = /^[\x00-\x7f]+$/;

// ─────────────────────── 어휘 사전 ───────────────────────
// posts: 그 대상을 다룬다고 확인한 글(slug). 주제는 저자의 분류라 이 목록의 글에만 붙는다.
// 개념·인물·도구는 목록의 글에서는 언급 1점부터, 목록 밖의 글에서는 오인 위험이 낮을 때(isGlobal)만 minWeight 이상에서 이어진다.
export function loadEntities(file) {
  if (!existsSync(file)) return { entities: [], mask: [] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const entities = Object.entries(data.entities || {}).map(([label, e]) => ({
    id: label, label, type: e.type, aliases: [...new Set([label, ...(e.aliases || [])])], note: e.note || '', posts: e.posts || [],
    ...(typeof e.global === 'boolean' ? { global: e.global } : {}),
  }));
  validateEntities(entities);
  return { entities, mask: data.mask || [] };
}

// 목록 밖의 글에서도 별칭만으로 이어도 되는가: 인물·도구는 기본으로 예, 개념은 global: true 를 단 것만(학술어처럼 뜻이 하나인 말).
// 주제는 늘 목록으로만. "차이", "제자리", "자동화" 같은 일상어가 모든 글에 걸리지 않게 한다.
export function isGlobal(e) {
  if (e.type === 'topic') return false;
  return e.global ?? (e.type === 'person' || e.type === 'tool');
}

export function validateEntities(entities) {
  const owner = new Map();
  for (const e of entities) {
    if (!ENTITY_TYPES[e.type]) throw new Error(`knowledge: "${e.label}" has unknown type "${e.type}"`);
    if (e.note.length > 60) throw new Error(`knowledge: note of "${e.label}" is longer than 60 characters`);
    for (const alias of e.aliases) {
      if (typeof alias !== 'string' || alias.trim() !== alias || !alias) throw new Error(`knowledge: bad alias ${JSON.stringify(alias)} in "${e.label}"`);
      const key = alias.toLowerCase();
      if (owner.has(key) && owner.get(key) !== e.id) throw new Error(`knowledge: alias "${alias}" belongs to both "${owner.get(key)}" and "${e.label}"`);
      owner.set(key, e.id);
    }
  }
}

// ─────────────────────── 본문에서 별칭 세기 ───────────────────────
// 긴 별칭부터 찾고, 찾은 자리는 지워서 짧은 별칭이 그 안에서 다시 걸리지 않게 한다
// ("에이전트 하네스" 안의 "하네스", "세례요한" 안의 "요한"). mask 는 세지 않고 지우기만 하는 표기(저자 이름 등).
export function compileMatcher(entities, mask = []) {
  const rules = [];
  for (const m of mask) rules.push({ alias: m, id: null });
  for (const e of entities) for (const alias of e.aliases) rules.push({ alias, id: e.id });
  rules.sort((a, b) => b.alias.length - a.alias.length || a.alias.localeCompare(b.alias));
  return rules.map(({ alias, id }) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 라틴 별칭은 낱말 단위로만 (agent 가 reagent 안에서 걸리지 않게). 한국어는 조사가 붙으므로 부분 문자열.
    const re = LATIN.test(alias) ? new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi') : new RegExp(escaped, 'g');
    return { alias, id, re };
  });
}

export function countMentions(text, matcher) {
  const counts = new Map();
  let rest = text || '';
  for (const { id, re } of matcher) {
    rest = rest.replace(re, (hit) => {
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
      return '\u0000'.repeat(hit.length);
    });
  }
  return counts;
}

// 글 한 편과 대상 하나의 연결 강도를 정하는 점수표.
// 제목과 요약에 나온 대상은 그 글의 주제다. 소제목은 한 절을 통째로 다룬다는 신호다.
// 본문 언급은 많이 나올수록 강해지지만, 반복만으로 다른 신호를 덮지 않게 bodyCap 에서 멈춘다.
// 연결망 페이지의 '찾아보기' 안내문도 이 표에서 만든다.
export const MENTION_WEIGHTS = { title: 6, summary: 4, headings: 2, body: 1, bodyCap: 12 };

// counts = { title, summary, headings, body } — 각 자리에서 별칭이 나온 횟수 (body 는 소제목을 포함한 본문 전체).
export function mentionWeight(counts, w = MENTION_WEIGHTS) {
  return w.body * Math.min(counts.body, w.bodyCap) + w.headings * counts.headings + w.summary * counts.summary + w.title * counts.title;
}

export function postMentions(post, matcher) {
  const fields = {
    title: countMentions(post.title, matcher),
    summary: countMentions(post.summary || '', matcher),
    headings: countMentions((post.headings || []).join('\n'), matcher),
    body: countMentions(post.plain || '', matcher),
  };
  const ids = new Set(Object.values(fields).flatMap((m) => [...m.keys()]));
  return [...ids].map((id) => {
    const counts = Object.fromEntries(Object.entries(fields).map(([k, m]) => [k, m.get(id) || 0]));
    return { id, counts, weight: mentionWeight(counts) };
  }).sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}

// ─────────────────────── 글 태그 ───────────────────────
// frontmatter tags 는 어휘 사전의 정식 표기여야 한다. 주제 태그는 그 주제의 posts 목록에 글이 있어야 하고,
// 개념·인물·도구 태그는 그 글 공개 본문에 언급이 있어야 한다.
export function validateTags(post, mentions, byId) {
  const tags = Array.isArray(post.tags) ? post.tags : post.tags ? [post.tags] : [];
  if (tags.length > 5) throw new Error(`${post.slug}: at most 5 tags (has ${tags.length})`);
  const found = new Set(mentions.map((m) => m.id));
  for (const tag of tags) {
    const e = byId.get(tag);
    if (!e) throw new Error(`${post.slug}: tag "${tag}" is not in content/knowledge/entities.json`);
    if (e.type === 'topic' ? !e.posts.includes(post.slug) : !found.has(tag)) {
      throw new Error(`${post.slug}: tag "${tag}" ${e.type === 'topic' ? 'is a topic that does not list this post' : 'has no mention in the public text'}`);
    }
  }
  return tags;
}

// ─────────────────────── 그래프 ───────────────────────
// minWeight 미만의 연결(지나가는 언급)은 그래프와 목록 필터에서 뺀다. 태그로 단 대상은 강도와 무관하게 남긴다.
export function buildGraph({ posts, entities, mentionsBySlug, seriesMap, minWeight = 2 }) {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const slugs = new Set(posts.map((p) => p.slug));
  for (const e of entities) for (const s of e.posts) if (!slugs.has(s)) throw new Error(`knowledge: "${e.label}" lists unknown post "${s}"`);
  const nodes = [], links = [];
  const degree = new Map();
  const bump = (id) => degree.set(id, (degree.get(id) || 0) + 1);
  for (const p of posts) {
    const id = `post:${p.slug}`;
    nodes.push({ id, type: 'post', label: p.title, short: p.title.split(' — ')[0], slug: p.slug, kind: p.kind || '에세이', date: p.date.slice(0, 10), series: p.series || '', summary: p.summary || '', tags: p.tags || [] });
    const tags = p.tags || [];
    const scanned = new Map((mentionsBySlug.get(p.slug) || []).map((m) => [m.id, m]));
    const linked = new Set();
    for (const e of entities) {
      const m = scanned.get(e.id), listed = e.posts.includes(p.slug), tag = tags.includes(e.id);
      const keep = tag || (e.type === 'topic' ? listed : listed ? !!m : isGlobal(e) && m && m.weight >= minWeight);
      if (!keep) continue;
      // 주제는 본문 낱말이 아니라 분류라 언급이 없어도 minWeight 로 잇는다
      links.push({ source: id, target: e.id, weight: Math.max(m ? m.weight : 0, minWeight), mentions: m ? m.counts.body : 0, tag, listed });
      linked.add(e.id); bump(id); bump(e.id);
    }
    if (p.series) { links.push({ source: id, target: `series:${p.series}`, weight: 8, series: true }); bump(id); bump(`series:${p.series}`); }
  }
  for (const [name, list] of Object.entries(seriesMap)) {
    nodes.push({ id: `series:${name}`, type: 'series', label: name, posts: list.map((p) => p.slug) });
  }
  for (const e of entities) {
    if (!degree.get(e.id)) continue; // 어떤 글에도 이어지지 않은 대상은 그리지 않는다
    nodes.push({ id: e.id, type: e.type, label: e.label, note: e.note, aliases: e.aliases.filter((a) => a !== e.label) });
  }
  for (const n of nodes) n.degree = degree.get(n.id) || 0;
  layout(nodes, links);
  return { nodes, links: links.map(({ source, target, weight, mentions, tag, series }) => ({ s: source, t: target, w: weight, ...(mentions ? { n: mentions } : {}), ...(tag ? { tag: 1 } : {}), ...(series ? { series: 1 } : {}) })), byId };
}

export function nodeRadius(n) {
  if (n.type === 'post') return 7;
  if (n.type === 'series') return 10;
  return Math.min(4 + 1.5 * Math.sqrt(n.degree), 14);
}

// 빌드 시간 배치 (d3-force 의 기본 난수원은 고정 씨앗이라 같은 입력이면 같은 그림이 나온다).
// 한 편에만 이어진 대상(잎)은 힘 계산에서 빼고 그 글 둘레에 원으로 붙인다. 핵심 연결망이 잎에 밀려 흩어지지 않게 하려는 것이다.
export const isLeaf = (n) => n.type !== 'post' && n.type !== 'series' && n.type !== 'topic' && n.degree <= 1;
function layout(nodes, links) {
  for (const n of nodes) n.r = nodeRadius(n);
  const core = nodes.filter((n) => !isLeaf(n));
  const coreIds = new Set(core.map((n) => n.id));
  const coreLinks = links.filter((l) => coreIds.has(l.source) && coreIds.has(l.target)).map((l) => ({ ...l }));
  const sim = forceSimulation(core)
    .force('link', forceLink(coreLinks).id((n) => n.id)
      .distance((l) => l.series ? 30 : 60 + 40 / Math.sqrt(l.weight))
      .strength((l) => l.series ? 0.6 : Math.min(0.08 + l.weight / 50, 0.5)))
    .force('charge', forceManyBody().strength((n) => n.type === 'post' ? -320 : -90 - 14 * Math.sqrt(n.degree)).distanceMax(600))
    .force('collide', forceCollide((n) => n.r + (n.type === 'post' ? 30 : 12)).iterations(2))
    .force('x', forceX(0).strength(0.05))
    .force('y', forceY(0).strength(0.07))
    .stop();
  for (let i = 0; i < 900; i++) sim.tick();
  const pos = new Map(core.map((n) => [n.id, n]));
  const leavesOf = new Map();
  for (const l of links) {
    const leaf = nodes.find((n) => n.id === l.target);
    if (leaf && isLeaf(leaf)) (leavesOf.get(l.source) || leavesOf.set(l.source, []).get(l.source)).push(leaf);
  }
  for (const [postId, leaves] of leavesOf) {
    const c = pos.get(postId); if (!c) continue;
    const ring = Math.min(26 + 1.6 * leaves.length, 58);
    leaves.forEach((leaf, i) => {
      const a = (2 * Math.PI * i) / leaves.length - Math.PI / 2;
      leaf.x = c.x + ring * Math.cos(a); leaf.y = c.y + ring * Math.sin(a); leaf.leaf = true;
    });
  }
  for (const n of nodes) { n.x = Math.round(n.x * 10) / 10; n.y = Math.round(n.y * 10) / 10; delete n.vx; delete n.vy; delete n.index; }
}
