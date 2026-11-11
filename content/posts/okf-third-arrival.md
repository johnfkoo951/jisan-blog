---
title: OKF, 같은 구조의 세 번째 도착 — Google Open Knowledge Format와 CMDS
slug: okf-third-arrival
date: 2026-06-17
kind: 프레임워크
tags:
  - "지식관리"
  - "OKF"
  - "독립 수렴"
  - "얇은/두꺼운 하네스"
summary: Google Cloud가 지식을 마크다운+frontmatter 디렉토리로 표현하는 OKF v0.1을 공개했다. Karpathy와 kepano에 이은 세 번째 독립 수렴 — 이번엔 하이퍼스케일러가, 명세 형태로 도착했다. 그리고 OKF의 침묵이 곧 CMDS의 해자다.
updated: 2026-11-11
citationTitleSource: "OKF, 같은 구조의 세 번째 도착 — Google Open Knowledge Format와 CMDS"
citationTitleEn: "OKF, the third arrival at the same structure: Google Open Knowledge Format and CMDS"
citationTitleRomanized: "OKF, gateun gujoui se beonjjae dochak — Google Open Knowledge Format-wa CMDS"
---

![서로 다른 문이 하나의 기록 공간으로 이어지는 모습으로 구조의 독립적 수렴을 표현했다.](/images/okf-third-arrival/hero-okf-third-arrival.jpg "AI 생성 일러스트. 서로 다른 문이 하나의 기록 공간으로 이어지는 모습으로 구조의 독립적 수렴을 표현했다.")


> **작성일**: 2026년 6월 17일 · **분류**: 지식 관리 시스템 비교 분석
> **원본 자료**: GitHub `GoogleCloudPlatform/knowledge-catalog/okf` (SPEC.md + enrichment-agent README)

