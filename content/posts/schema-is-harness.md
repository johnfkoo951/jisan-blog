---
title: Schema는 Harness다 — Karpathy LLM Wiki와 CMDS의 구조적 동치
slug: schema-is-harness
date: 2026-04-07
updated: 2026-08-17
kind: 프레임워크
summary: Karpathy의 LLM Wiki, 구요한의 CMDS, 그리고 Google OKF — 서로 다른 분야에서 독립적으로 같은 구조에 도달했다. RAG는 매번 재유도하지만 Wiki는 누적된다. 그리고 Schema 레이어는 정확히 하네스다.
---
![세 갈래 길이 하나의 3층 구조로 수렴하는 풍경](/images/schema-is-harness/hero-schema-is-harness.jpg)

> Karpathy의 LLM Wiki와 CMDS의 구조적 동치에 관한 보고서 · 2026-04-07 작성, 2026-06-22 OKF 후속 추가

> **Follow-up 구현 (2026-04-14)** — 본 보고서가 "CMDS는 Karpathy의 LLM Wiki를 이미 포함한다"고 논증한 이후, **별도 satellite 볼트로 Karpathy 패턴을 독립 구현**했습니다. 메인 볼트는 통합 PKM을, satellite는 LLM 컴파일 전용을 담당합니다. 구조 공개본: [llm-wiki.cmdspace.work](https://llm-wiki.cmdspace.work)

## Executive Summary

2026년 4월, Andrej Karpathy(전 OpenAI, 전 Tesla AI)는 자신의 GitHub에 "LLM Wiki"라는 새로운 지식 관리 패턴을 제안했다. 핵심 주장은 단순하다. **"RAG는 매번 새로 유도하지만, Wiki는 누적된다(RAG re-derives, Wiki compounds)."** AI 시대에는 휘발성 검색이 아니라 영속적이고 누적되는 지식 산출물이 필요하다는 것이다.

본 보고서는 Karpathy의 LLM Wiki 개념을 [CMDS(커맨드스페이스)](https://system.cmdspace.work) 시스템과 정밀하게 비교한 결과를 정리한다. 결론은 다음과 같다.

1. **CMDS는 Karpathy가 제안한 LLM Wiki의 모든 구조적 요소를 이미 포함하고 있다.** 누락된 개념은 단 하나도 없다.
2. **CMDS는 Karpathy의 제안을 양적·질적으로 능가한다.** 10,000+ 노트, 3년 이상의 운영 이력, 다중 에이전트 지원, 5개 시스템 파일의 precedence 체계를 갖추고 있다.
3. **Karpathy의 워딩 일부는 차용할 가치가 있다.** "Persistent, compounding artifact"와 같은 표현은 CMDS의 가치를 외부에 전달하는 데 효과적이다.
4. **두 시스템 모두 더 큰 패러다임인 "하네스 엔지니어링(Harness Engineering)"의 한 사례다.** Karpathy의 Schema 레이어와 CMDS의 시스템 파일(CLAUDE.md/AGENTS.md/CMDS.md)은 같은 역할을 수행한다.

본 보고서는 CMDS가 단순한 노트 앱 활용기가 아니라 **AI 시대의 지식 컴파일 시스템**임을 입증한다.

## 1. Karpathy의 LLM Wiki 개념 정리

### 1.1 배경

2026년 들어 LLM 기반 워크플로우는 두 가지 한계에 부딪혔다.

첫째, **컨텍스트 윈도우의 비효율**이다. 매번 같은 자료를 LLM에 다시 던져야 한다는 점은 시간과 비용을 낭비한다.

둘째, **RAG(Retrieval-Augmented Generation)의 휘발성**이다. RAG는 질의가 들어올 때마다 벡터 검색을 통해 답을 생성하지만, 그 과정에서 만들어진 통찰은 어디에도 저장되지 않는다. 다음 질의가 들어오면 똑같은 작업을 처음부터 반복한다.

Karpathy가 제안한 해법은 단순하다. **"검색하지 말고, 컴파일하라."**

### 1.2 LLM Wiki의 3-Layer 아키텍처

Karpathy는 다음과 같은 3계층 구조를 제안했다.

| Layer | 역할 | 예시 |
|-------|------|------|
| **Raw Sources** | 변환되지 않은 원본 자료 | PDF, URL, 트랜스크립트 |
| **Wiki** | 정제된 영속적 지식 | 마크다운 노트, 위키페이지 |
| **Schema** | 컴파일 규칙과 지시문 | schema.md, log.md |

핵심 아이디어는 **Raw → Wiki 변환을 명시적으로 관리**한다는 점이다. 원본 자료를 그냥 쌓아두는 것이 아니라, 적극적으로 위키로 "컴파일(compile)"하고, 그 컴파일 규칙을 Schema 파일에 기록한다.

### 1.3 핵심 명제

Karpathy의 글에서 가장 자주 인용되는 문장은 다음과 같다.

> **"RAG re-derives knowledge from scratch every time. Wiki compounds it."**

이 한 문장이 LLM Wiki 개념의 본질이다. 지식은 매번 다시 유도되는 것이 아니라, 누적되어야 한다. 그리고 누적된 지식은 **영속적이고 점진적으로 가치가 증가하는 산출물(persistent, compounding artifact)** 이 된다.

## 2. CMDS 시스템 개요

### 2.1 정의

CMDS(커맨드스페이스)는 구요한이 2023년부터 운영해온 **개인 지식 관리 생태계**다. 단순한 노트 앱 활용기가 아니라 다음과 같은 요소를 갖춘 **시스템**이다.

- **9개 카테고리(100~900) 분류 체계**: Themes → Literature → Data → Methodologies → Products → Specialties → Creatives → Outputs → Divisions
- **CMDS Process**: Connect → Merge → Develop → Share라는 지식 생애주기 워크플로우
- **5개 시스템 파일의 precedence 체계**: CLAUDE.md(1) → AGENTS.md(2) → CMDS.md(3) → 🏛 CMDS Guide(4) → 🏛 CMDS Head Quarter(5)
- **7개 필수 YAML 프로퍼티**: type, aliases, description, author, date created, date modified, tags
- **94개 노트 템플릿, 120+ Obsidian 플러그인**

### 2.2 규모와 성숙도

- **노트 수**: 10,000+
- **운영 기간**: 3년 이상 (2023~현재)
- **카테고리**: 9개 1차 카테고리, 91개 2차 카테고리
- **노트 타입**: 459+ note, 160+ meeting, 130+ terminology, 124+ research-pipeline, 97+ api, 93+ people, 85+ moc, 82+ curriculum, 66+ manuscript

이 규모는 단순 취미 수준이 아니라 **검증된 운영 시스템**임을 의미한다.

### 2.3 철학

CMDS는 다음 7가지 원리를 따른다.

1. 모든 노트는 자기 자리가 있다 (Every note has a home)
2. 링크가 가치를 만든다 (Links create value)
3. 프로세스가 중요하다 (Process matters)
4. 산출물이 목표다 (Output is the goal)
5. AI는 파트너다 (AI is a partner)
6. 표준이 자유를 가능하게 한다 (Standards enable freedom)
7. 완벽보다 진화 (Evolution over perfection)

## 3. 비교 분석

본 절은 Karpathy의 LLM Wiki와 CMDS를 9개 항목에서 직접 비교한다.

### 3.1 구조적 비교표

| 항목 | Karpathy LLM Wiki | CMDS | 평가 |
|------|-------------------|------|------|
| **영속적 위키** | Wiki layer | 30. Permanent Notes + 100~900 카테고리 | CMDS가 더 정교 |
| **스키마/지시문** | schema.md (단일 파일) | CLAUDE.md / AGENTS.md / CMDS.md (5개 파일) | CMDS가 압도 |
| **Raw → Wiki 컴파일** | 수동 promotion | Inbox → Categories (CMDS Process) | 동일 |
| **인덱스 파일** | log.md, index.md | 🏷 Index notes, 🏛 Hub notes | CMDS가 더 풍부 |
| **메타데이터** | YAML frontmatter | 7개 필수 + 선택 프로퍼티 | CMDS가 더 엄격 |
| **크로스 레퍼런스** | Markdown links | Obsidian Wikilinks | 동일 |
| **Source/Wiki 분리** | Raw vs Wiki | 02. Clippings vs 30. Permanent Notes | 동일 |
| **IDE 개념** | (없음) | Obsidian = IDE for Knowledge | CMDS가 우위 |
| **운영 규모** | 제안 단계 | 10,000+ 노트, 3년+ | CMDS가 압도 |

### 3.2 결론

**CMDS는 Karpathy의 LLM Wiki를 완전히 포괄한다.** Karpathy가 제안한 어떤 개념도 CMDS에 누락된 것이 없으며, 오히려 CMDS는 다음 영역에서 LLM Wiki를 능가한다.

1. **다중 에이전트 지원**: Karpathy는 단일 schema를 가정하지만, CMDS는 Claude Code, Gemini CLI, Codex 등 여러 에이전트를 위한 분리된 지시 파일을 운영한다.
2. **Precedence 체계**: 5개 시스템 파일이 우선순위를 가지고 로드되어 컨텍스트 충돌을 방지한다.
3. **인간-AI 이중 문서화**: CMDS는 AI용 문서(CLAUDE.md)와 인간용 문서(🏛 CMDS Head Quarter)를 구분하여 양쪽 모두에게 최적화되어 있다.
4. **운영 검증**: 10,000+ 노트로 3년 이상 운영되며 패턴이 안정적으로 작동함을 입증했다.

## 4. 차용할 가치 있는 Karpathy 워딩

CMDS가 구조적으로 완성되어 있다 하더라도, Karpathy의 표현 중 일부는 **외부 전달력**을 위해 차용할 가치가 있다. Karpathy는 AI 분야의 글로벌 권위자이며, 그의 워딩은 청중에게 즉각적인 신뢰감을 준다.

| 워딩 | 의미 | CMDS 활용처 |
|------|------|--------|
| **"Persistent, compounding artifact"** | 영속적이며 누적되는 산출물 | AI PKM Forum, 하네스 Start-kit 마케팅 |
| **"Cost of maintenance is near zero"** | 유지비용이 0에 수렴 | 클린 볼트 vs CMDS 차별화 메시지 |
| **"RAG re-derives. Wiki compounds."** | RAG는 매번 재유도, Wiki는 누적 | 컨텍스트 엔지니어링 강의 |

이 워딩들은 **CMDS의 핵심을 더 정확히 묘사하기 위한 외부 인용**으로 사용해야 한다. CMDS의 원래 표현(Connect-Merge-Develop-Share, 위키링크 네트워크 등)을 대체하는 것이 아니라 보강하는 것이다.

> 예시 활용 문장:
> *"우리는 이미 3년 전부터 Karpathy가 말한 'persistent, compounding artifact'를 운영해왔습니다. CMDS는 그 증거입니다."*

## 5. 하네스 엔지니어링과의 연결

### 5.1 하네스 엔지니어링이란

2026년 OpenAI의 발언 — *"the agent isn't the hard part — the harness is"* — 이후 AI 업계에는 **하네스 엔지니어링(Harness Engineering)** 이라는 개념이 자리잡았다. 모델 자체보다 모델을 둘러싼 컨텍스트 구조가 결과 품질을 결정한다는 통찰이다.

하네스란 모델에게 다음을 제공하는 구조다.

- **컨텍스트**: 어떤 정보를 줄 것인가
- **지시**: 어떻게 행동할 것인가
- **자원**: 어떤 도구와 산출물에 접근할 수 있는가

### 5.2 Schema = Harness

**Karpathy의 Schema 레이어는 정확히 하네스에 해당한다.** 그리고 CMDS의 CLAUDE.md/AGENTS.md/CMDS.md 역시 같은 역할을 수행한다.

| 하네스 요소 | Karpathy LLM Wiki | CMDS |
|-------------|-------------------|------|
| **Raw Layer** (입력) | Sources (PDFs, URLs) | 00. Inbox / 02. Clippings |
| **Wiki Layer** (정제) | Permanent notes | 30. Permanent Notes + 100~900 카테고리 |
| **Schema Layer** (지시) | schema.md (단일) | CLAUDE.md + AGENTS.md + CMDS.md + 🏛 Guide + 🏛 HQ |

이 매핑은 두 시스템이 서로 다른 영역에서 같은 패턴을 발견했음을 보여준다.

### 5.3 Obsidian = IDE, Markdown = Language, Claude = Engine

CMDS는 한 단계 더 나아가 **3-스택 모델**을 제시한다.

- **Obsidian**: 지식을 위한 IDE (Integrated Development Environment)
- **Markdown**: 인간과 AI가 공유하는 보편 언어
- **Claude**: 지식 컴파일을 수행하는 엔진

이 모델은 Karpathy의 LLM Wiki가 암묵적으로 가정했지만 명시하지 않았던 부분을 명료화한다. **지식 관리는 더 이상 파일 정리가 아니라 소프트웨어 엔지니어링이다.**

## 6. 사례 연구: Karpathy의 Autoresearch

### 6.1 Autoresearch 프로젝트

2026년 3월, Karpathy는 또 다른 프로젝트인 **Autoresearch**를 공개했다. 이 프로젝트는 GitHub에서 58,500+ stars를 받으며 큰 화제가 되었다. Autoresearch는 LLM이 자율적으로 머신러닝 연구를 수행하도록 설계된 시스템이다.

| 파일 | 역할 |
|------|------|
| `program.md` | 인간이 작성한 연구 방향 지시문 |
| `train.py` | AI가 실행하는 학습 코드 |
| `prepare.py` | 불변의 데이터 전처리 코드 |

### 6.2 CMDS와의 구조적 동치

이 구조는 CMDS와 **놀라울 정도로 동치**다.

| Karpathy Autoresearch | CMDS |
|----------------------|------|
| `program.md` (인간 지시) | `CLAUDE.md` (인간 지시) |
| `train.py` (AI 실행) | Skills / Plugins / Subagents |
| `prepare.py` (불변 전처리) | Templates (90. Settings/91. Templates) |

즉, Karpathy가 코드 연구 자동화를 위해 발견한 패턴은 CMDS가 지식 관리를 위해 이미 설계해둔 패턴과 같다. **이는 패턴의 보편성을 입증한다.**

### 6.3 시사점

> **"카르파시는 발견했고, 구요한은 설계했다."**

- 2026년 Karpathy: 코드 연구에서 LLM Wiki / Autoresearch 패턴을 제안
- 2023년~ 구요한: 같은 패턴을 지식 관리에 적용하여 10,000+ 노트로 3년간 운영

이 비교는 단순한 자기 자랑이 아니다. **같은 시기에, 서로 다른 분야에서, 독립적으로 같은 구조에 도달했다는 사실은 그 구조가 보편적임을 강력히 시사한다.** 이는 CMDS가 한 개인의 취향이 아니라 시대적 필연이라는 증거다.

## 6.5 후속: Google OKF — 세 번째 독립 수렴 (2026-06-17 추가)

> **Follow-up (2026-06-17)** — 본 보고서가 "Karpathy와 구요한이 독립적으로 같은 구조에 도달 → 보편성"을 논증한 지 두 달 뒤, **Google Cloud**가 같은 구조를 *명세(spec)*로 발표했다. 상세 비교는 [OKF 비교 분석 보고서](/posts/okf-third-arrival/) 참조.

2026년 6월, Google Cloud가 `knowledge-catalog` 레포에 **Open Knowledge Format (OKF) v0.1**을 공개했다. 지식을 **YAML frontmatter를 가진 마크다운 디렉토리**로 표현하는 벤더 중립 포맷이다 — 이 보고서가 CMDS·LLM Wiki·Autoresearch에서 동일하다고 짚은 바로 그 기질.

이로써 "독립 수렴" 증인은 셋이 된다.

| 도착자 | 시점 | 분야 | 산출 형태 |
|--------|------|------|----------|
| 구요한 (CMDS) | 2023~ | 지식 관리 | 운영 시스템 (8,000+ 노트) |
| Karpathy | 2026 | ML 연구 자동화 | LLM Wiki · Autoresearch |
| **Google Cloud (OKF)** | **2026-06** | **데이터 카탈로그** | ***명세(spec)*** |

처음으로 *개인/연구자*가 아니라 **하이퍼스케일러가, 그것도 명세 형태로** 도착했다. "한 개인의 취향이 아니라 시대적 필연" 논증이 한 단계 강해진다.

단, OKF는 **L1–L3(Raw/Wiki/Schema)만 명세하고 멈춘다.** "Schema = Harness" 축에서 OKF는 *얇은 하네스*(필수 필드 `type` 단 하나, "깨진 링크도 관용")를, CMDS는 *두꺼운 하네스*(7 프로퍼티 + lint)를 택한 양 극단이다. 둘 다 옳다 — *생산자*(에이전트 대량생성 vs 인간 큐레이션)와 *목적*(조직 간 교환 vs 교육 자산)이 다를 뿐.

## 7. 시사점 및 제언

### 7.1 시스템 변경 권고: 변경 없음

검토 결과, **CMDS의 디렉토리 구조, 메타데이터 스키마, CMDS Process 등 핵심 요소는 변경할 필요가 없다.** Karpathy의 제안은 검증 자료일 뿐 교정 자료가 아니다.

### 7.2 메시지/전달 권고: 워딩 차용

다음 3가지 차용 권고를 다시 정리한다.

1. **"Persistent, compounding artifact"** 표현을 마케팅 자료에 반영
2. **"RAG re-derives, Wiki compounds"** 인용을 강의 슬라이드에 추가
3. **"Schema = Harness"** 등치를 컨텍스트 엔지니어링 강의에서 강조

### 7.3 활용 권고: 비교 슬라이드 제작

2026년 4월 11일 CMDS AI PKM Forum에서 다음 1장 분량의 비교 슬라이드를 추가할 것을 권고한다.

> **"Karpathy가 발견한 것을, 우리는 이미 운영 중입니다."**
>
> - LLM Wiki (2026 제안) → CMDS (2023 운영 중)
> - Autoresearch program.md → CMDS CLAUDE.md
> - 3-Layer Schema → 5-Layer Precedence System

이 메시지는 CMDS의 선구성과 Karpathy의 권위를 동시에 활용한다.

### 7.4 우선순위 매트릭스

| 액션 | 우선순위 | 적용처 | 소요 |
|------|----------|--------|------|
| 3개 워딩 마케팅 자료 반영 | ⭐⭐⭐ | 하네스 Start-kit, AI PKM Forum | 30분 |
| Karpathy 비교 슬라이드 1장 추가 | ⭐⭐ | 4/11 포럼 발표 | 1시간 |
| "Schema = Harness" 등치 강조 | ⭐⭐ | 컨텍스트 엔지니어링 강의 | 슬라이드 1장 |
| Lint 공식 명명 검토 | ⭐ | CLAUDE.md 다음 업데이트 시 | 선택 |

## 8. 결론

본 보고서는 다음을 입증했다.

첫째, **CMDS는 Karpathy의 LLM Wiki 개념을 구조적으로 완전히 포괄한다.** 누락된 요소가 없을 뿐 아니라 다중 에이전트 지원, 5단계 precedence, 인간-AI 이중 문서화 등에서 더 발전된 형태를 가진다.

둘째, **CMDS는 Karpathy의 제안보다 양적·질적으로 성숙하다.** 10,000+ 노트와 3년 이상의 운영 이력은 이 시스템이 검증된 운영 체계임을 보여준다.

셋째, **두 시스템 모두 더 큰 패러다임인 하네스 엔지니어링의 구체적 사례다.** Karpathy의 Schema = CMDS의 Harness이며, 이 등치는 컨텍스트 엔지니어링이라는 새로운 지식 작업 방식의 출현을 드러낸다.

넷째, **CMDS는 다음과 같은 메시지로 자신을 정의할 수 있다.**

> **"CMDS는 Karpathy가 2026년에 제안한 LLM Wiki를, 2023년부터 운영해온 시스템입니다. 우리는 RAG가 아니라 컴파일을 선택했고, 휘발이 아니라 누적을 선택했습니다. 그리고 그 선택은 이미 10,000개의 노트로 검증되었습니다."**

본 보고서는 CMDS 사용자, 강의 수강생, 교육 파트너에게 다음과 같이 말할 수 있는 근거를 제공한다.

**"당신이 배우는 것은 한 개인의 취향이 아니라, AI 시대의 보편적 패턴입니다. 그 증거는 10,000개의 노트와 Karpathy의 발견에 있습니다."**

---

### 참고 자료

- Andrej Karpathy, "LLM Wiki" (GitHub, 2026)
- Andrej Karpathy, "Autoresearch" (GitHub, 2026, 58,500+ stars)
- OpenAI, "Building Agents" — *"the agent isn't the hard part — the harness is"*
- Google Cloud, "Open Knowledge Format v0.1" (knowledge-catalog, 2026)
- Tiago Forte, *Building a Second Brain* (2022)
- CMDS 시스템 파일 공개본: [system.cmdspace.work](https://system.cmdspace.work) · LLM Wiki 구조 공개본: [llm-wiki.cmdspace.work](https://llm-wiki.cmdspace.work)
