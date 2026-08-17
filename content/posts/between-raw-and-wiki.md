---
title: Raw와 Wiki 사이에서 — Karpathy와 Kepano가 던진 질문에 대한 답
slug: between-raw-and-wiki
date: 2026-04-03
kind: 에세이
summary: Karpathy는 "LLM이 raw를 위키로 컴파일한다"고 했고, Kepano는 "에이전트용 볼트를 분리하라"고 경고했다. 두 주장은 같은 문제의 양면이다. 나의 답 — 분리가 답이 아니라, 설계가 답이다.
updated: 2026-08-17
---
![Raw 더미를 구조화된 지식으로 컴파일하는 렌즈](/images/between-raw-and-wiki/hero-between-raw-and-wiki.jpg)

오늘 타임라인에 Andrej Karpathy와 Kepano(Obsidian 창시자)의 대화가 올라왔다. 46만 뷰를 찍은 이 스레드는, 필자가 3년간 옵시디언 볼트를 운영하면서 매일 마주해온 질문을 정확히 건드린다.

Karpathy는 이렇게 말했다:

> "최근 토큰의 상당 부분이 코드가 아닌 지식을 다루는 데 쓰이고 있다. 원본 데이터를 raw/ 디렉토리에 모으고, LLM이 이것을 .md 위키로 '컴파일'한다."

Kepano는 여기에 날카로운 보완을 붙였다:

> "개인 볼트는 깨끗하게 유지하고, 에이전트용 볼트는 따로 만들어라. 둘을 섞으면 당신의 생각을 대표하는 시스템이 오염된다."

두 사람의 주장은 겉보기에 충돌하는 것 같지만, 실은 같은 문제의 양면이다. 그리고 필자는 10,000개 노트가 넘는 볼트를 운영하면서 이 양면을 동시에 겪고 있다.

## Karpathy의 통찰: LLM은 코드가 아니라 지식을 컴파일한다

Karpathy가 설명한 워크플로우를 정리하면 이렇다:

1. 원본 수집 (raw/) → 논문, 아티클, 레포, 이미지
2. LLM이 위키로 컴파일 → .md 파일 + 디렉토리 구조 + 백링크 + 인덱스
3. 위키 위에서 Q&A → 400K 단어 규모에서 복잡한 질문에 답변
4. 결과물을 다시 위키에 편입 → 탐색이 지식으로 축적
5. 린팅 → 비일관성 감지, 누락 데이터 보완, 새 연결 제안

이것을 읽으며 느낀 점이 두 가지 있었다.

첫째, **이건 CMDS 프로세스 그 자체다.** Connect(원본 수집) → Merge(컴파일/통합) → Develop(Q&A/분석) → Share(결과물 편입). 3년 전에 설계한 워크플로우가 AI 시대에 그대로 유효하다는 것을 Karpathy가 증명해준 셈이다.

둘째, Karpathy가 "fancy RAG에 손대야 하나 생각했는데, LLM이 인덱스 파일과 문서 요약을 자동으로 관리하더라"고 말한 부분. 이것이야말로 **Markdown is all you need**의 핵심이다. 벡터 DB도, 임베딩 파이프라인도, RAG 인프라도 필요 없다. 잘 구조화된 마크다운 파일과 인덱스면 충분하다. CMDS에서 `.claude/rules/` 5개 파일과 CLAUDE.md가 하는 일이 정확히 이것이다.

Karpathy는 "스키마는 AGENTS.md에 유지한다"고도 말했다. 필자의 볼트에도 AGENTS.md가 있다. 같은 이름, 같은 목적. 우연이 아니다. 이 패턴이 자연스럽게 수렴하는 지점이 있다는 뜻이다.

## Kepano의 경고: 오염의 경계를 지켜라

Kepano의 주장은 더 근본적이다.

> "에이전트가 생성한 콘텐츠와 당신이 직접 만든 콘텐츠를 섞으면, 검색, 그래프, 백링크가 더 이상 '당신의 지식'을 범위로 하지 않게 된다."

이것은 Kepano답게 날카롭다. 그리고 옳다. 하지만 필자의 답은 조금 다르다.

**분리가 답이 아니라, 설계가 답이다.**

CMDS 볼트에는 AI가 생성한 파일이 수천 개 있다. 회의록, 에세이 초안, 웹페이지, 채널 프로필, 코드. 이것들이 볼트를 "오염"시키지 않는 이유는 **명확한 경계가 설계되어 있기 때문이다:**

1. **AI 산출물 경로 분리**: 모든 AI 코딩 출력은 `00. Inbox/03. AI Agent/` 하위의 환경별 서브폴더에 들어간다. MacBook Pro에서 Claude Code가 만든 파일은 `03-1. Claude Code (MBP)/`에만 생긴다.

