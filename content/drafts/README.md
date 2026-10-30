# drafts — 발행 대기 글

빌드는 `content/posts/`만 읽는다. 여기 있는 글은 라이브에 나가지 않는다.

## 대기 중

없음. 시리즈 「소통으로 읽는 에이전트 하네스」 0~6편이 모두 발행됐다(2026-10-30).

시리즈물을 다시 대기시킬 때: 시리즈 지도 글이 먼저 나갔다면 각 편 발행일에 지도 글의 편별 요약 표에서 그 편의 제목 평문을 `[제목](/posts/{slug}/)` 링크로 바꾼다. 링크만 켜는 것이라 `updated:`는 붙이지 않는다. 미리 만든 캡션 기록의 도식 근거 문구(cmds-pele·Pele 버전)는 발행일의 `npm run diagrams` 출력에 맞춰 고친다.

## 사용법

1. `content/drafts/{slug}.md`와 `content/drafts/{slug}/hero-{slug}.png`, 캡션 기록 `content/drafts/{slug}.captions.json`을 둔다.
2. 발행일에 `git mv`로 `content/posts/`와 `content/images/{slug}/`로 옮기고 `npm run diagrams`로 도식을 렌더한다. 출력의 `srcSha256`을 캡션 기록에 채워 `content/image-captions.json` "images"에 넣는다.
3. `npm run build && npm test && npm run test:reader && npm run test:diagram-reader` 뒤 유출 스캔, 배포, 라이브 확인, 커밋.
4. 볼트 기록(정본 frontmatter `published` 필드, 발행 기록, 개장 큐레이션, blog-mapping.json)을 같은 턴에 갱신한다.

함정(2026-10-26 실측): `node build.mjs`는 `dist/`를 비우지 않는다. 대기 글을 임시로 `content/posts/`에 넣어 검증한 뒤 되돌리면 `dist/posts/`에 그 글의 폴더가 남아 테스트가 실패하고, 그대로 배포하면 라이브에도 나간다. 임시 검증 뒤에는 `dist/`를 치우고(보호 경로라 `mv`로 격리) 다시 빌드한다. 임시 렌더는 `content/diagrams/_font.json`과 `assets/fonts/`도 바꾸니 `npm run diagrams`로 현재 글 기준으로 되돌린다.

이력: agent-harness-communication-2(시리즈 「소통으로 읽는 에이전트 하네스」 2편)를 2026-10-25 여기 두었다가 2026-10-26 발행했다. 3편은 2026-10-26 대기, 2026-10-27 발행(같은 날 0편 추가). 4편은 2026-10-28 발행. 같은 날 `npm run diagrams`가 cmds-pele 0.6.0(Pele 1.12.0)으로 기존 도식도 다시 그렸다. 5편은 2026-10-29 발행. 버전이 같아(cmds-pele 0.6.0, Pele 1.12.0) 5편 도식 둘만 새로 그렸다. 6편은 2026-10-30 발행. 버전이 같아 6편 도식 둘만 새로 그렸고, 10-26에 적어 둔 캡션 기록의 근거 문구(cmds-pele 0.4.0, Pele 1.9.0)를 0.6.0, 1.12.0으로 고쳐 합쳤다.
