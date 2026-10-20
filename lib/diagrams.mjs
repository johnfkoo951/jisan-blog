// 코드로 렌더링한 도식 (```mermaid → Pele 정적 SVG).
// 렌더는 로컬 `npm run diagrams`(scripts/diagrams.mjs)가 Chrome으로 하고 content/diagrams/ 에 캐시를 커밋한다.
// build.mjs 는 이 모듈로 캐시만 읽는다. Chrome·Playwright·로컬 글꼴·네트워크가 필요 없다 (Vercel 원격 빌드).
// 정본 모듈과 작성 규칙: cmds-pele (스킬 cmds-diagram, catalog/SURFACES.md 의 지산 블로그 절).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DIAGRAM = {
  widths: [732, 340],          // L: 본문 폭(780 - 2×24), S: 폰(≤540px)
  profile: 'screen',
  family: 'CMDS Pele Sans',    // 도식 전용 Pretendard 부분집합. 본문 글꼴은 바꾸지 않는다.
  font: '"CMDS Pele Sans", "Pretendard", sans-serif',
  mono: '"CMDS Pele Sans", "Pretendard", sans-serif',
  fontFiles: { 400: 'cmds-pele-sans-400.woff', 700: 'cmds-pele-sans-700.woff' },
  minScale: 0.8,               // 이보다 더 줄여야 하면 figure 안에서 가로 스크롤
};
const STALE = 'run npm run diagrams';

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
export const isMermaid = (t) => t.type === 'code' && !t.codeBlockStyle && (t.lang || '').trim().split(/\s+/)[0] === 'mermaid';
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 펜스마다 본문 기준 줄 번호(diagramLine, 1부터)와 목록 항목 안인지(diagramInList)를 단다.
// 인용·목록의 자식 토큰은 접두어를 뗀 텍스트지만 줄 수는 같으므로, 부모의 시작 줄에서 raw 의 줄바꿈을 더해 간다.
const newlines = (s) => (String(s || '').match(/\n/g) || []).length;
function markDiagramTokens(tokens, line, inList) {
  for (const t of tokens) {
    if (isMermaid(t)) { t.diagramLine = line; t.diagramInList = inList; }
    if (t.items) { let at = line; for (const item of t.items) { markDiagramTokens(item.tokens || [], at, true); at += newlines(item.raw); } }
    else if (t.tokens && t.type !== 'paragraph') markDiagramTokens(t.tokens, line, inList);
    line += newlines(t.raw);
  }
}

// 펜스 바로 다음 문단이 *이탤릭 한 덩어리*면 그 문단을 도식 캡션으로 옮긴다 (최상위와 인용 안).
// 도식은 최상위나 인용(>) 안에만 둔다. 목록 항목 안의 펜스는 diagramInList 로 표시되고 빌드와 npm run diagrams 가 거부한다.
export function attachDiagramCaptions(tokens) {
  markDiagramTokens(tokens, 1, false); // 캡션 문단을 떼기 전에 센다
  return attachCaptions(tokens);
}
function attachCaptions(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.tokens && t.type !== 'paragraph') attachCaptions(t.tokens);
    if (t.items) for (const item of t.items) attachCaptions(item.tokens || []);
    if (!isMermaid(t)) continue;
    const gap = tokens[i + 1]?.type === 'space' ? 1 : 0, next = tokens[i + 1 + gap];
    if (next && next.type === 'paragraph' && next.tokens?.length === 1 && next.tokens[0].type === 'em') {
      t.diagramCaption = next.tokens[0].tokens;
      tokens.splice(i + 1, 1 + gap);
    }
  }
  return tokens;
}

// 글 하나의 ```mermaid 소스를 문서 순서대로 (긴 예시 펜스 안의 것은 lexer가 이미 코드로 묶는다).
// build 와 같은 lexer·캡션 규칙을 쓰므로 scripts/diagrams.mjs 가 렌더하는 목록과 빌드가 찾는 목록이 같다.
export function mermaidSources(lexer, body) {
  const out = [];
  const walk = (tokens) => {
    for (const t of tokens) {
      if (isMermaid(t)) out.push({ src: t.text, raw: t.raw, captionMd: t.diagramCaption ? t.diagramCaption.map((x) => x.raw).join('') : '', line: t.diagramLine, inList: t.diagramInList });
      if (t.tokens && t.type !== 'paragraph') walk(t.tokens);
      if (t.items) for (const item of t.items) walk(item.tokens || []);
    }
  };
  walk(attachDiagramCaptions(lexer(body)));
  return out;
}

export const cachePath = (contentDir, slug, sha) => join(contentDir, 'diagrams', slug, `${sha.slice(0, 8)}.json`);
export const pngPath = (contentDir, slug, sha) => join(contentDir, 'images', slug, `diagram-${sha.slice(0, 8)}.png`);

// 캐시가 지금 소스·렌더 설정과 맞는지. 맞지 않으면 사유 문자열, 맞으면 ''.
export function cacheProblem(cache, sha) {
  if (!cache) return 'missing cache';
  if (cache.srcSha256 !== sha) return 'source hash mismatch';
  if (cache.font !== DIAGRAM.font || cache.mono !== DIAGRAM.mono || cache.profile !== DIAGRAM.profile) return 'render settings changed';
  const keys = Object.keys(cache.variants || {}).map(Number).sort((a, b) => b - a);
  if (keys.join() !== [...DIAGRAM.widths].sort((a, b) => b - a).join()) return 'width set changed';
  return '';
}

