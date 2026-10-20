---
title: "도식 렌더링 점검용 글"
slug: diagram-fixture
date: 2026-10-20T09:00
kind: 기술
summary: "코드로 그린 도식이 정적 블로그에서 라이트, 다크, 폰 폭으로 어떻게 보이는지 점검하는 시험용 글이다."
citationTitleSource: "도식 렌더링 점검용 글"
citationTitleEn: "A test post for diagram rendering"
citationTitleRomanized: "Dosik renderingeul jeomgeomhaneun geul"
---

이 글은 시험용 픽스처다. 실제 발행 글이 아니다.

## 흐름 도식

볼트 원문은 블로그 정본을 거쳐 여러 채널로 퍼진다.

```mermaid
flowchart LR
  accTitle: 볼트에서 블로그로
  accDescr: 볼트 원문이 블로그 정본과 여러 채널로 퍼지는 흐름
  %% @key: B
  %% @interp: N
  V["`**볼트 원문**
마스터 노트`"] --> B["`**블로그 정본**
인용 URL`"]
  B --> R["`**RSS**
전문 피드`"]
  B --> L["`**마크다운 원문**
에이전트 인용`"]
  B -.-> N["`**뉴스레터**
PNG 도식`"]
```
*코드로 렌더링한 도식. 볼트 원문이 블로그 정본 URL을 거쳐 RSS, 마크다운 원문, 뉴스레터로 퍼지는 흐름이다.*

## 시간 도식

```mermaid
timeline
  title 도식 도입 단계
  section 준비
    10월 18일 : 기획서
    10월 20일 : 정본 모듈
  section 적용
    10월 21일 : 블로그 캐시
    10월 22일 : 뉴스레터 PNG
```
*코드로 렌더링한 도식. 도식 도입을 준비와 적용 두 구간의 날짜순 단계로 정리했다.*

## 예시 코드 안의 도식

아래는 작성 예시다. 긴 펜스 안의 mermaid는 도식으로 렌더하지 않는다.

````markdown
```mermaid
flowchart LR
  A --> B
```
*코드로 렌더링한 도식. 예시.*
````

끝.
