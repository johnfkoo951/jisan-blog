#!/usr/bin/env node
// npm run diagrams — content/posts/*.md 의 ```mermaid 를 Pele 로 미리 렌더해 커밋할 캐시를 만든다 (로컬 전용).
//   content/diagrams/{slug}/{sha8}.json      L(732)·S(340) 인라인 SVG. build.mjs 가 읽는다
//   content/images/{slug}/diagram-{sha8}.png  라이트 @2x PNG. RSS·뉴스레터용
//   assets/fonts/cmds-pele-sans-{400,700}.woff + content/diagrams/_font.json  도식 글자만 담은 Pretendard 부분집합
// 필요: 형제 폴더 ../cmds-pele (CMDS_PELE_DIR), Playwright·fontTools 가 있는 파이썬 (PELE_PYTHON), 로컬 Pretendard.
// 옵션: --check (아무것도 쓰지 않고 낡은 캐시와 빌드를 막을 출처 기록을 보고, 있으면 exit 1) · --force (전부 다시 렌더)
//       --content DIR · --fonts DIR (테스트 픽스처용)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { marked } from 'marked';
import { DIAGRAM, sha256, mermaidSources, cachePath, pngPath, cacheProblem, glyphsOf } from '../lib/diagrams.mjs';
import { captionText, diagramRecordProblem } from '../lib/image-captions.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const CHECK = args.includes('--check'), FORCE = args.includes('--force');
const CONTENT = resolve(opt('--content') || join(ROOT, 'content'));
const FONTS = resolve(opt('--fonts') || join(ROOT, 'assets', 'fonts'));
const PELE = resolve(process.env.CMDS_PELE_DIR || join(ROOT, '..', 'cmds-pele'));
const PY = process.env.PELE_PYTHON || join(homedir(), '.pyenv/versions/3.13.12/bin/python3');
// fontTools 부분집합 + glyf 겹침 플래그 정리. Pretendard 원본은 모든 점에 OVERLAP_SIMPLE(0x40)을 두는데,
// Chrome의 OTS는 첫 점 밖의 0x40을 거부해 글꼴 전체를 버린다(2026-10-20 실측). name 표는 OFL 고지를 위해 모두 남긴다.
const SUBSET_PY = `import sys
from fontTools import subset
src, textfile, out = sys.argv[1:4]
o = subset.Options(); o.flavor = 'woff'; o.layout_features = ['*']; o.name_IDs = ['*']; o.hinting = False; o.desubroutinize = True
font = subset.load_font(src, o)
s = subset.Subsetter(o); s.populate(text=open(textfile, encoding='utf-8').read()); s.subset(font)
glyf = font['glyf']
for n in font.getGlyphOrder():
    g = glyf[n]
    if g.numberOfContours > 0:
        for i in range(1, len(g.flags)): g.flags[i] &= ~0x40
subset.save_font(font, out, o)
`;
const rel = (p) => p.startsWith(ROOT + '/') ? p.slice(ROOT.length + 1) : p;
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
const NEED_PY = `PELE_PYTHON 에 playwright 와 fontTools 가 설치된 파이썬을 지정한다 (지금: ${PY})`;
const pyFailed = (r, what) => { if (r.error) fail(`${what}: ${PY} 를 실행할 수 없다 (${r.error.code || r.error.message}). ${NEED_PY}`); };
let pyReady = false;
const needPython = () => { // 렌더·글꼴 작업 전에 한 번: 파이썬이 있고 두 모듈을 불러오는지
  if (pyReady) return;
  const r = spawnSync(PY, ['-c', 'import playwright, fontTools'], { encoding: 'utf8' });
  pyFailed(r, 'python');
  if (r.status !== 0) fail(`python: ${(r.stderr || '').trim().split('\n').pop()}. ${NEED_PY}`);
  pyReady = true;
};