> **Update (2026-11-05) — 이 보고서는 v0.1 시점(2026-06-17)의 기록이다**
>
> 2026-11-04~05 재실측으로 세 가지가 바뀌었다. ① OKF 는 2026-07-24 **v0.2** 로 provenance·trust·lifecycle 필드(`sources`·`generated`·`verified`·`status`·`stale_after`, 전부 선택 사양)를 더했다 — 아래 "검증 레이어가 없다" 류의 판정은 **"검증 데이터는 있고 검증 운영은 없다"** 로 좁혀 읽어야 한다. ② 정본은 전용 리포 `GoogleCloudPlatform/open-knowledge-format` 로 옮겨갔고 `knowledge-catalog/okf/` 는 frozen snapshot 이다. ③ 서드파티 번들·도구와 AWS 샘플 구현이 확인되어 "채택 0" 류의 표현은 폐기한다. 본문은 역사 기록으로 그대로 두고, 무엇이 남고 무엇이 바뀌었는지는 말미 [후기](#section-23) 에 적었다. 상세 근거: LLM Wiki: 2026-11-04-Q-OKF-v0.2-CMDS-Comparison-Refresh.

## Executive Summary

2026년 6월, **Google Cloud** 가 `knowledge-catalog` 레포에 **Open Knowledge Format (OKF) v0.1 (Draft)** 를 공개했다. OKF 는 *지식* 을 **YAML frontmatter 를 가진 마크다운 파일의 디렉토리** 로 표현하는, 벤더 중립·도구 비종속 포맷이다. 핵심 한 문장: *"If you can `cat` a file, you can read OKF; if you can `git clone` a repo, you can ship it."*

본 보고서의 결론은 넷이다.

1. **OKF 는 CMDS 가 3년째 운영해온 구조에 *독립적으로 다시 도착한* 세 번째 사례다.** [Schema는 Harness다](/posts/schema-is-harness/) 보고서가 "같은 시기 다른 분야에서 독립적으로 같은 구조에 도달 → 그 구조는 보편적" 이라 논증했는데, OKF 가 **Karpathy(LLM Wiki/Autoresearch) · kepano(Obsidian)** 에 이어 *산업·벤더 규모의 세 번째 증인* 이 된다.
2. **OKF 는 의도적으로 L1–L3 만 명세한다.** 통합 L0–L8 레이어 모델(→ LLM Wiki: Unified Knowledge Layer Model) 기준으로, OKF 는 Raw(L1)·Wiki(L2)·Schema(L3) 의 *기질(substrate)* 만 표준화하고 L4–L8(질의·검색·런타임·페르소나·거버넌스)에 대해 침묵한다. **그 침묵이 CMDS 의 해자(moat)다.**
3. **OKF 와 CMDS 는 같은 축의 양 극단이다.** "Schema = Harness" 축(→ LLM Wiki: Agent Harness Design)에서 OKF 는 *얇은 하네스*(필수 필드 `type` 단 하나, "깨진 링크도 관용하라"), CMDS 는 *두꺼운 하네스*(7 필수 프로퍼티 + lint)를 택했다. 둘 다 옳다 — *생산자가 누구인가*(에이전트 대량생성 vs 인간 큐레이션)와 *목적이 무엇인가*(조직 간 교환 vs 교육 자산)에 따른 합리적 반대 선택이다.
4. **OKF 에서 차용할 것이 분명히 있다.** `resource:` URI 필드, conformance(관용적 소비자) 언어, 그리고 무엇보다 **CMDS 스타터킷을 "OKF-conformant" 로 선언** 할 기회.

---

## 1. OKF 개념 정리

### 1.1 무엇인가

OKF 는 *데이터와 시스템을 둘러싼* 메타데이터·맥락·큐레이션된 통찰, 즉 **knowledge** 를 표현하는 포맷이다. "스키마 레지스트리 없음, 중앙 권위 없음, 필수 도구 없음" 을 명시적으로 내세운다. Avro/Protobuf/OpenAPI 같은 도메인 스키마를 *대체* 하지 않고 *참조* 한다.

### 1.2 구조 (SPEC.md 핵심)

| 요소 | 정의 |
|------|------|
| **Knowledge Bundle** | 자기완결적·계층적 지식 문서 모음. *배포 단위*. git/tarball/하위디렉토리로 ship. |
| **Concept** | 지식의 단위 = 마크다운 문서 1개. 테이블·API 같은 자산도, 메트릭·프로세스 같은 추상도 가능. |
| **Concept ID** | 번들 내 파일 경로에서 `.md` 제거 (`tables/users.md` → `tables/users`). |
| **Frontmatter** | YAML 메타데이터. **필수: `type` 단 하나.** 권장: `title`·`description`·`resource`·`tags`·`timestamp`. |
| **Body** | 표준 마크다운. 관용 헤딩: `# Schema`·`# Examples`·`# Citations`. |
| **Link** | 표준 마크다운 링크. 번들 상대(`/path.md`) 권장. **관계는 무유형(untyped)** — 의미는 산문이 전달. |
| **`index.md`** | 예약 파일. 디렉토리 목록 = **progressive disclosure**. |
| **`log.md`** | 예약 파일. 날짜별 변경 이력(최신 우선). |

### 1.3 철학 — 관용적 소비(Permissive Consumption)

OKF 의 conformance 는 단 3개만 요구한다: ① 모든 비예약 `.md` 가 파싱 가능한 frontmatter 를 가질 것, ② 그 안에 비어있지 않은 `type` 이 있을 것, ③ 예약 파일이 규약을 따를 것. 그 외에는 **소비자가 거부하면 안 된다** — 누락 필드·미지의 `type`·깨진 링크·없는 `index.md` 모두 관용. *"OKF 는 번들이 자라고 리팩터되고 부분적으로 에이전트가 생성해도 유용하게 남도록 설계됐다."*

### 1.4 생산자/소비자 분리 (PoC)

- **생산자**: Google [ADK](https://adk.dev/) + Gemini 기반 enrichment agent. BigQuery 메타데이터로 1차 OKF 문서 생성(BQ pass) → LLM 이 시드 URL 을 크롤링하며 권위 있는 문서로 개념을 보강(web pass).
- **소비자**: `visualize` 가 번들을 **단일 자기완결 HTML**(`viz.html`)로 렌더. Cytoscape.js force-directed 그래프 + marked.js 본문 렌더 + "Cited by" 역링크 + 검색/필터. *"포맷이 기여이고, 에이전트와 뷰어는 양 끝을 만질 수 있게 한 PoC 일 뿐."*

---

## 2. 비교 — OKF vs CMDS_LLM_Wiki vs CMDS Mothership

### 2.1 구조 비교표

| 축 | OKF (Google) | CMDS_LLM_Wiki (satellite) | CMDSPACE Mothership |
|----|--------------|---------------------------|---------------------|
| **본질** | *명세*(상호운용 표준) | *운영* 컴파일 위키 (385 wiki docs) | *운영* PKM (8,000+ 노트) |
| **기질** | .md + YAML frontmatter ✅ | .md + YAML ✅ | .md + YAML ✅ |
| **그래프** | 마크다운 링크, 무유형 | `[[wikilink]]` + 유형 frontmatter(`source`/`related`) | `[[wikilink]]` + `CMDS`/`index`/`author` |
| **필수 필드** | **`type` 단 하나** (최대 관용) | wiki-page 스키마(`confidence`·`layer`·`source`…) | **7 프로퍼티** + `/lint` (최대 엄격) |
| **Progressive disclosure** | `index.md` | 🏛 Hub / 24-Maps | 🏛 Head Quarter / 🏷 Index |
| **이력** | `log.md` (디렉토리별) | Queries file-back + git | git + `date modified` |
| **소비자 태도** | 모든 결함 관용 | qmd 하이브리드 검색 | pre-flight + `/lint` |
| **배포 단위** | Knowledge Bundle | satellite vault / 스타터킷 ZIP | cmds-vault 스타터킷 |
| **커버 레이어** | **L1–L3 만** | L1–L8 | L0–L8 |

### 2.2 핵심 발견 — 침묵이 곧 해자

OKF 는 CMDS 의 **L1–L3**(Raw / Wiki / Schema)를 독립 확인한다. 그러나 설계상 *거기서 멈춘다*. L4–L8 에 대해 침묵한다:

- **L4 Query Output** — OKF 엔 질의 산출 개념 없음. CMDS: `/query`, satellite `30. Queries`.
- **L6 Retrieval** — OKF 는 "정적 파일 서버·검색 인덱스로 소비" 라고만. CMDS: qmd 3모드(lex/vec/hyde) + Grep + Graphify.
- **L7 Agent Runtime** — OKF 의 에이전트는 *생산자 PoC* 일 뿐 런타임 하네스 아님. CMDS: 9Yohan(route/mem/comm).
- **L8 Persona** — OKF 엔 사용자/피어 모델 없음. CMDS: BRAIN.md / BRAIN_PROMPT.md.
- **L0 Governance** — OKF 는 번들 단위 배포만. CMDS: 7-vault 합의 모델.

→ OKF 가 표준화한 것은 *구요한이 3년간 운영해온 기질* 이고, 구요한이 쌓은 가치(qmd·Connect→Merge→Develop→Share·9Yohan·7-vault·BRAIN.md)는 **전부 OKF 가 명세하지 않기로 한 레이어** 에 있다.

### 2.3 같은 축의 양 극단 — Schema as Harness

[Schema는 Harness다](/posts/schema-is-harness/) 의 "Schema = Harness" 등치와 Agent Harness Design 의 "what can I stop doing?" 원리로 보면, OKF 와 CMDS 는 *하네스 두께* 축의 반대편이다.

| | OKF (얇은 하네스) | CMDS (두꺼운 하네스) |
|--|------------------|---------------------|
| **필수 규칙** | `type` 1개, "깨진 링크 관용" | 7 프로퍼티 + 들여쓰기/blank-line/wikilink/mermaid rules + lint |
| **생산자** | 에이전트(ADK+Gemini) 대량생성 | 인간 큐레이션(mothership) / 인간+LLM(satellite) |
| **목적** | *조직 간 교환*(상호운용) | *단일 파워유저 + 교육 자산* |
| **"멈출 수 있는 것"** | 거의 전부 멈춤(최대 portability) | 일관성·검토를 위해 하네스 유지 |

→ CLAUDE.md 가 *비공개·엄격·단일 권위* 인 데 비해 Claude Design system prompt 가 *동일 패턴의 반대 입장* 이라는 Agent Harness Design 의 관찰과 정확히 같은 구조다. **하네스 두께는 결함이 아니라 target user × product 에 따른 설계 좌표다.**

---

## 3. 구요한 프레임으로 재해석

### 3.1 RAG vs Compiled Wiki

OKF 는 명백히 *Compiled-Wiki* 진영이다. README 의 *"knowledge curation becomes a normal software-engineering activity"* 는 Schema는 Harness다 의 *"지식 관리는 더 이상 파일 정리가 아니라 소프트웨어 엔지니어링이다"* 와 동일 명제다. 주목할 점: **Google Cloud 가 service-owned 메타데이터 스토어 대신 compiled-wiki(파일)를 권한다** — 즉 벤더가 RAG/DB 가 아니라 누적형 마크다운을 택한 사례.

### 3.2 Sovereign PKM / files-as-truth

OKF 의 *"Portable and lock-in free... no proprietary API stands between you and your metadata"* 는 files-as-truth 테제의 축자적 재진술이다. 이번엔 *구글의 입* 으로 나왔다는 점이 강의·설득에서의 가치.

### 3.3 세 번째 독립 수렴

Schema는 Harness다 의 논제 — *독립적·동시적 도달 = 보편성의 증거* — 의 증인 명단이 늘었다.

| 도착자 | 시점 | 분야 | 산출 |
|--------|------|------|------|
| 구요한 (CMDS) | 2023~ | 지식 관리 | 8,000+ 노트 운영 시스템 |
| kepano (Obsidian) | ~2023 | PKM 도구 | files-over-app 철학 |
| Karpathy | 2026 | ML 연구 자동화 | LLM Wiki · Autoresearch |
| **Google Cloud (OKF)** | **2026-06** | **데이터 카탈로그** | **벤더 중립 *명세*** |

→ 처음으로 *개인/도구/연구자* 가 아니라 *하이퍼스케일러* 가, 그것도 *명세(spec) 형태* 로 도착했다. "한 개인의 취향이 아니라 시대적 필연" 논증이 한 단계 강해진다.

---

## 4. CMDS 가 OKF 에서 차용할 것

1. **`resource:` URI 필드 (가장 구체적 차용)** — OKF 의 유일한 진짜 신규 필드. 개념을 *기저 자산*(BigQuery 테이블 등)에 바인딩한다. CMDS 엔 *아이디어* 를 다루기에 등가물이 없지만, **97+ `api` 타입 노트와 300 Data 카테고리** 에는 `resource:` 바인딩이 실제 가치를 줄 수 있다(노트 ↔ 실제 엔드포인트/데이터셋 URI 연결).
2. **스타터킷의 "OKF-conformance" 선언 (최대 기회)** — `cmds-vault` 와 `cmds-llm-wiki` 는 *이미* OKF 번들이다(md + frontmatter + index). conformance 를 선언하면 어떤 OKF 소비자(Notion·MkDocs·Cytoscape `viz.html`)와도 즉시 상호운용된다. 포지셔닝: **"OKF-호환, 게다가 OKF 가 생략한 5개 레이어까지."**
3. **관용적 소비자 태도** — OKF 의 "번들을 거부하지 말라" 는 *읽기* 측 균형추. CMDS 의 엄격한 *쓰기* 측 lint 와 짝지으면, 외부에서 받은 불완전한 번들도 일단 수용 후 점진 정제하는 워크플로가 명료해진다.
4. **`log.md` 디렉토리별 이력** — CMDS 는 git + `date modified` 로 충분하지만, *공유·배포 vault*(cmds-vault)에서는 사람이 읽는 폴더별 `log.md` 가 기여자 협업에 도움.

### 4.1 OKF 가 못 하는 것 (CMDS 의 해자)

- L4–L8 전부: 검색(qmd), 운영 프로세스(CMDS Process), 멀티에이전트(9Yohan), 페르소나(BRAIN.md), 거버넌스(7-vault).
- 3년+ 운영 이력과 *사람이 가르치는 교육 자산* 으로서의 실체.

---

## 5. 활용 제언

### 5.1 강의·교육 (우선순위 ⭐⭐⭐)

OKF 는 2026년 AI×PKM 강의의 *완벽한 전시물* 이다. "구글 클라우드가 방금, 당신이 2023년부터 해온 것을 *명세로* 발표했습니다" — Karpathy·kepano 옆 **수렴점 #3** 슬라이드. LG 임원·회장단 교육에서 "개인이 먼저 도달한 구조를 산업이 표준화한다" 서사로 즉시 사용 가능.

### 5.2 제품·배포 (우선순위 ⭐⭐)

`cmds-llm-wiki` README/SPEC 에 *OKF-conformance 선언* 추가 검토. 외부 사용자가 자기 OKF 소비 도구로 스타터킷을 바로 열 수 있게 됨 → 배포 도달 확대.

### 5.3 스키마 (우선순위 ⭐)

`resource:` 필드를 `api`/300-Data 노트에 *선택적* 도입 실험. frontmatter 부채를 지기 전 소규모 A/B.

### 5.4 시스템 변경 권고: 없음

Schema는 Harness다 와 동일하게, **OKF 는 검증 자료이지 교정 자료가 아니다.** CMDS 의 디렉토리·스키마·프로세스는 변경 불요.

---

## 6. 결론

OKF 는 CMDS 가 틀렸다고 말하지 않는다. 정반대로 — *구글이 CMDS 의 기질을 표준화했다.* 그러나 OKF 는 기질(L1–L3)에서 멈추고, CMDS 의 진짜 가치는 OKF 가 명세하지 않기로 한 L4–L8 에 있다. 두 시스템은 "Schema = Harness" 축의 양 극단이며 — OKF 는 *교환을 위한 얇은 하네스*, CMDS 는 *교육과 운영을 위한 두꺼운 하네스* — 둘 다 자기 목적에 옳다.

> **"Karpathy 는 발견했고, 구요한은 설계했고, 이제 구글이 표준화했다.
> 같은 구조에 셋이 독립적으로 도착했다는 것은, 그 구조가 시대의 필연임을 다시 증명한다.
> CMDS 의 다음 과제는 그 표준과 *호환* 되면서, 표준이 비워둔 다섯 레이어로 *차별화* 하는 것이다."**

## 후기 (2026-11-05) — OKF v0.2 이후, 무엇이 남고 무엇이 바뀌었나

이 보고서를 쓴 지 다섯 달이 지났다. 위성 볼트에서 Google 의 공식 발표문을 인제스트하며 라이브 리포를 다시 뒤졌고, 6월의 결론 넷을 하나씩 다시 세워 본다.

| 6월의 결론 | 2026-11-05 재판정 |
|---|---|
| ① 세 번째 독립 도착 | **유지, 강화.** 공식 발표문(2026-06-12, McVeety·Hormati)이 Karpathy 의 LLM-wiki gist 를 이름으로 인용하며 "그 패턴을 포맷으로 공식화했다(formalizes)" 고 스스로 말한다. 수렴 서사는 이제 추정이 아니라 발표문의 문장이다. (단, 보존된 SPEC 본문에는 Karpathy 이름이 없다 — 인용은 발표문에 있다.) |
| ② L1–L3 만 명세, 침묵이 해자 | **좁힘.** v0.2 는 여전히 L4–L8(질의·검색·런타임·페르소나·거버넌스)에 침묵한다. 그러나 L3 안에 **검증의 어휘**가 들어왔다 — 누가 생성했고(`generated`), 누가 확인했는지(`verified`, `human:`/`process:` actor), 언제 낡는지(`stale_after`), 폐기됐는지(`status: deprecated`). 해자는 "검증 데이터의 유무" 가 아니라 **검증의 기준·절차·충돌 처리**(ingest 목적 게이트, `/verify` 3기준, `disputed` 보존, Generator≠Verifier) 에 있다. |
| ③ 같은 축의 양 극단 | **유지.** 필수 키는 여전히 `type` 하나, 추가분은 전부 OPTIONAL 이다. 다만 권장 표면은 두꺼워졌다 — 얇은 바닥 위에 선택적 신뢰 층을 얹는 설계로, CMDS 가 v5·v6 에서 밟은 길(검증 상태·provenance 의무화)을 OKF 가 *선택 사양*으로 따라왔다. |
| ④ 차용할 것 | **일부 이행, 일부 추가.** `okf_version` 스탬프는 2026-08-21 위성 `index.md` 에 찍었고 2026-11-05 `"0.2"` 로 올렸다. permissive-intake 는 Inbox Intent Rule 로 명문화됐다(2026-08-17). `resource:` 와 `/export-okf` 는 미착수. 새 차용 후보: `sources[]` 의 credibility signal(`author`·`last_modified`·`usage_count`) 과 per-document `stale_after`. |

두 가지는 솔직하게 고쳐 적는다.

- **"채택 사실상 0" 은 더 쓰지 않는다.** 전용 리포 `GoogleCloudPlatform/open-knowledge-format`(⭐1,306, Apache-2.0) 이 정본이 됐고, `okf_version` 을 선언한 외부 리포가 GitHub 코드 검색에 수만 건(근사치) 잡히며, Claude Code 플러그인 okf-skills(⭐436)·openknowledge CLI 같은 서드파티 도구가 나왔다. 무엇보다 `aws-samples/sample-okf-llm-wiki` — AWS Glue·Redshift 카탈로그를 OKF 번들로 저술해 MCP 로 에이전트에 서빙하는 "Data Wiki" 샘플(2026-07 생성, 2026-11 현재 유지) 이 있다. *구글이 명세하고 AWS 계열이 구현으로 도착했다.* 다만 샘플이지 제품 채택은 아니고, 조직 단위 채택 규모는 여전히 미확인이다.
- **"스타터킷은 이미 OKF 번들" 도 절반만 맞다.** 위성 볼트의 콘텐츠 층(10/20/30/40, 2,489 파일) 은 conformance 규칙 ①②(파싱 가능한 frontmatter·non-empty `type`) 를 전부 충족한다. 그러나 규칙 ③ — 예약 파일 `index.md`·`log.md` 의 형식 — 은 CMDS 규약(index 의 전체 frontmatter, `## [날짜] 작업 | 제목` 로그 헤딩)을 우선하므로 **미충족**이다. "OKF-호환" 은 export 어댑터가 두 파일을 변환할 때 성립하는 말이다.

> **"구글은 기질을 표준화했고, 이제 신뢰의 어휘까지 명세에 올렸다. 그래도 그 어휘로 무엇을 할지 — 언제 의심하고, 누가 확인하고, 충돌을 어떻게 남길지 — 는 여전히 운영의 몫이다. CMDS 의 해자는 포맷이 침묵하는 레이어가 아니라, 포맷이 실어 나르기만 하는 판단을 실제로 내리는 자리에 있다."**

근거(위성 LLM Wiki): LLM Wiki: 2026-11-04-Q-OKF-v0.2-CMDS-Comparison-Refresh · LLM Wiki: OKF Provenance and Trust Families · LLM Wiki: Inferred Credibility vs Stored Confidence · LLM Wiki: Open Knowledge Format (OKF) · LLM Wiki: 2026-11-05-OKF-aws-sample-okf-llm-wiki-inspection.

---

### 참고 자료

- Open Knowledge Format (OKF) v0.1 (2026-06 시점, 역사 기록) — https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md — 2026-08 이후 frozen snapshot
- **OKF 정본 (v0.2, 2026-07-24~; 2026-11-05 추가)** — https://github.com/GoogleCloudPlatform/open-knowledge-format
- 공식 발표문 (2026-06-12; 2026-11-05 추가) — https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/
- AWS 샘플 구현 (2026-11-05 추가) — https://github.com/aws-samples/sample-okf-llm-wiki
- Enrichment Agent (PoC, v0.1 시점) — https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf
- 선행 보고서: [Schema는 Harness다](/posts/schema-is-harness/) · CMDS 시스템 파일 공개본: [system.cmdspace.work](https://system.cmdspace.work)
