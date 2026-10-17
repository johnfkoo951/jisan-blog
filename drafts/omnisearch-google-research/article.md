---
title: "Google 검색 옆에 내 노트를 꺼내 놓기"
slug: omnisearch-google-research
date: 2026-10-17T12:17
kind: 기술
summary: "루만의 소통과 지식 연결성을 실제로 검색하며 Google의 웹 자료와 내 옵시디언 기록을 비교한다. Omnisearch 사용자 스크립트의 전체 소스, 멀티볼트 설정, 필터와 문제 해결을 정리했다."
---
![Google 웹 검색과 옵시디언의 Knowledge Connectivity 연구 기록이 나란히 표시된 실제 화면](/images/omnisearch-google-research/hero-omnisearch-google-research.png "같은 검색어로 만난 두 목록. 왼쪽은 Google의 웹 자료, 오른쪽은 내가 축적한 옵시디언 기록이다.")

검색하다가 익숙한 논문 제목을 만난다. 분명 읽었던 글이다. 메모도 남겼을 것이다. 그런데 그 메모를 찾으려면 검색을 멈추고 다른 앱으로 가야 한다. 새로 발견한 자료와 이미 읽은 기록 사이에 작은 단절이 생긴다.

내게 자주 그런 순간을 만드는 검색어가 `Luhmann's communication`과 `knowledge connectivity`다. 니클라스 루만의 소통 이론, 개방형 협업, 지식의 연결성을 따라 읽으며 문헌 검토와 아이디어를 남겨 왔다. 2022년에 작성한 노트도 지금의 검색과 관계가 있다. 문제는 저장 여부가 아니라, **지금 필요한 순간에 다시 만날 수 있느냐**다.

그래서 Google 검색 옆에 내 옵시디언 검색 결과를 붙였다. Google을 대체하는 검색엔진이 아니다. Google이 찾은 바깥의 자료와 내가 읽고 연결해 온 안쪽의 기록을 한 화면에 놓는 작은 도구다.

이 글은 **Obsidian Omnisearch in Google — CMDS v0.14.1**의 설치와 설정 가이드다. 실제 Chrome에서 두 연구 키워드를 검색하고, 설치된 스크립트의 결과와 설정 화면을 캡처했다. 예쁜 모형 화면으로 실제 결과를 대신하지 않았다.

## 같은 검색어가 서로 다른 기억을 꺼낸다
### 루만의 소통: 외부 문헌과 내 연구의 진행 흔적
`Luhmann's communication`을 Google에 입력하면 루만의 소통 이론을 설명하는 문헌과 해설이 나온다. 이번 화면에는 「What is Communication?」, 루만과 하버마스의 소통 이론을 비교한 문헌, 루만의 사회이론을 설명하는 자료가 나타났다.

오른쪽은 다른 목록이다. Main 볼트를 선택하자 내 볼트의 서지 검증 기록과 「Review of Seidl and Becker (2006)」가 보였다. 같은 검색어의 로컬 API 응답에서는 「Luhmann's Systems Theory」와 루만의 작업을 정리한 노트도 확인했다.

![루만의 소통을 검색한 Google 논문 목록과 Main 볼트의 연구 기록](/images/omnisearch-google-research/figure-01-luhmann-search.png "그림 1. 실제 Chrome의 `Luhmann's communication` 검색. Google의 문헌 목록과 Main 볼트의 결과를 나란히 읽는다. 상위에 연구 작업 기록이 섞이는 모습도 그대로 남겼다. 브라우저 계정 영역은 잘라 내고 내부 경로는 가렸다.")

두 목록의 차이는 단순히 ‘인터넷 대 로컬’이 아니다. 왼쪽은 **이 주제에 관해 어디로 갈 수 있는가**, 오른쪽은 **이 주제에서 내가 어디까지 왔는가**를 보여준다. 내가 남긴 비판, 비교, 다음에 확인할 질문은 웹 검색만으로 되찾기 어렵다.

