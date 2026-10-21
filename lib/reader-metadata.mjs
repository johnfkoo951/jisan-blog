// Deterministic reader metadata. Author fields win; fallback terms must occur in public copy.
// 키워드 사전은 사이트마다 다르므로 site.config.mjs 에 둔다.
export { KEYWORD_TERMS } from '../site.config.mjs';
import { KEYWORD_TERMS, SITE } from '../site.config.mjs';

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

export function readerKeywords(post, terms = KEYWORD_TERMS) {
  const explicit = stringList(post.keywords).filter(s => s.length <= 64).slice(0, 8);
  if (explicit.length) return { source: 'author', terms: explicit };
  const fields = [post.title || '', post.summary || '', (post.headings || []).join(' '), post.plain || ''];
  const weights = [12, 7, 5, 1];
  const ranked = terms.map(([label, aliases], index) => ({ label, index,
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
    try { url = new URL(decoded, SITE.url); } catch { continue; }
    if (!decoded.startsWith(`/images/${post.slug}/`) || !url.pathname.startsWith(`/images/${post.slug}/`)
      || !/\.(?:html|pdf|zip|user\.js|txt)$/i.test(url.pathname) || seen.has(decoded)) continue;
    seen.add(decoded);
    resources.push({ href: decoded, label: body.replace(/<[^>]*>/g, '') || '첨부 자료' });
  }
  return resources.slice(0, 6);
}