const svgText = (svg) => svg.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, '').replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([a-f0-9]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(quot|apos|lt|gt|amp);/g, (_, n) => ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' })[n]);
export const glyphsOf = (svgs) => [...new Set(svgs.map(svgText).join(''))].filter((c) => c.trim() && c !== '﻿').sort().join('');

export function createDiagramContext({ contentDir, assetsDir, fontsDir = join(assetsDir, 'fonts'), registry }) {
  let slug = null, file = '', lineOffset = 0, used = [], problems = [];
  const fontInfoPath = join(contentDir, 'diagrams', '_font.json');
  return {
    // name·offset: 오류에 "posts/{파일}:{줄}" 을 적기 위한 파일 이름과 frontmatter 줄 수
    begin(s, { name = '', offset = 0 } = {}) { slug = s; file = name; lineOffset = offset; used = []; problems = []; },
    // marked.parse 가 끝난 뒤 부른다. 렌더러 안에서 던지면 marked 가 "Please report this to ..." 를 붙이므로 문제를 모았다가 여기서 던진다.
    end() {
      const r = used, p = problems; slug = null; used = []; problems = [];
      if (p.length) throw new Error(p.join('\n'));
      return r;
    },
    fontsDir,
    figure(src, captionHtml, { line, inList } = {}) {
      if (!slug) throw new Error('diagram outside a post');
      const where = file && line ? `posts/${file}:${lineOffset + line}` : slug;
      const sha = sha256(src), sha8 = sha.slice(0, 8);
      if (inList) { problems.push(`${where}: a mermaid diagram inside a list item is not supported. Move the fence and its italic caption to the top level or into a blockquote (>).`); return ''; }
      const cacheFile = cachePath(contentDir, slug, sha);
      const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : null;
      const problem = cacheProblem(cache, sha);
      if (problem) { problems.push(`${slug}: diagram ${sha8} ${problem} (content/diagrams/${slug}/${sha8}.json): ${STALE}`); return ''; }
      if (!existsSync(pngPath(contentDir, slug, sha))) { problems.push(`${slug}: diagram ${sha8} PNG missing (content/images/${slug}/diagram-${sha8}.png): ${STALE}`); return ''; }
      if (used.some((u) => u.sha === sha)) { problems.push(`${slug}: the same diagram ${sha8} appears twice; change one source`); return ''; }
      const record = registry[`diagram:${slug}:${sha8}`];
      const alt = record?.alt ? ` role="img" aria-label="${escAttr(record.alt)}"` : '';
      const [wl, ws] = [...DIAGRAM.widths].sort((a, b) => b - a).map(String);
      const L = cache.variants[wl], S = cache.variants[ws];
      const norm = (v, w) => v.svg.split(`-${w}-`).join('-W-');
      const both = norm(L, wl) !== norm(S, ws);
      const view = (v, cls) => `<div class="diagram-view${cls}"${alt} style="--dw:${v.width}px">${v.svg}</div>`;
      used.push({ sha, sha8, type: cache.type, svgs: both ? [L.svg, S.svg] : [L.svg] });
      return `<figure class="diagram cmds-pele${both ? ' has-s' : ''}" data-cp-theme="light" data-diagram="${sha8}"><div class="diagram-scroll">${both ? view(L, ' diagram-l') + view(S, ' diagram-s') : view(L, '')}</div>${captionHtml ? `<figcaption>${captionHtml}</figcaption>` : ''}</figure>\n`;
    },
    // 도식이 있는 글에만 붙는 스타일: 정본 cmds-pele.css + 사이트 토큰 지도 + 도식 전용 글꼴
    styles(usedDiagrams) {
      const pele = readFileSync(join(assetsDir, 'vendor', 'cmds-pele', 'cmds-pele.css'), 'utf8').trim();
      const site = readFileSync(join(assetsDir, 'diagram.css'), 'utf8').trim();
      if (!existsSync(fontInfoPath)) throw new Error(`diagram font subset record missing (content/diagrams/_font.json): ${STALE}`);
      const info = JSON.parse(readFileSync(fontInfoPath, 'utf8'));
      const need = glyphsOf(usedDiagrams.flatMap((d) => d.svgs));
      const missing = [...need].filter((c) => !info.chars.includes(c));
      if (missing.length) throw new Error(`diagram font subset lacks ${missing.slice(0, 12).join('')}: ${STALE}`);
      const faces = Object.entries(DIAGRAM.fontFiles).map(([weight, name]) => {
        const path = join(fontsDir, name);
        if (!existsSync(path) || sha256(readFileSync(path)) !== info.files[name]) throw new Error(`diagram font ${name} missing or changed: ${STALE}`);
        return `@font-face{font-family:"${DIAGRAM.family}";font-style:normal;font-weight:${weight};font-display:block;src:url("/assets/fonts/${name}?v=${info.files[name].slice(0, 8)}") format("woff")}`;
      }).join('\n');
      return `\n${pele}\n${site}\n${faces}`;
    },
  };
}

// RSS·뉴스레터용: 인라인 SVG figure 를 라이트 @2x PNG <img> 로 바꾼다 (피드 리더는 SVG·CSS 변수를 지우거나 무시한다)
export function feedSafeHtml(html, { slug, contentDir, siteUrl }) {
  return html.replace(/<figure class="diagram[^"]*"[^>]*data-diagram="([0-9a-f]{8})"[^>]*>[\s\S]*?<\/figure>/g, (figure, sha8) => {
    const label = /aria-label="([^"]*)"/.exec(figure)?.[1] || '';
    const caption = /<figcaption>[\s\S]*?<\/figcaption>/.exec(figure)?.[0] || '';
    const file = join(contentDir, 'images', slug, `diagram-${sha8}.png`);
    const png = readFileSync(file);
    const w = Math.round(png.readUInt32BE(16) / 2), h = Math.round(png.readUInt32BE(20) / 2);
    return `<figure><img src="${siteUrl}/images/${slug}/diagram-${sha8}.png" alt="${label}" width="${w}" height="${h}">${caption}</figure>`;
  });
}