그렇다고 오른쪽이 언제나 더 좋은 답을 주는 것은 아니다. 이번 검색에서도 전체 볼트를 합치면 `log`가 상위에 올라왔고, Main을 선택해도 서지 검증 작업 기록이 문헌 노트보다 먼저 나왔다. 검색어를 포함한 작업 기록 역시 검색 대상이기 때문이다. 볼트를 좁히고, 필요하면 제외 경로를 설정해야 한다. **개인 검색의 품질에는 내가 무엇을 검색 대상으로 남겨 두었는지도 반영된다.**
### 지식 연결성: 새 논문 옆에 과거의 아이디어가 나타난다
`knowledge connectivity`에서는 차이가 더 선명하다. Google 쪽에는 국제적인 지식 연결성, 혁신, R&D 투자, 지식의 복잡성을 다루는 논문과 자료가 나타났다. 같은 검색의 상단에서는 Cano-Kollmann 외 연구자들의 「Knowledge connectivity: An agenda for innovation research in international business」도 확인할 수 있었다.

오른쪽에는 `Knowledge Connectivity` Canvas, `Knowledge Connectivity 연구 아이디어`, 내가 쓴 `Knowledge Connectivity` 노트, 문헌 검토가 나타났다. 논문의 제목만이 아니라 그 논문을 읽고 연결해 둔 생각의 흔적을 다시 만나는 셈이다.

![지식 연결성을 검색한 Google 결과와 개인 Canvas 및 문헌 노트](/images/omnisearch-google-research/figure-02-connectivity-search.png "그림 2. 실제 `knowledge connectivity` 검색. 왼쪽의 외부 연구와 오른쪽의 Canvas·아이디어·노트를 비교한다. Canvas가 높은 점수를 받고 Markdown 노트에는 낮은 상대 점수가 표시된다는 점도 볼 수 있다. 내부 경로가 포함된 행은 가렸다.")

내가 2022년에 남긴 Cano-Kollmann 논문 검토에는 지식 연결성을 ‘개인의 지식을 외부 지식과 융합할 수 있는 상태로 유지하는 것’으로 확장해 보려는 메모가 있다. 논문의 원래 연구 맥락은 국제경영과 혁신이다. 그것을 개인 지식관리의 문제로 가져온 것은 내 해석이다. 이 구분을 유지하면서, 새로 찾은 자료를 당시의 질문에 다시 연결할 수 있다.

노트가 스스로 판단하거나, 검색 패널이 소통 이론을 구현한 것은 아니다. **외부 자료와 기존 기록을 함께 살펴보고, 차이를 해석하고, 연결을 선택하는 일은 여전히 내가 한다.** 이 도구는 그 사이의 앱 전환을 줄인다.
### 이 화면을 읽을 때 기억할 것
- 캡처는 2026-10-17의 실제 검색 장면이다. Google 결과는 계정, 언어, 지역, 시점에 따라 달라진다. AI Overview도 고정된 학술 근거가 아니므로 원문을 확인한다.
- 패널의 결과 수는 이 요청에서 받아 병합한 결과 수다. 볼트 전체의 일치 문서 수나 Google의 전체 검색량과 비교할 수 없다.
- Google 검색과 Omnisearch는 서로 다른 색인·검색 규칙을 사용한다. 같은 단어를 넣는다고 동일한 의미의 질문이나 동일한 순위가 되는 것은 아니다.
- 이 비교는 검색 정확도 벤치마크가 아니라 **일상 연구 흐름에서 무엇을 함께 볼 수 있는지**를 보여주는 사용 사례다.

## 이 스크립트가 하는 일과 하지 않는 일
브라우저에 설치하는 작은 JavaScript를 **사용자 스크립트(userscript)**라고 한다. Tampermonkey는 그것을 지정된 웹사이트에서 실행해 주는 확장 프로그램이다.

이 스크립트는 Google 페이지의 검색어를 읽고, 내 컴퓨터에서 실행 중인 Omnisearch HTTP 서버에 같은 검색어를 보낸다. HTTP 서버는 브라우저 같은 다른 프로그램이 검색을 요청할 수 있도록 플러그인이 열어 두는 로컬 입구다. 스크립트는 응답을 받아 오른쪽에 표시한다.

```text
Google 검색어
  ├─ Google → 웹 자료
  └─ 사용자 스크립트 → 로컬 Omnisearch → 내 볼트 기록
```

여러 볼트를 쓰면 볼트마다 포트를 다르게 둔다. 포트는 같은 컴퓨터 안의 여러 서버를 구분하는 번호다. 이 가이드에서는 Main에 `51361`, Wiki에 `51362`를 사용한다. 두 볼트는 옵시디언에서 각각 열려 있어야 한다.