2. **프로퍼티로 출처 추적**: 모든 노트에 `author` 필드가 있다. `"[[구요한]]"`이면 내가 쓴 것이고, AI가 생성한 파일에는 그 맥락이 명시된다.

3. **처리 상태 관리**: `status: unread → reading → inProgress → completed → archived` 5단계로 모든 노트의 생애주기를 추적한다. AI가 만든 초안(`inProgress`)과 내가 검증한 완성본(`completed`)이 구분된다.

4. **시스템 파일의 precedence**: CLAUDE.md(precedence: 1)가 AI의 행동 규칙을 정의하고, CMDS.md(precedence: 3)가 볼트의 철학을 설명한다. AI는 이 규칙을 읽고 나서 작업한다.

Kepano가 말하는 "깨끗한 볼트"와 "지저분한 볼트"를 물리적으로 분리하는 대신, **하나의 볼트 안에서 메타데이터와 폴더 구조로 논리적으로 분리하는 것이 CMDS의 접근이다.** 왜냐하면 분리된 두 볼트 사이에서는 위키링크가 작동하지 않기 때문이다. AI가 만든 회의록에서 `[[김팀장]]` 인물 노트로 점프하고, 거기서 `[[📚 620 Generative AI]]` 카테고리로 이동하는 흐름 — 이것은 하나의 볼트 안에서만 가능하다.

물론 Kepano의 경고는 유효하다. 관리하지 않으면 실제로 오염된다. 하지만 해법은 볼트를 나누는 것이 아니라, 시스템 파일을 잘 설계하는 것이다.

## 두 관점의 합류점: 시스템 파일이라는 답

Karpathy의 "AGENTS.md에 스키마를 유지한다"와 Kepano의 "경계를 지켜라"를 합치면 하나의 결론이 나온다:

**AI와 인간이 같은 볼트를 공유하려면, 둘 다 읽을 수 있는 규칙서가 있어야 한다.**

CMDS에서 이것이 5개 시스템 파일이다:

| 파일 | 누가 읽는가 | 무엇을 정의하는가 |
|------|-----------|----------------|
| CLAUDE.md | AI (Claude Code) | 기술적 규칙, 파일 생성 경로, 인덴트 규칙 |
| AGENTS.md | AI (Gemini, Codex) | 범용 기술 규칙 |
| CMDS.md | AI (전체) | 볼트의 철학, 사용자 맥락, 카테고리 의미 |
| Guide | 인간 + AI | 프로퍼티 표준, 네이밍 규칙 |
| Head Quarter | 인간 | 91개 카테고리 네비게이션 |

여기에 `.claude/rules/` 5개 공통 규칙 파일이 `@include`로 AI 문서에 주입된다. Karpathy가 "LLM이 인덱스를 자동 관리한다"고 한 그 인덱스의 역할을 이 파일들이 수행한다.

## 나의 답: 볼트는 나누는 것이 아니라 설계하는 것이다

Karpathy에게: 당신이 말한 "raw → wiki 컴파일" 워크플로우는 정확하다. 거기에 시스템 파일(AGENTS.md, CLAUDE.md)을 더하면 AI가 스키마를 넘어 규칙과 맥락까지 이해하게 된다. 그러면 위키의 품질이 한 단계 올라간다.

Kepano에게: 오염 경고에 동의한다. 하지만 볼트를 나누는 것은 위키링크의 힘을 포기하는 것이다. 10,000개 노트가 연결된 그래프의 가치는, 그 안에 AI 산출물이 포함되어 있을 때 더 커진다. 핵심은 분리가 아니라, 출처를 추적할 수 있는 메타데이터 설계다.

둘 다에게: Markdown is all you need. 벡터 DB도, RAG 파이프라인도 필요 없다. 잘 구조화된 .md 파일, YAML frontmatter, 그리고 AI가 읽을 수 있는 시스템 파일. 이 세 가지면 개인 지식 베이스는 AI 에이전트의 운영 체제가 된다.

---

### 더 읽을거리

- 📚 Niklas Luhmann의 Zettelkasten — 카드 박스 시스템의 "오염 방지" 설계
- 🔗 Andrej Karpathy, "Software 2.0" — 코드에서 데이터로의 패러다임 전환
- 📄 디케이, [「Obsidian Vault를 Claude Code의 온디맨드 스킬 라이브러리로 활용하기」](https://share.note.sx/sne2ve0t)
- 🛠️ Obsidian Web Clipper — Karpathy가 사용하는 웹 클리핑 도구

### 출처

- Andrej Karpathy, "LLM Knowledge Bases" (https://x.com/karpathy/status/2039805659525644595), 2026-04-03
- Kepano, "Contamination risks" (https://x.com/kepano/status/2039831289533227446), 2026-04-03
- CMDS System Files: [system.cmdspace.work](https://system.cmdspace.work) · [GitHub](https://github.com/johnfkoo951/cmds-system-files)
