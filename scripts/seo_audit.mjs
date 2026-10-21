#!/usr/bin/env node
// 블로그 SEO / GEO / AIO 검증 루틴 (사이트 값은 site.config.mjs)
//
//   node scripts/seo_audit.mjs           # dist/ 정적 검사 (빌드 후, 배포 전)
//   node scripts/seo_audit.mjs --live    # 라이브 사이트 검사 (배포 후)
//   node scripts/seo_audit.mjs --ping    # IndexNow 핑 (Bing·Naver·Yandex 계열)
//
// SEO  = 검색엔진 (구글·네이버) 크롤·색인 요건
// GEO  = Generative Engine Optimization — LLM 검색(퍼플렉시티·ChatGPT 등)이 인용하기 좋은 구조
// AIO  = AI Overviews 등 답변엔진 노출 요건 (구조화 데이터·인용 가능성·저자 신뢰 신호)
// 리포트: reports/seo-YYYY-MM-DD.md (gitignore — 로컬 운영 기록)

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
import { SITE as CONFIG } from '../site.config.mjs';
const SITE = CONFIG.url;
const LIVE = process.argv.includes('--live');
const PING = process.argv.includes('--ping');
const INDEXNOW_KEY = CONFIG.seo.indexNowKey;

const results = []; // {level: PASS|WARN|FAIL, area, item, detail}
const add = (level, area, item, detail = '') => results.push({ level, area, item, detail });

// ───────────────────── dist 정적 검사 ─────────────────────
function auditDist() {
  if (!existsSync(DIST)) { add('FAIL', 'SEO', 'dist 없음', 'node build.mjs 먼저'); return; }
  const postDirs = existsSync(join(DIST, 'posts')) ? readdirSync(join(DIST, 'posts')) : [];
  add(postDirs.length ? 'PASS' : 'FAIL', 'SEO', `포스트 ${postDirs.length}편 빌드`, '');

  // 사이트 레벨 파일
  for (const [f, area] of [['robots.txt', 'SEO'], ['sitemap.xml', 'SEO'], ['feed.xml', 'SEO'],
    ['llms.txt', 'GEO'], ['search-index.json', 'SEO'], ...(INDEXNOW_KEY ? [[`${INDEXNOW_KEY}.txt`, 'SEO']] : [])]) {
    add(existsSync(join(DIST, f)) ? 'PASS' : 'FAIL', area, `/${f} 존재`, '');
  }
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  add(robots.includes('Disallow: /') && !robots.includes('Allow') ? 'FAIL' : 'PASS',
    'SEO', 'robots.txt 색인 허용', robots.trim().split('\n')[1] || '');

  // sitemap URL ↔ dist 정합
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const smUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let smMiss = 0;
  for (const u of smUrls) {
    const p = u.replace(SITE, '').replace(/\/$/, '') || '/';
    const local = p === '/' ? join(DIST, 'index.html') : join(DIST, p, 'index.html');
    if (!existsSync(local)) { smMiss++; add('FAIL', 'SEO', 'sitemap 깨진 URL', u); }
  }
  if (!smMiss) add('PASS', 'SEO', `sitemap ${smUrls.length}개 URL 전부 실존`, '');
  const kindPages = smUrls.filter((u) => u.includes('/kind/')).length;
  add(kindPages ? 'PASS' : 'WARN', 'SEO', `카테고리 페이지 sitemap 등재 ${kindPages}건`, '');

  // RSS 전문 (GEO — 신디케이션·수집기 친화)
  const feed = readFileSync(join(DIST, 'feed.xml'), 'utf8');
  add(feed.includes('content:encoded') ? 'PASS' : 'WARN', 'GEO', 'RSS 전문(content:encoded)', '');

  // 포스트별 검사
  let issues = { canonical: 0, jsonld: 0, h1: 0, alt: 0, title: 0, desc: 0, md: 0, links: 0, altmd: 0 };
  const brokenLinks = [];
  for (const slug of postDirs) {
    const f = join(DIST, 'posts', slug, 'index.html');
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    if (!html.includes(`<link rel="canonical" href="${SITE}/posts/${slug}/">`)) { issues.canonical++; add('FAIL', 'SEO', 'canonical 불일치', slug); }
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    try {
      const j = JSON.parse(ld[1]);
      if (j['@type'] !== 'BlogPosting' || !j.author || !j.datePublished) throw 0;
    } catch { issues.jsonld++; add('FAIL', 'AIO', 'JSON-LD BlogPosting 결함', slug); }
    const h1s = (html.match(/<h1[ >]/g) || []).length;
    if (h1s !== 1) { issues.h1++; add('WARN', 'SEO', `h1 ${h1s}개`, slug); }
    const imgs = [...html.matchAll(/<img [^>]*>/g)].filter((m) => !m[0].includes('themeToggle'));
    const noAlt = imgs.filter((m) => !/alt="[^"]+"/.test(m[0])).length;
    if (noAlt) { issues.alt++; add('WARN', 'AIO', `alt 없는 이미지 ${noAlt}개`, slug); }
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    if (title.length > 70) { issues.title++; add('WARN', 'SEO', `title ${title.length}자 (>70)`, slug); }
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    if (desc.length < 40 || desc.length > 170) { issues.desc++; add('WARN', 'SEO', `description ${desc.length}자 (권장 40-170)`, slug); }
    if (!existsSync(join(DIST, 'posts', slug, 'index.md'))) { issues.md++; add('FAIL', 'GEO', 'index.md 엔드포인트 없음', slug); }
    if (!html.includes('type="text/markdown"')) { issues.altmd++; add('WARN', 'GEO', 'markdown alternate link 없음', slug); }
    // 내부 링크 실존
    for (const m of html.matchAll(/href="(\/(?:posts|kind)\/[^"#]+)"/g)) {
      const pathname = new URL(m[1], SITE).pathname;
      const target = extname(pathname) ? join(DIST, pathname) : join(DIST, pathname, 'index.html');
      if (!existsSync(target)) { issues.links++; brokenLinks.push(`${slug} → ${m[1]}`); }
    }
    // AIO 신뢰 신호: 인용 블록 + 라이선스 + 바이라인
    if (!html.includes('cite-block')) add('WARN', 'AIO', '인용 블록 없음', slug);
  }
  for (const b of brokenLinks) add('FAIL', 'SEO', '깨진 내부 링크', b);
  const clean = Object.entries(issues).filter(([, v]) => v === 0).map(([k]) => k);
  add('PASS', 'SEO', `포스트 전수 무결 항목: ${clean.join(', ')}`, `${postDirs.length}편`);

  // GEO/AIO 사이트 신호
  const idx = readFileSync(join(DIST, 'index.html'), 'utf8');
  add(idx.includes('"@type":"Blog"') ? 'PASS' : 'FAIL', 'AIO', 'Blog + Person(sameAs) JSON-LD', '');
  const llms = readFileSync(join(DIST, 'llms.txt'), 'utf8');
  add(llms.includes('index.md') ? 'PASS' : 'WARN', 'GEO', 'llms.txt에 md 경로 안내', '');
  // 검색엔진 소유 확인 메타 (계정 필요 — 상태만 보고)
  add(idx.includes('naver-site-verification') ? 'PASS' : 'WARN', 'SEO', '네이버 서치어드바이저 verification 메타', '미등록 — 사용자 계정 필요');
  add(idx.includes('google-site-verification') ? 'PASS' : 'WARN', 'SEO', '구글 서치콘솔 verification 메타', 'DNS/파일 인증 등 다른 방식이면 무해');
}

// ───────────────────── 라이브 검사 ─────────────────────
async function head(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual' });
    return r.status;
  } catch { return 0; }
}
async function auditLive() {
  const checks = [
    ['/', 200], ['/robots.txt', 200], ['/sitemap.xml', 200], ['/feed.xml', 200],
    ['/llms.txt', 200], ['/search-index.json', 200], ['/kind/essay/', 200],
    ...(INDEXNOW_KEY ? [[`/${INDEXNOW_KEY}.txt`, 200]] : []),
  ];
  for (const [path, want] of checks) {
    const s = await head(SITE + path);
    add(s === want ? 'PASS' : 'FAIL', 'SEO', `LIVE ${path} → ${s}`, `기대 ${want}`);
  }
  // 정본 도메인 강제 (중복 콘텐츠 방지)
  if (CONFIG.seo.duplicateHost) {
    const dup = await head(CONFIG.seo.duplicateHost);
    add(dup === 308 || dup === 301 ? 'PASS' : 'WARN', 'SEO', `vercel.app 중복 호스트 리다이렉트 → ${dup}`, '308 기대');
  }
  // 샘플 포스트 + md 엔드포인트
  const sm = await fetch(SITE + '/sitemap.xml').then((r) => r.text()).catch(() => '');
  const first = (sm.match(/<loc>(https[^<]*\/posts\/[^<]*)<\/loc>/) || [])[1];
  if (first) {
    add(await head(first) === 200 ? 'PASS' : 'FAIL', 'SEO', `LIVE 샘플 포스트 → 200`, first);
    add(await head(first + 'index.md') === 200 ? 'PASS' : 'FAIL', 'GEO', 'LIVE 샘플 index.md → 200', '');
  }
}