이 스크립트 자체는 LLM을 호출하지 않는다. 글의 내용을 읽고 답을 생성하거나, Google의 AI Overview를 내 노트로 바꾸지도 않는다. 표시하는 것은 Omnisearch가 반환한 검색 결과다. **기본 검색과 앱으로 열기에는 별도 LLM API 키나 Local REST API 키가 필요 없다.**

## 10분 안에 시작하는 최소 설정
### 1. 옵시디언에서 Omnisearch를 준비한다
1. 데스크톱 옵시디언에서 사용할 볼트를 연다.
2. 커뮤니티 플러그인에서 **Omnisearch**를 설치하고 활성화한다.
3. Omnisearch 설정에서 **HTTP server**를 활성화한다.
4. 포트 번호를 확인한다. 첫 볼트는 `51361`로 맞추면 이 스크립트의 기본값과 일치한다.
5. 두 번째 볼트까지 검색하려면 그 볼트도 열고, 같은 플러그인의 포트를 `51362`처럼 다른 번호로 설정한다.

여러 볼트가 같은 포트를 쓰면 충돌할 수 있다. 한 볼트만 쓸 사람은 아래 스크립트 설정에서 Vault 2의 Port를 비우면 된다. 컴퓨터의 공유기 포트를 개방하거나 서버를 외부에 노출할 필요는 없다.
### 2. Chrome에 사용자 스크립트를 넣는다
1. Chrome에 **Tampermonkey**를 설치한다.
2. 대시보드에서 새 스크립트를 만들고, 이 글의 [전체 소스](/images/omnisearch-google-research/source.html)를 붙여 넣는다. 기존 사용자는 **같은 스크립트 항목의 코드 전체를 교체**한다.
3. 첫 줄이 `// ==UserScript==`인지 확인하고 저장한다. 마크다운 코드블록의 백틱은 포함하지 않는다.
4. Chrome 확장 프로그램 상세 설정에 **Allow User Scripts**가 있으면 켠다. 스크립트와 Tampermonkey의 Google 사이트 접근도 허용한다.
5. Google 검색 페이지를 새로고침한다. 현재 스크립트가 대상으로 삼는 도메인은 `google.com`과 `google.co.kr`이다.

로컬 연결 권한을 묻는 창이 나오면 요청 대상이 `localhost` 또는 `127.0.0.1`인지 확인한다. 기존 스크립트를 별도 항목으로 또 설치하면 패널이 중복되거나 저장 설정이 이어지지 않을 수 있다.
### 3. 첫 검색을 확인한다
Google에 `knowledge connectivity`를 입력한다. 오른쪽에 **내 노트에서** 패널과 Main/Wiki 버튼이 보이면 연결된 것이다. 내 볼트에 이 단어가 없다면 결과가 없을 수 있으므로, 내가 저장해 둔 노트의 제목이나 핵심 단어로도 확인한다.

제목 또는 **Obsidian에서 열기**를 누르면 해당 노트로 돌아간다. 브라우저가 외부 앱 실행을 확인하면 옵시디언 열기를 허용한다. 이것은 웹페이지 이동이 아니라 `obsidian://`라는 앱 링크를 여는 동작이다.

**기본 동작부터 확인한 다음 옵션을 늘리는 편이 좋다.** 처음부터 REST 포트, 키, 공통 부모 폴더를 모두 채울 필요는 없다.

## 설정 화면: 볼트마다 무엇을 넣어야 하나
패널 오른쪽 위 **설정**을 누른다. 먼저 Vault 1부터 Vault 6까지의 슬롯이 나온다. 슬롯은 볼트 연결 정보를 한 묶음으로 저장하는 자리다.

![Main과 Wiki의 Omnisearch 포트를 설정하는 실제 Vault 슬롯 화면](/images/omnisearch-google-research/figure-03-vault-settings.png "그림 3. 실제 Chrome의 볼트 설정. Main과 Wiki의 검색 포트만 연결했고, 등록 볼트명 자동 감지와 나머지 선택 항목은 빈칸으로 두었다. 캡처에 API 키와 개인 파일 경로는 없다.")

