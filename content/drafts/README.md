# drafts — 발행 대기 글

빌드는 `content/posts/`만 읽는다. 여기 있는 글은 라이브에 나가지 않는다.

## 사용법

1. `content/drafts/{slug}.md`와 `content/drafts/{slug}/hero-{slug}.png`, 캡션 기록 `content/drafts/{slug}.captions.json`을 둔다.
2. 발행일에 `git mv`로 `content/posts/`와 `content/images/{slug}/`로 옮기고 `npm run diagrams`로 도식을 렌더한다. 출력의 `srcSha256`을 캡션 기록에 채워 `content/image-captions.json` "images"에 넣는다.
3. `npm run build && npm test && npm run test:reader && npm run test:diagram-reader` 뒤 유출 스캔, 배포, 라이브 확인, 커밋.
4. 볼트 기록(정본 frontmatter `published` 필드, 발행 기록, 개장 큐레이션, blog-mapping.json)을 같은 턴에 갱신한다.

이력: agent-harness-communication-2(시리즈 「소통으로 읽는 에이전트 하네스」 2편)를 2026-10-25 여기 두었다가 2026-10-26 발행했다.