// 1. 글마다 도식 수집 (build.mjs 와 같은 marked lexer). 도식은 최상위나 인용(>) 안에만 둔다.
const jobs = [], misplaced = [];
const postsDir = join(CONTENT, 'posts');
for (const f of readdirSync(postsDir).filter((x) => x.endsWith('.md')).sort()) {
  const raw = readFileSync(join(postsDir, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const slug = fm && (fm[1].match(/^slug:\s*(.*)$/m)?.[1] || '').trim().replace(/^"|"$/g, '');
  const body = fm ? raw.slice(fm[0].length) : raw;
  if (!slug) continue;
  const before = fm ? fm[0].split('\n').length - 1 : 0;
  const seen = new Set();
  for (const d of mermaidSources(marked.lexer.bind(marked), body)) {
    const line = before + d.line; // 토큰 위치로 센 펜스 첫 줄 (인용·목록 안도 맞다)
    if (d.inList) { misplaced.push(`${rel(join(postsDir, f))}:${line}`); continue; }
    const sha = sha256(d.src);
    if (seen.has(sha)) fail(`${rel(join(postsDir, f))}:${line} 같은 도식이 한 글에 두 번 있다. 하나를 바꾼다.`);
    seen.add(sha);
    jobs.push({ slug, file: join(postsDir, f), line, src: d.src, sha, sha8: sha.slice(0, 8), captionMd: d.captionMd });
  }
}
if (misplaced.length) fail(`목록 항목 안의 mermaid 도식은 지원하지 않는다. 펜스와 이탤릭 캡션을 본문 최상위나 인용(>) 안으로 옮긴다:\n${misplaced.map((m) => `  ${m}`).join('\n')}`);
console.log(`${jobs.length} diagram(s) in ${new Set(jobs.map((j) => j.slug)).size} post(s)`);

const peleStamp = existsSync(join(PELE, 'dist', 'cmds-pele.version.json')) ? JSON.parse(readFileSync(join(PELE, 'dist', 'cmds-pele.version.json'), 'utf8')) : null;
if (jobs.length && !peleStamp) fail(`cmds-pele not found at ${PELE} (set CMDS_PELE_DIR)`);

// 2. 린트: cmds-pele 의 pele-check --surface blog (오류가 있으면 렌더하지 않는다)
const work = mkdtempSync(join(tmpdir(), 'blog-diagrams-'));
const unique = [...new Map(jobs.map((j) => [j.sha, j])).values()];
for (const j of unique) writeFileSync(join(work, `jd-${j.sha8}.mmd`), j.src);
if (unique.length) {
  const r = spawnSync(process.execPath, [join(PELE, 'bin', 'pele-check.mjs'), '--surface', 'blog', '--json', ...unique.map((j) => join(work, `jd-${j.sha8}.mmd`))], { encoding: 'utf8' });
  let report;
  try { report = JSON.parse(r.stdout); } catch { fail(`pele-check failed: ${r.stderr || r.stdout}`); }
  for (const b of report.report) {
    const sha8 = b.file.match(/jd-([0-9a-f]{8})\.mmd$/)[1];
    for (const j of jobs.filter((x) => x.sha8 === sha8)) {
      const head = `${rel(j.file)}:${j.line} ${b.keyword || b.type || '?'}${b.size ? ' ' + b.size.join('×') + 'px' : ''}`;
      console.log(`${b.issues.length ? (b.ok ? 'WARN ' : 'ERROR') : 'OK   '} ${head}`);
      for (const i of b.issues) console.log(`      ${i.level === 'error' ? 'E' : 'W'} ${rel(j.file)}:${j.line + i.line} [${i.code}] ${i.msg}`);
    }
  }
  if (report.errors) fail(`pele-check: ${report.errors} error(s). 고친 뒤 다시 돌린다.`);
}

// 3. 낡은 캐시 판정 (빌드 조건 + 렌더러 버전)
const read = (p) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
const stale = jobs.filter((j) => {
  const cache = read(cachePath(CONTENT, j.slug, j.sha));
  return FORCE || cacheProblem(cache, j.sha) || !existsSync(pngPath(CONTENT, j.slug, j.sha))
    || cache.pele !== peleStamp.pele || cache.cmdsPele !== peleStamp.version;
});
const keep = new Set(jobs.map((j) => `${j.slug}/${j.sha8}`));
const orphans = [];
for (const [dir, re, key] of [['diagrams', /^([0-9a-f]{8})\.json$/, (s, m) => `${s}/${m[1]}`], ['images', /^diagram-([0-9a-f]{8})\.png$/, (s, m) => `${s}/${m[1]}`]]) {
  if (!existsSync(join(CONTENT, dir))) continue;
  for (const s of readdirSync(join(CONTENT, dir), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    for (const f of readdirSync(join(CONTENT, dir, s))) { const m = f.match(re); if (m && !keep.has(key(s, m))) orphans.push(join(CONTENT, dir, s, f)); }
  }
}

if (CHECK) {
  for (const j of stale) console.log(`STALE ${rel(j.file)}:${j.line} ${j.sha8}`);
  for (const o of orphans) console.log(`ORPHAN ${rel(o)}`);
}

// 4. 렌더 (Chromium 한 번으로 묶는다)
if (!CHECK && stale.length) {
  needPython();
  const names = new Map();
  for (const j of new Map(stale.map((x) => [x.sha, x])).values()) {
    const name = ((j.src.match(/^\s*%%\s*@name\s*:\s*(.+?)\s*$/m)?.[1]) || `jd-${j.sha8}`).replace(/[^\w.-]+/g, '-');
    if (names.has(name) && names.get(name).sha !== j.sha) fail(`${rel(j.file)}:${j.line} %% @name: ${name} 이 다른 도식과 겹친다.`);
    names.set(name, j);
  }
  const out = join(work, 'out');
  const r = spawnSync(PY, [join(PELE, 'bin', 'pele-render.py'), ...[...names.values()].map((j) => join(work, `jd-${j.sha8}.mmd`)), '-o', out,
    '--format', 'json,png', '--theme', 'light', '--widths', DIAGRAM.widths.join(','), '--profile', DIAGRAM.profile,
    '--font', DIAGRAM.font, '--mono', DIAGRAM.mono, '--scale', '2'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  process.stdout.write(r.stdout || '');
  pyFailed(r, 'pele-render');
  if (r.status !== 0) fail(`pele-render exit ${r.status}`);
  for (const [name, j] of names) {
    for (const t of stale.filter((x) => x.sha === j.sha)) {
      mkdirSync(dirname(cachePath(CONTENT, t.slug, t.sha)), { recursive: true });
      mkdirSync(dirname(pngPath(CONTENT, t.slug, t.sha)), { recursive: true });
      const cache = JSON.parse(readFileSync(join(out, `${name}.json`), 'utf8'));
      if (cacheProblem(cache, t.sha)) fail(`render output for ${t.sha8} does not match (${cacheProblem(cache, t.sha)})`);
      copyFileSync(join(out, `${name}.json`), cachePath(CONTENT, t.slug, t.sha));
      copyFileSync(join(out, `${name}.png`), pngPath(CONTENT, t.slug, t.sha));
      console.log(`wrote ${rel(cachePath(CONTENT, t.slug, t.sha))}, ${rel(pngPath(CONTENT, t.slug, t.sha))}`);
    }
  }
}
if (!CHECK) for (const o of orphans) { rmSync(o); console.log(`removed orphan ${rel(o)}`); }

// 5. 도식 전용 글꼴 부분집합 (모든 캐시 SVG 의 글자 + ASCII)
const fontInfoPath = join(CONTENT, 'diagrams', '_font.json');
const caches = CHECK ? jobs.map((j) => read(cachePath(CONTENT, j.slug, j.sha))).filter(Boolean) : jobs.map((j) => read(cachePath(CONTENT, j.slug, j.sha)));
const chars = jobs.length ? [...new Set(glyphsOf(caches.flatMap((c) => Object.values(c.variants).map((v) => v.svg))) + Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(''))].sort().join('') : ''; // 공백(U+0020) 포함
const info = read(fontInfoPath);
const fontFresh = info && info.chars === chars && Object.entries(DIAGRAM.fontFiles).every(([, n]) => existsSync(join(FONTS, n)) && sha256(readFileSync(join(FONTS, n))) === info.files[n]);
let fontState = 'unchanged';
if (!jobs.length) {
  if (info || Object.values(DIAGRAM.fontFiles).some((n) => existsSync(join(FONTS, n)))) {
    fontState = 'unused';
    if (!CHECK) { rmSync(fontInfoPath, { force: true }); for (const n of Object.values(DIAGRAM.fontFiles)) rmSync(join(FONTS, n), { force: true }); fontState = 'removed (no diagrams)'; }
  } else fontState = 'none (no diagrams)';
} else if (!fontFresh) {
  fontState = 'stale';
  if (!CHECK) {
    needPython();
    const src = (w) => [join(homedir(), 'Library/Fonts'), '/Library/Fonts'].map((d) => join(d, `Pretendard-${w}.ttf`)).find(existsSync);
    const textFile = join(work, 'chars.txt'); writeFileSync(textFile, chars);
    mkdirSync(FONTS, { recursive: true });
    const files = {};
    for (const [weight, name] of Object.entries(DIAGRAM.fontFiles)) {
      const ttf = src(weight === '700' ? 'Bold' : 'Regular');
      if (!ttf) fail('Pretendard-Regular/Bold.ttf not installed');
      const r = spawnSync(PY, ['-c', SUBSET_PY, ttf, textFile, join(FONTS, name)], { encoding: 'utf8' });
      pyFailed(r, 'fontTools.subset');
      if (r.status !== 0) fail(`fontTools.subset: ${r.stderr}${/ModuleNotFoundError/.test(r.stderr) ? NEED_PY : ''}`);
      files[name] = sha256(readFileSync(join(FONTS, name)));
    }
    mkdirSync(dirname(fontInfoPath), { recursive: true });
    writeFileSync(fontInfoPath, JSON.stringify({ family: DIAGRAM.family, source: 'Pretendard Regular/Bold, SIL OFL 1.1 (license kept in the font name table)', chars, files }, null, 1) + '\n');
    fontState = `regenerated (${chars.length} glyphs, ${Object.values(DIAGRAM.fontFiles).map((n) => Math.round(readFileSync(join(FONTS, n)).length / 1024) + 'KB').join(' + ')})`;
  }
}
console.log(`font subset: ${fontState}`);

// 6. 출처 기록 확인 (content/image-captions.json 의 diagram:{slug}:{sha8}). 빌드의 캡션·출처 검사와 같은 규칙으로 판정한다.
const registry = JSON.parse(readFileSync(join(CONTENT, 'image-captions.json'), 'utf8')).images;
const missing = [];
for (const j of jobs) {
  j.caption = j.captionMd ? captionText(marked.parseInline(j.captionMd)) : null;
  const record = registry[`diagram:${j.slug}:${j.sha8}`];
  const why = record && record.srcSha256 !== j.sha ? 'source hash drift' : diagramRecordProblem(record, j.sha8, j.caption);
  if (why) missing.push({ ...j, why });
}
for (const j of missing) {
  const caption = j.caption ?? '코드로 렌더링한 도식. (펜스 다음 줄에 이탤릭 캡션을 쓴다)';
  const alt = (j.src.match(/^\s*%%\s*@alt\s*:\s*(.+?)\s*$/m)?.[1]) || (j.src.match(/^\s*accDescr\s*:\s*(.+?)\s*$/m)?.[1]) || 'TODO 도식이 보여 주는 구조를 한 문장으로';
  console.log(`\nREGISTRY ${rel(j.file)}:${j.line} ${j.sha8} ${j.why}. 빌드가 실패한다. content/image-captions.json "images"의 기록을 이렇게 맞춘다:\n` + JSON.stringify({ [`diagram:${j.slug}:${j.sha8}`]: {
    kind: 'code-diagram', caption, alt, evidence: `Mermaid source in content/posts/${j.slug}.md; static render by cmds-pele ${peleStamp?.version} (Pele ${peleStamp?.pele}) via npm run diagrams`, srcSha256: j.sha } }, null, 2).slice(2, -2));
}
rmSync(work, { recursive: true, force: true });
const pending = CHECK ? stale.length + orphans.length + (fontState === 'stale' || fontState === 'unused' ? 1 : 0) + missing.length : 0;
console.log(CHECK ? (pending ? `\n${pending} item(s) need attention: run npm run diagrams for STALE, ORPHAN and font; fix content/image-captions.json for REGISTRY${missing.length ? ` (${missing.length} REGISTRY item(s) fail the build)` : ''}` : 'cache up to date') : 'done. next: npm run build && npm test');
process.exit(pending ? 1 : 0);