| 화면의 항목 | 무엇을 넣는가 | 처음 시작할 때 |
|---|---|---|
| Port | 이 볼트의 **Omnisearch HTTP 포트** | Main `51361`, Wiki `51362`. 사용하지 않는 슬롯은 빈칸 |
| Display name (badge) | 패널에 보여 줄 짧은 이름 | `Main`, `Wiki`처럼 구분하기 쉬운 라벨 |
| Obsidian vault name for deeplink | 앱에서 열 때 사용할 **실제 등록 볼트명** | 빈칸이면 Omnisearch 응답으로 자동 감지 |
| Color hex | 볼트 표시점에 쓸 색 | 기본값 유지. `#RRGGBB` 형식 |
| Filesystem root for 'copy abs path' | 절대경로 복사를 위한 볼트의 폴더 경로 | 빈칸. 기본 검색·열기에는 필요 없음 |
| Local REST API port | 선택적 Local REST API 플러그인의 포트 | 빈칸. Omnisearch 포트와 다른 용도 |
| Local REST API key | 그 REST 서버의 인증 키 | 빈칸. 키는 공개 글·캡처에 넣지 않음 |

가장 쉽게 혼동하는 것은 **Display name과 실제 볼트명**, 그리고 **Omnisearch 포트와 REST 포트**다. 패널에서 ‘Main’이라고 부르는 것과 옵시디언에 등록된 볼트 이름은 같지 않아도 된다. 반대로 앱 링크의 볼트명은 실제 대상과 맞아야 한다.

설정을 바꾼 뒤에는 **Save**를 누른다. 저장하면 페이지가 새로고침된다. 단순히 화면을 살펴보고 나온다면 **Close**를 사용한다. 캡처를 위해 설정값을 바꾸거나 저장하지는 않았다.

## 공통 설정: 읽기 좋은 기본값부터
볼트 슬롯 아래로 스크롤하면 공통 설정이 나온다.

![색상, 미리보기, 제외 경로와 앱 열기를 지정하는 실제 공통 설정 화면](/images/omnisearch-google-research/figure-04-general-settings.png "그림 4. 실제 공통 설정 화면. CMDS/Clean/Accent/Top 조합을 사용하고, REST 보강과 Advanced URI는 꺼 둔 기본 경로다.")

| 설정 | 추천 시작값 | 이유 |
|---|---|---|
| Results to display | `5` | 한 번에 읽을 양을 제한. 아래 ‘결과 더 보기’로 추가 표시 |
| Excerpt lines | `3` | 본문 훑어보기. 펼치기는 별도 버튼 |
| Show within-vault relative score | 켬 | 참고 지표로만 읽는다. 중요도·정확도 점수가 아님 |
| Show path breadcrumb | 켬 | 동명 노트와 폴더 구분 |
| Vault badge | `auto` | 여러 볼트일 때 출처 구분 |
| Show tags / Max tags per card | 켬 / `5` | 기본 태그는 excerpt에서 추정한 값 |
| Show matched query terms | 끔 | 조사·유사한 단어 조각이 많으면 화면이 복잡해짐 |
| Strip frontmatter from preview | 켬 | 온전한 선두 YAML 블록 제거. 조각난 메타데이터까지 완전히 지우지는 못함 |
| Exact match | 끔 | 먼저 넓게 찾고 필요할 때만 켬. 켜면 검색어를 따옴표로 감쌈 |
| Exclude paths containing | 빈칸 | 결과를 본 뒤 제외가 필요한 경로만 추가 |
| Accent theme / Card style | `CMDS` / `Clean` | 구분은 남기고 제목과 본문 읽기를 우선 |
| Vault color scope | `Accent` | 볼트 색을 포인트에만 사용 |
| Note title color / Accent override | 빈칸 | 기본 대비와 테마 색을 사용 |
| Sidebar position | `Top` | 기존 사이드바 안의 위쪽. Google 본문의 위쪽이라는 뜻이 아님 |
| Common parent folder of your vaults | 빈칸 | 절대경로 복사가 필요할 때만 설정 |
| Use Local REST API for body + tags | 끔 | 기본 검색 확인 후 필요한 경우에만 도입 |
| Use Advanced URI for opening | 끔 | 기본 앱 링크로 시작. 필요한 볼트에 플러그인을 설치한 후 선택 |
| Keyboard navigation | 켬 | 패널 안에서만 키보드 탐색 |
| Open live controls by default | 끔 | 검색창은 항상 보이고 세부 필터만 접어 둠 |
| Per-port timeout | `5000` | 포트별 기본 대기 시간, 밀리초 단위 |

