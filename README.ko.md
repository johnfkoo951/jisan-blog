# 紙散 (지산) — 구요한의 저자 블로그

[🇬🇧 English](README.md) | 🇰🇷 한국어

> **Live**: https://jisan.cmdspace.work

호(號) **紙散(지산)** — "기록을 세상으로 퍼뜨리는 사람" — 명의의 개인 저자 블로그. 에세이와 프레임워크의 **인용·공유 가능한 영속 URL 정본 레이어**다. 옵시디언 볼트에서 쓰고, 정적 페이지로 발행한다.

**Vault-as-CMS**: 마크다운이 마스터, 빌드는 파생. 글은 정적 Markdown으로 유지하며 관리자 패널은 없다. 조회수와 좋아요만 선택적으로 서버 측 Redis REST 저장소를 사용하고, 글 읽기는 저장소에 의존하지 않는다.

## 구조

```
content/posts/*.md     포스트 마스터 (frontmatter: title/slug/date/kind/summary[/updated/firstPublished])
content/images/{slug}/ 글별 이미지 (빌드 시 /images/ 복사; _src/ 는 재생성용 원본)
build.mjs              생성기 — index + posts/{slug}/ + feed.xml + robots.txt + sitemap.xml
assets/                브랜드 로고 + OG 이미지 (v4.3 디자인 표준)
dist/                  빌드 산출 (gitignore)
vercel.json            buildCommand=npm run build · outputDirectory=dist
deploy.sh              빌드 + vercel --prod
```

기능: 라이트/다크 테마 (green `#134538` / pink `#E985A2`), 글별 인용 블록 + 복사 버튼, RSS, 이미지 `<figure>` 자동 승격 (`title` → `<figcaption>`), OG/Twitter 메타 17종.

## 읽기 경험
- 히어로 썸네일이 있는 반응형 글 목록, 한글 전문 검색, `/` 및 Cmd/Ctrl+K 검색, Escape 초기화.
- 접을 수 있는 시리즈와 목차, 읽기 진행 표시, 글자 크기 조절, 네이티브 공유 및 정본 URL 복사.
- 저장소 차단에도 동작하는 테마와 읽기 도구, 키보드 포커스, 본문 건너뛰기, 동작 줄이기 지원.
- 실제 공용 저장소에서 응답받은 조회수와 취소 가능한 좋아요만 표시. 미연결 또는 장애 시 임의 숫자를 표시하지 않는다.

## 조회수와 좋아요 연결
Vercel 서버 환경 변수에 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, 32자 이상의 안전한 무작위 `ENGAGEMENT_COOKIE_SECRET`을 설정한다. 기존 KV 형식 변수도 지원한다. 키를 공개 소스나 브라우저 자산에 넣지 않는다. 정확한 미리보기 도메인은 선택 변수 `ENGAGEMENT_ALLOWED_ORIGIN`으로 허용한다. 상세 계약은 [영문 README](README.md#optional-engagement-setup) 참조.
- 서비스 생성, 요금/보관 조건 수락, 운영 비밀값 설정, 배포는 소유자 승인 후 수행한다. 로컬 빌드만으로 활성화되지 않는다.
- 조회수는 도입 이후부터 집계한다. 화면이 보이는 상태로 연속 8초 후, 익명 브라우저/글/UTC 날짜별 한 번 집계한다. 과거 Analytics 수치와 다르다.
- 좋아요는 익명 브라우저당 하나이며 취소 가능하다. Redis Lua로 원자적으로 처리한다.
- 1년짜리 서명된 HttpOnly/Secure/SameSite=Lax 쿠키를 사용한다. Redis에는 가명 HMAC ID를 기록하고 원시 IP나 이메일은 저장하지 않는다. 일일 중복 방지/요청 제한 키는 만료하며 좋아요 멤버십은 취소 또는 운영 삭제까지 유지한다. 호스팅 로그 보관은 별도다.
- 고유 방문자 수가 아니다. 쿠키 삭제/차단, 기기 변경, 자동화로 늘어날 수 있다. 동일 출처 검사, 알려진 봇 제외, 브라우저별 분당 30회 변경 제한은 기본 방어이며 운영 시 플랫폼 요청 제한과 비용 알림도 설정한다.
- 저장소가 없으면 반응 영역을 숨긴다. 장애를 0회로 바꿔 표시하지 않는다.

## 검증
```bash
npm run build
npm test
node scripts/seo_audit.mjs
```
API 단위 테스트는 Redis 응답을 모의한다. 실제 Redis 연결, 동시 요청, 운영 쿠키와 영속성은 저장소 연결 후 미리보기 배포에서 별도 확인해야 한다. 브라우저에서는 320/390/768/1440px, 검색/장애, 목차, 저장소 차단, 모의 좋아요/취소/조회 흐름을 검사했다.

## 운영

```bash
node build.mjs        # 로컬 빌드 → dist/
./deploy.sh           # 빌드 + 배포 → jisan.cmdspace.work
```

## 규칙

- **slug 불변** — 제목이 바뀌어도 URL 유지 (인용 영속성)
- 라이선스 **CC BY-NC-ND 4.0** — 글마다 인용 블록 + 영속 주소 표기
- 볼트 마크다운이 마스터 — 파생물 역추출 금지
- fidelity-first sanitize: 내부 위키링크는 링크/평문으로, 로컬 경로는 제거 — 산문 자체는 재작성하지 않는다

---

Built by **Yohan Koo (CMDSPACE)** — https://cmdspace.work

## 운영 검증 (2026-10-16)
지산 전용 Upstash Free DB를 Production에만 연결해 실제 조회수·좋아요를 활성화했다. 유료 DB 플랜·Analytics Plus는 활성화하지 않았다.
- 실제 Redis 연동으로 8초 조회, 동일 브라우저/날짜 중복 방지, 좋아요 새로고침 유지·취소, 동시 같은 좋아요 5건을 1건으로 집계, 다른 브라우저의 동일 총계 확인.
- 외부 Origin 거부, 저장소 장애를 모의한 안내·버튼 복구 확인. 지속적인 악용을 완전히 방어한다는 뜻은 아니다.
- 27편 모두 히어로 보유. 누락 2편은 기존 일러스트 재사용. 내부 링크 누락 0, 공개 이미지·외부 URL 70개 응답 확인. HTTP 성공은 외부 내용의 정확성 인증이 아니다.
- 공유 이미지의 PNG/JPEG 형식·크기를 로컬 실제 바이트에서 읽는다. 외부 이미지의 모르는 크기는 지어내지 않고 생략한다.