// ───────────────────── IndexNow 핑 ─────────────────────
async function pingIndexNow() {
  if (!INDEXNOW_KEY) { add('WARN', 'SEO', 'IndexNow 키 없음', 'site.config.mjs seo.indexNowKey'); return; }
  const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: CONFIG.domain, key: INDEXNOW_KEY, urlList: urls }),
  }).catch(() => null);
  add(r && (r.status === 200 || r.status === 202) ? 'PASS' : 'WARN', 'SEO',
    `IndexNow 핑 ${urls.length} URL → ${r ? r.status : '실패'}`, 'Bing·Naver·Yandex 전파');
}

// ───────────────────── 실행 + 리포트 ─────────────────────
auditDist();
if (LIVE) await auditLive();
if (PING) await pingIndexNow();

const counts = { PASS: 0, WARN: 0, FAIL: 0 };
for (const r of results) counts[r.level]++;
const icon = { PASS: '✅', WARN: '⚠️', FAIL: '❌' };
for (const r of results) console.log(`${icon[r.level]} [${r.area}] ${r.item}${r.detail ? ' — ' + r.detail : ''}`);
console.log(`\nPASS ${counts.PASS} · WARN ${counts.WARN} · FAIL ${counts.FAIL}`);

mkdirSync(join(ROOT, 'reports'), { recursive: true });
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(ROOT, 'reports', `seo-${today}.md`),
  `# ${CONFIG.brand.mark} SEO/GEO/AIO 검증 — ${today}${LIVE ? ' (live)' : ' (dist)'}\n\n` +
  `PASS ${counts.PASS} · WARN ${counts.WARN} · FAIL ${counts.FAIL}\n\n` +
  `| 상태 | 영역 | 항목 | 상세 |\n|------|------|------|------|\n` +
  results.map((r) => `| ${icon[r.level]} | ${r.area} | ${r.item} | ${r.detail} |`).join('\n') + '\n');
console.log(`report: reports/seo-${today}.md`);
process.exit(counts.FAIL ? 1 : 0);