기존 사용자는 저장해 둔 색과 위치가 계속 적용된다. 새 코드를 붙여 넣었다고 사용자 설정을 자동 초기화하지는 않는다. 이전에 민트색 제목을 직접 지정했다면 `Note title color`를 비워야 새 기본 제목색으로 돌아간다.

## 연구용으로 검색을 다듬는 세 가지 방법
### 1. Google 검색어와 내 노트의 표현을 구분한다
패널 검색창에 다른 표현을 입력하면 **옵시디언 쪽만** 재검색한다. Google의 검색어와 결과는 그대로다. 예를 들어 웹에서는 `Luhmann's communication`을 유지하면서 로컬에서는 `Luhmann communication`을 시도할 수 있다. 소유격을 뺀 두 번째 표현은 이번 로컬 API 확인에서도 다른 순위의 결과를 반환했다.

이는 더 나은 결과를 보장하는 규칙이 아니라, 두 색인이 다른 표현에 반응한다는 것을 이용한 조정이다. 두 검색어를 다르게 사용한 화면을 공유할 때는 그 사실도 함께 적어야 한다. **초기화**를 누르면 패널이 Google 검색어를 다시 사용한다.
### 2. 볼트·파일 종류를 먼저 좁힌다
Main은 내가 직접 축적한 기록, Wiki는 컴파일된 참고 지식처럼 역할을 나눠 운영할 수 있다. 먼저 Main/Wiki 버튼으로 출처를 고른다. 이어 **필터 → 파일 → Markdown**을 선택하면 Canvas나 PDF가 섞인 결과에서 Markdown 노트만 볼 수 있다.

이번 `knowledge connectivity` 화면에서는 Canvas 두 개가 매우 높은 점수를 받았고, 내가 쓴 Markdown 노트의 상대 점수는 2%로 보였다. 이것이 그 노트의 가치가 낮다는 뜻은 아니다. 퍼센트는 같은 볼트의 이번 검색 최고점 대비 값이다. 파일 종류나 내용의 반복에 따라 분포가 크게 벌어질 수 있다.

v0.14.1은 파일 필터를 걸더라도 원래 볼트 응답의 최고점을 기준으로 상대 점수를 계산한다. 따라서 처음에는 **최소 상대 점수 0%**로 두는 편이 안전하다. 여러 볼트의 raw score를 합쳐 정렬하는 것도 엄밀한 의미의 볼트 간 중요도 비교는 아니다.
### 3. 작업 기록이 너무 많으면 경로를 제외한다
`Exclude paths containing`에는 제외할 경로 문자열을 쉼표로 구분해 넣는다. 예를 들어 내 볼트에 실제로 `Archive/`와 `Automation/Logs/` 폴더가 있고 이번 검색에서 필요하지 않다면 다음처럼 설정할 수 있다.

```text
Archive/, Automation/Logs/
```

위 값은 예시이며 내 폴더 구조에 맞게 바꿔야 한다. 정규식이나 태그 필터가 아니라 **경로의 부분 문자열 비교**다. `log`처럼 너무 짧은 문자열을 넣으면 다른 단어가 들어간 경로까지 제외할 수 있다. 먼저 특정 볼트로 좁히고, 그래도 불필요한 결과가 많을 때 구체적인 폴더 경로를 추가한다.

## 열기와 미리보기를 혼동하지 않기
- **제목 / Obsidian에서 열기**: 실제 노트로 이동.
- **미리보기 더 보기**: 패널 안의 excerpt를 펼침. 노트 전체를 불러오는 버튼은 아님.
- **링크 복사**: 상대경로가 포함된 위키링크 복사. 같은 볼트에서 노트를 연결할 때 사용.
- **더보기 → 앱 링크 복사**: 볼트와 파일을 지정한 `obsidian://` 링크 복사. 다른 볼트나 외부 메모에서 돌아올 때 더 적합.
- **더보기 → 제목/상대경로/절대경로 복사**: 필요한 식별 정보 복사. 절대경로는 root 또는 공통 부모 폴더 설정이 있어야 함.
- **더보기 → 기본 URI / Advanced URI / REST 열기**: 기본 동작이 맞지 않을 때 사용할 개별 경로. REST 버튼은 해당 슬롯에 유효한 포트와 키가 있을 때 보임.

