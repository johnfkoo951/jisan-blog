const PREFIX = {
  'ai-illustration':'AI 생성 일러스트.', 'ai-graphic':'AI 생성 그래픽.',
  'runtime-screenshot':'실제 구동 화면 캡처.', 'settings-screenshot':'실제 설정 화면 캡처.',
  'service-screenshot':'실제 서비스 화면 캡처.', photo:'실제 사진.', reference:'자료 이미지.',
  'rendered-chart':'HTML/CSS로 렌더링한 도표.', unknown:'제작 방식 미확인.',
};
const decode = text => text.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&(quot|apos|lt|gt|amp);/g,(_,n)=>({quot:'"',apos:"'",lt:'<',gt:'>',amp:'&'})[n]);

export function validateImageCaptions(html, registry, slug) {
  const all = [...html.matchAll(/<img\b[^>]*>/g)].length;
  const figures = [...html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)];
  let covered = 0;
  for (const [, figure] of figures) {
    const images = [...figure.matchAll(/<img\b[^>]*>/g)];
    if (images.length !== 1) throw new Error(`${slug}: give each content image its own captioned figure`);
    const src = decode(/\bsrc="([^"]+)"/.exec(images[0][0])?.[1] || '');
    const key = src.replace(/^https:\/\/jisan\.cmdspace\.work/, '');
    const record = registry[key];
    if (!record || !PREFIX[record.kind] || !record.evidence) throw new Error(`${slug}: missing image provenance for ${src}`);
    const caption = decode(/<figcaption>([\s\S]*?)<\/figcaption>/.exec(figure)?.[1]?.replace(/<[^>]*>/g,'') || '').trim();
    if (caption !== record.caption) throw new Error(`${slug}: caption/registry drift for ${src}`);
    if (!caption.startsWith(PREFIX[record.kind]) || caption.length <= PREFIX[record.kind].length + 5) throw new Error(`${slug}: missing type/topic caption for ${src}`);
    if (!/\balt="[^"]+"/.test(images[0][0])) throw new Error(`${slug}: missing image alt text for ${src}`);
    covered++;
  }
  if (covered !== all) throw new Error(`${slug}: ${all-covered} content images lack figure captions`);
  return covered;
}
