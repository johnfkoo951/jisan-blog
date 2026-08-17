# 紙散 (지산) — 구요한의 저자 블로그

[🇬🇧 English](README.md) | 🇰🇷 한국어

> **Live**: https://jisan.cmdspace.work

호(號) **紙散(지산)** — "기록을 세상으로 퍼뜨리는 사람" — 명의의 개인 저자 블로그. 에세이와 프레임워크의 **인용·공유 가능한 영속 URL 정본 레이어**다. 옵시디언 볼트에서 쓰고, 정적 페이지로 발행한다.

**Vault-as-CMS**: 마크다운이 마스터, 빌드는 파생. 데이터베이스도 관리자 패널도 없다 — `content/posts/*.md` 와 빌드 스크립트 하나.

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
