# drafts — 발행 대기 글

빌드는 `content/posts/`만 읽는다. 여기 있는 글은 라이브에 나가지 않는다.

## 대기 중 (2026-10-26 준비, 하루 한 편)

| slug | 발행일 | 도식 | 비고 |
|---|---|---|---|
| `agent-harness-communication-3` | 2026-10-27 | 3 | 시리즈 3편. 캡션 기록 `agent-harness-communication-3.captions.json` 완성(srcSha256 채움) |
| `agent-harness-communication-4` | 2026-10-28 | 3 | 시리즈 4편. 본문에 `/posts/schema-is-harness/` 내부 링크 1개 |
| `agent-harness-communication-5` | 2026-10-29 | 2 | 시리즈 5편 |
| `agent-harness-communication-6` | 2026-10-30 | 2 | 시리즈 6편. 본문의 "0편" 언급은 0편 미발행이라 평문 |

네 편 모두 2026-10-26에 임시로 `content/posts/`에 넣어 `npm run diagrams`, 빌드(36편), 유출 스캔, 단위·브라우저·도식 테스트를 통과시킨 뒤 되돌렸다. 발행일에는 §사용법 2~4만 하면 된다. 캡션 기록은 이미 완성돼 있으니 `content/image-captions.json` "images"에 그대로 합친다.

## 사용법

1. `content/drafts/{slug}.md`와 `content/drafts/{slug}/hero-{slug}.png`, 캡션 기록 `content/drafts/{slug}.captions.json`을 둔다.
2. 발행일에 `git mv`로 `content/posts/`와 `content/images/{slug}/`로 옮기고 `npm run diagrams`로 도식을 렌더한다. 출력의 `srcSha256`을 캡션 기록에 채워 `content/image-captions.json` "images"에 넣는다.
3. `npm run build && npm test && npm run test:reader && npm run test:diagram-reader` 뒤 유출 스캔, 배포, 라이브 확인, 커밋.
4. 볼트 기록(정본 frontmatter `published` 필드, 발행 기록, 개장 큐레이션, blog-mapping.json)을 같은 턴에 갱신한다.

함정(2026-10-26 실측): `node build.mjs`는 `dist/`를 비우지 않는다. 대기 글을 임시로 `content/posts/`에 넣어 검증한 뒤 되돌리면 `dist/posts/`에 그 글의 폴더가 남아 테스트가 실패하고, 그대로 배포하면 라이브에도 나간다. 임시 검증 뒤에는 `dist/`를 치우고(보호 경로라 `mv`로 격리) 다시 빌드한다. 임시 렌더는 `content/diagrams/_font.json`과 `assets/fonts/`도 바꾸니 `npm run diagrams`로 현재 글 기준으로 되돌린다.

이력: agent-harness-communication-2(시리즈 「소통으로 읽는 에이전트 하네스」 2편)를 2026-10-25 여기 두었다가 2026-10-26 발행했다.
