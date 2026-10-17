// Deterministic reader metadata. Author fields win; fallback terms must occur in public copy.
export const KEYWORD_TERMS = [
  ['Omnisearch', ['Omnisearch']], ['옵시디언', ['옵시디언', 'Obsidian']],
  ['지식 연결성', ['지식 연결성', 'knowledge connectivity']],
  ['니클라스 루만', ['루만', 'Luhmann']], ['제텔카스텐', ['제텔카스텐', 'Zettelkasten']],
  ['질 들뢰즈', ['들뢰즈', 'Deleuze']], ['리좀', ['리좀', 'rhizome']],
  ['자기생산', ['자기생산', 'autopoiesis']], ['소통', ['소통', 'communication']],
  ['LLM Wiki', ['LLM Wiki']], ['Karpathy', ['Karpathy', '카르파시']],
  ['kepano', ['kepano']], ['CMDS Process', ['CMDS Process']],
  ['시스템 파일', ['시스템 파일', 'System Files']], ['하네스', ['하네스', 'harness']],
  ['컨텍스트 엔지니어링', ['컨텍스트 엔지니어링', 'Context Engineering']],
  ['스키마', ['스키마', 'schema']], ['마크다운', ['마크다운', 'Markdown']],
  ['지식관리', ['지식관리', '지식 관리', 'knowledge management']],
  ['PKM', ['PKM']], ['세컨드 브레인', ['세컨드 브레인', '세컨드브레인', 'Second Brain']],
  ['AKM Index', ['AKM Index']], ['PSA Fit', ['PSA Fit', 'Person-System-AI']],
  ['9요한', ['9요한', '9Yohan', '아홉 명의 요한']], ['CmdMD', ['CmdMD']],
  ['Open Knowledge Format', ['Open Knowledge Format', 'OKF']],
  ['생성형 AI', ['생성형 AI', 'generative AI']], ['AI Divide', ['AI Divide', 'AI 디바이드']],
  ['에이전트', ['에이전트', 'agent']], ['메타데이터', ['메타데이터', 'metadata']],
  ['선택적 망각', ['선택적 망각', 'selective forgetting']], ['4C 프레임', ['4C']],
  ['Organizing Dimension', ['Organizing Dimension']], ['요한복음', ['요한복음']],
  ['표적', ['표적']], ['세례요한', ['세례요한']], ['파인만', ['파인만', 'Feynman']],
  ['회고', ['회고']], ['질문', ['질문']], ['기록', ['기록']],
];

export function stringList(value) {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean))];
}

function contains(text, term) {
  const lower = text.toLowerCase(), needle = term.toLowerCase();
  // Latin terms must be tokens, not e.g. 'agent' inside 'reagent'. Korean suffixes remain valid.
  if (/^[\x00-\x7f]+$/.test(term)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(lower);
  }
  return lower.includes(needle);
}

export function readerKeywords(post) {
  const explicit = stringList(post.keywords).filter(s => s.length <= 64).slice(0, 8);
  if (explicit.length) return { source: 'author', terms: explicit };
  const fields = [post.title || '', post.summary || '', (post.headings || []).join(' '), post.plain || ''];
  const weights = [12, 7, 5, 1];
  const ranked = KEYWORD_TERMS.map(([label, aliases], index) => ({ label, index,
    score: fields.reduce((score, text, i) => score + (aliases.some(alias => contains(text, alias)) ? weights[i] : 0), 0),
  })).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return { source: 'text', terms: ranked.slice(0, 6).map(row => row.label) };
}

export function preferredRelated(post, automatic, posts) {
  const lookup = new Map(posts.map(p => [p.slug, p]));
  const result = [];
  for (const slug of stringList(post.relatedPosts)) {
    if (!lookup.has(slug)) throw new Error(`Unknown relatedPosts slug '${slug}' in ${post.slug}`);
    if (slug !== post.slug && !result.some(p => p.slug === slug)) result.push(lookup.get(slug));
  }
  for (const other of automatic) if (other.slug !== post.slug && !result.some(p => p.slug === other.slug)) result.push(other);
  return result.slice(0, 3);
}

export function articleResources(post) {
  const resources = [], seen = new Set();
  for (const [, href, body] of (post.html || '').matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    // Only material already linked from this post's own public attachment directory.
    const decoded = href.replace(/&amp;/g, '&');
    let url;
    try { url = new URL(decoded, 'https://jisan.cmdspace.work'); } catch { continue; }
    if (!decoded.startsWith(`/images/${post.slug}/`) || !url.pathname.startsWith(`/images/${post.slug}/`)
      || !/\.(?:html|pdf|zip|user\.js|txt)$/i.test(url.pathname) || seen.has(decoded)) continue;
    seen.add(decoded);
    resources.push({ href: decoded, label: body.replace(/<[^>]*>/g, '') || '첨부 자료' });
  }
  return resources.slice(0, 6);
}