위키링크는 볼트 경계를 넘지 못한다. Wiki의 검색 결과에서 복사한 위키링크를 Main에 붙이면 같은 파일을 가리킨다고 보장할 수 없다. 볼트 간 복귀가 목적이면 **앱 링크 복사**를 선택한다.

키보드는 `Alt+Shift+O`로 패널 검색창에 들어간 뒤 사용한다. 패널 안에서 `j/k` 또는 `↑/↓`로 결과를 이동하고, `Enter`로 포커스된 링크·버튼을 실행한다. `y`는 경로 위키링크 복사, `/`는 검색창, `Esc`는 선택 해제다. Google 본문에서는 방향키를 가로채지 않고, 입력창과 한글 조합 중에는 탐색 단축키가 작동하지 않는다.

## 선택 사항: 본문과 태그를 더 정확히 보여주기
기본 Omnisearch 응답에는 매칭 주변의 excerpt가 들어온다. 그 조각이 frontmatter 중간에서 시작하면 날짜·aliases·description이 미리보기에 남을 수 있다. 앞의 실제 캡처에도 그런 모습이 있다. `Strip frontmatter`를 켠다고 모든 조각을 완벽하게 구분할 수 있는 것은 아니다.

이를 보강하고 싶을 때 **Local REST API** 플러그인을 추가한다.
1. 대상 볼트에 Local REST API 플러그인을 설치한다.
2. 로컬 HTTP 서버를 켜고 해당 포트와 키를 확인한다. HTTPS의 자체 서명 인증서는 브라우저 연결 오류를 만들 수 있다.
3. 스크립트의 **그 볼트 슬롯**에 REST 포트와 키를 넣는다. Omnisearch Port를 바꾸는 것이 아니다.
4. 공통 설정의 **Use Local REST API for body + tags**를 켠다.

이제 보이는 Markdown 결과의 실제 본문을 읽어, frontmatter를 제거한 미리보기와 태그로 보강한다. v0.14.1은 보이는 결과 중 최대 30개, 동시 요청 3개로 제한한다. Canvas·PDF 등의 전체 내용을 동일하게 보강하는 기능은 아니다.

Local REST는 검색 필수 조건이 아니다. 또한 그 서버가 노트 열기 요청을 수락한 것과 옵시디언 창이 화면 맨 앞으로 온 것은 다르다. REST 열기 후 창이 안 보이면 안내에 나온 앱 링크를 직접 클릭한다.

## 막혔을 때 확인할 순서

| 증상 | 먼저 볼 곳 |
|---|---|
| 패널 자체가 안 보임 | Tampermonkey 활성화, Allow User Scripts, Google 사이트 접근, 대상 도메인, 새로고침 |
| 좁은 창에서 안 보임 | 창을 넓힌다. 오른쪽 공간이 300px 미만이면 본문을 침범하는 대신 숨김 |
| 위쪽에 바로 안 보임 | AI Overview 출처 카드나 기존 오른쪽 콘텐츠 아래에 있을 수 있으므로 스크롤 |
| Main/Wiki가 연결 안 됨 | 해당 볼트 열림 여부, Omnisearch HTTP 활성화, 포트 일치, 로컬 연결 허용 |
| 한 볼트만 검색됨 | 두 번째 볼트도 실행 중인지, 두 볼트의 포트가 서로 다른지 확인 |
| 결과는 있는데 클릭이 안 됨 | 브라우저의 외부 앱 실행 허용 확인. 더보기의 기본 URI를 직접 클릭 |
| 볼트만 열리고 파일이 안 열림 | 실제 등록 볼트명과 경로 확인. 필요하면 대상 볼트에 Advanced URI 설치 후 해당 링크 사용 |
| REST 401 | REST 키 불일치. 검색용 Omnisearch 포트에 REST 요청을 보내는 것은 아닌지도 확인 |
| REST 연결 오류·시간 초과 | HTTP 활성화, 포트, HTTPS 인증서, 볼트 실행 상태 확인 |
| 검색 결과가 지나치게 적음 | 볼트·파일 필터, 최소 상대 점수, Exact match, 제외 경로를 점검 |
| 미리보기에 YAML이 보임 | 조각난 excerpt의 한계일 수 있음. 필요한 경우 REST 본문 보강 사용 |

