import { SITE } from '../site.config.mjs';
const PREFIX = {
  'ai-illustration':'AI 생성 일러스트.', 'ai-graphic':'AI 생성 그래픽.',
  'runtime-screenshot':'실제 구동 화면 캡처.', 'settings-screenshot':'실제 설정 화면 캡처.',
  'service-screenshot':'실제 서비스 화면 캡처.', photo:'실제 사진.', reference:'자료 이미지.',
  'rendered-chart':'HTML/CSS로 렌더링한 도표.', unknown:'제작 방식 미확인.',
};
// 코드로 렌더링한 도식(figure.diagram, 인라인 SVG). 이미지와 따로 센다. 기록 키는 diagram:{slug}:{sha8}.
const DIAGRAM_PREFIX = {'code-diagram':'코드로 렌더링한 도식.'};
const decode = text => text.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&(quot|apos|lt|gt|amp);/g,(_,n)=>({quot:'"',apos:"'",lt:'<',gt:'>',amp:'&'})[n]);

// figcaption HTML → 기록과 비교하는 캡션 글자
export const captionText = html => decode(html.replace(/<[^>]*>/g,'')).trim();
// 도식 기록 하나가 빌드 검사를 통과하는지. 통과하면 '', 아니면 빌드 오류와 같은 사유.
// caption 이 null 이면 캡션 줄이 없는 것이다. scripts/diagrams.mjs --check 가 같은 규칙으로 빌드 결과를 미리 판정한다.
export function diagramRecordProblem(record, sha8, caption) {
  if (!record || !DIAGRAM_PREFIX[record.kind] || !record.evidence || !/^[0-9a-f]{64}$/.test(record.srcSha256 || '') || !record.srcSha256.startsWith(sha8)) return 'missing diagram provenance';
  if (caption == null) return 'needs an italic caption line right after the fence';
  if (caption !== record.caption) return 'caption/registry drift';
  if (!caption.startsWith(DIAGRAM_PREFIX[record.kind]) || caption.length <= DIAGRAM_PREFIX[record.kind].length + 5) return 'missing type/topic caption';
  if (!record.alt) return 'missing diagram alt text';
  return '';
}

function validateDiagram(open, figure, registry, slug) {
  const sha8 = /\bdata-diagram="([0-9a-f]{8})"/.exec(open)?.[1];
  if (!sha8) throw new Error(`${slug}: diagram figure without data-diagram id`);
  const key = `diagram:${slug}:${sha8}`, record = registry[key];
  if (/<img\b/.test(figure)) throw new Error(`${slug}: diagram figure ${sha8} must not contain an <img>`);
  if (diagramRecordProblem(record, sha8, '') === 'missing diagram provenance') throw new Error(`${slug}: missing diagram provenance for ${key}`);
  const cap = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(figure);
  if (!cap) throw new Error(`${slug}: diagram ${sha8} needs an italic caption line right after the fence`);
  const problem = diagramRecordProblem(record, sha8, captionText(cap[1]));
  if (problem && problem !== 'missing diagram alt text') throw new Error(`${slug}: ${problem} for ${key}`);
  const labels = [...figure.matchAll(/<div class="diagram-view[^"]*" role="img" aria-label="([^"]*)"/g)].map(m => decode(m[1]));
  const views = (figure.match(/<div class="diagram-view/g) || []).length;
  if (!record.alt || !views || labels.length !== views || labels.some(l => l !== record.alt)) throw new Error(`${slug}: missing diagram alt text for ${key}`);
}

// { images, diagrams }: 캡션·출처를 확인한 figure 수
export function countCaptionedFigures(html, registry, slug) {
  const all = [...html.matchAll(/<img\b[^>]*>/g)].length;
  const figures = [...html.matchAll(/(<figure\b[^>]*>)([\s\S]*?)<\/figure>/g)];
  let covered = 0, diagrams = 0;
  for (const [, open, figure] of figures) {
    if (/\bclass="diagram\b/.test(open)) { validateDiagram(open, figure, registry, slug); diagrams++; continue; }
    const images = [...figure.matchAll(/<img\b[^>]*>/g)];
    if (images.length !== 1) throw new Error(`${slug}: give each content image its own captioned figure`);
    const src = decode(/\bsrc="([^"]+)"/.exec(images[0][0])?.[1] || '');
    const key = src.startsWith(SITE.url + '/') ? src.slice(SITE.url.length) : src;
    const record = registry[key];
    if (!record || !PREFIX[record.kind] || !record.evidence) throw new Error(`${slug}: missing image provenance for ${src}`);
    const caption = decode(/<figcaption>([\s\S]*?)<\/figcaption>/.exec(figure)?.[1]?.replace(/<[^>]*>/g,'') || '').trim();
    if (caption !== record.caption) throw new Error(`${slug}: caption/registry drift for ${src}`);
    if (!caption.startsWith(PREFIX[record.kind]) || caption.length <= PREFIX[record.kind].length + 5) throw new Error(`${slug}: missing type/topic caption for ${src}`);
    if (!/\balt="[^"]+"/.test(images[0][0])) throw new Error(`${slug}: missing image alt text for ${src}`);
    covered++;
  }
  if (covered !== all) throw new Error(`${slug}: ${all-covered} content images lack figure captions`);
  return { images: covered, diagrams };
}

export function validateImageCaptions(html, registry, slug) {
  return countCaptionedFigures(html, registry, slug).images;
}