`localhost`와 `127.0.0.1`은 보통 같은 컴퓨터를 가리키지만 연결 결과가 항상 같지는 않다. 이번 Mac에서는 Omnisearch가 IPv6의 `::1`에만 열려 있어 `localhost`는 성공하고 `127.0.0.1`은 연결 거절이었다. v0.14.1은 localhost를 먼저 시도하고 네트워크 실패 시 IPv4로 재시도한다.

## 로컬 검색이라고 화면 내용까지 비공개인 것은 아니다
이 구분은 중요하다. 스크립트의 검색 요청은 로컬 서버로 간다. 하지만 결과는 **Google 페이지의 DOM**, 즉 웹페이지의 문서 구조 안에 표시된다. 그 페이지의 스크립트나 해당 페이지에 접근하는 다른 확장 프로그램이 표시된 내용을 읽을 수 있다.

따라서 이것을 민감한 볼트를 Google에 안전하게 연결하는 보안 경계로 생각하면 안 된다. 고객의 비공개 자료, 개인정보, 비밀번호가 있는 볼트는 연결 대상에서 제외한다. 공개용 캡처에서는 브라우저 탭·북마크·계정 영역뿐 아니라 노트 제목·본문·경로도 확인한다.

Local REST 키는 사용자 스크립트 저장소에 보관하고 화면에서는 비밀번호 필드로 가린다. 그렇더라도 키를 스크립트 원문이나 공유 문서에 직접 적지 않는다. REST를 켜는 것은 로컬 파일을 읽고 조작할 수 있는 추가 인터페이스를 여는 일이므로, 필요할 때만 사용한다.

## 전체 소스와 원작 출처
[v0.14.1 전체 소스](/images/omnisearch-google-research/source.html)에서 완전한 스크립트를 확인하고 복사할 수 있다. 포트·볼트명·개인 경로·API 키는 소스에 하드코딩하지 않고 설치 후 설정 화면에서 입력한다.

원래 아이디어와 출발점은 Simon Cambier의 [userscripts](https://github.com/scambier/userscripts)와 [Omnisearch](https://github.com/scambier/obsidian-omnisearch)다. CMDS 버전은 여기에 멀티볼트, 설정 슬롯, 미리보기, 복사 동작, 키보드 탐색, 앱으로 돌아가기와 사이드바 배치를 확장했다. [CMDS 저장소](https://github.com/johnfkoo951/obsidian-omnisearch-google-cmds)의 공개 버전과 이 글에 첨부한 코드의 버전이 다를 수 있으므로 `@version`을 확인한다.

CMDS 수정분과 원작의 권리 범위는 저장소의 라이선스 고지를 확인해야 한다. 이 글의 콘텐츠 라이선스를 첨부 소프트웨어의 라이선스와 혼동하지 않는다.

### 이번 버전에서 지킨 것
- **Google 본문을 밀거나 덮지 않는다.** 오른쪽 사이드바를 사용하고, 공간이 없으면 숨긴다.
- **노트 열기는 직접 클릭 경로를 우선한다.** 제목과 열기 버튼은 실제 앱 링크다. 비동기 REST 실패 후 강제로 앱을 띄우려 하지 않고 클릭 가능한 복구 링크를 제공한다.
- **이전 검색 응답을 새 검색에 섞지 않는다.** 요청을 취소하고 세대를 구분한다.
- **검색 결과의 HTML을 그대로 실행하지 않는다.** 텍스트와 속성 없는 강조 표시만 렌더한다.

이 도구의 목적은 지식을 더 많이 저장하는 데 있지 않다. **새 자료를 찾는 순간, 이미 읽고 써 둔 내 기록도 함께 다시 꺼내는 것**이다. 검색창을 한 번 쓰는 작은 습관이, 바깥의 지식과 내 안의 질문을 다시 연결하는 입구가 될 수 있다.

## 참고 자료
- Simon Cambier. [Omnisearch](https://github.com/scambier/obsidian-omnisearch), [userscripts](https://github.com/scambier/userscripts).
- [Tampermonkey](https://www.tampermonkey.net/), [Obsidian URI 도움말](https://help.obsidian.md/Extending+Obsidian/Obsidian+URI), [Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri), [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api).
- Cano-Kollmann, M., Cantwell, J., Hannigan, T. J., Mudambi, R., & Song, J. (2016). Knowledge connectivity: An agenda for innovation research in international business. *Journal of International Business Studies, 47*, 255–262. [doi:10.1057/jibs.2016.8](https://doi.org/10.1057/jibs.2016.8).
