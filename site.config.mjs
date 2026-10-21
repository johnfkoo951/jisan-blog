// Site identity — the only file a different blog needs to change.
// build.mjs, lib/, scripts/ and api/ read names, URLs, citation formats and keys from here.
// The engine is shared with vault-blog-starter (scripts/export-starter.mjs); this file and content/ are not.

export const SITE = {
  domain: 'jisan.cmdspace.work',
  url: 'https://jisan.cmdspace.work',
  title: '紙散 · 지산',
  tagline: '기록으로 지식을 세상에 퍼뜨리는 사람',
  description: '구요한(Yohan Koo)의 저자 블로그. 지식관리, AI 시대의 기록, 프레임워크와 에세이의 인용 정본.',
  author: 'Yohan Koo',
  authorKo: '구요한',
  authorUrl: 'https://cmdspace.work',
  authorSameAs: ['https://bio.cmdspace.work', 'https://github.com/johnfkoo951'],
  // 글(콘텐츠) 라이선스. 코드 라이선스는 LICENSE(MIT).
  license: 'CC BY-NC-ND 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ko',
  // STAGING: true → noindex (개장 승인 전). 개장 시 false 로 바꾸고 재배포.
  staging: false,
  // 머리말 로고 글자, 글 바이라인, llms.txt 제목, JSON-LD 별칭
  brand: { mark: '紙散', roman: 'Jisan' },
  favicon: '/assets/logos/cmds-logo-round.png',
  ogImage: '/assets/og/og-jisan.png',
  themeStorageKey: 'jisan-theme',
  footerLinks: [['RSS 구독', '/feed.xml'], ['CMDSPACE', 'https://cmdspace.work'], ['bio', 'https://bio.cmdspace.work']],
  // APA 7 블로그 인용. 국문은 국내 적용형(저자 뒤 온점), 영문은 성, 이니셜.
  citation: {
    ko: { author: '구요한.', inText: '구요한', blog: '紙散(지산)' },
    en: { author: 'Koo, Y.', inText: 'Koo', blog: 'Jisan' },
  },
  seo: {
    // vercel.app 기본 주소가 정식 도메인으로 308 되는지 확인할 때 쓴다. 없으면 ''.
    duplicateHost: 'https://jisan-blog.vercel.app/',
    // IndexNow 키(공개 값). 빌드가 /{key}.txt 를 만들고 seo_audit --ping 이 쓴다. 없으면 ''.
    indexNowKey: '64f0d0ae272fc4c0937b9f98a9ca9e9c',
  },
  // 홈 글 모음 제목 옆 한 줄 (없으면 '')
  archiveTagline: '기록에서 연결로',
  // api/engagement.js (조회·반응 집계, 선택 기능). since 와 analyticsNote 는 글 하단 안내문에 들어간다.
  engagement: { cookie: 'jisan_reader', keyPrefix: 'jisan', since: '2026년 10월 16일', analyticsNote: '별도의 방문 분석은 Vercel Web Analytics를 사용하며, 위 조회수와 기준이 다르다.' },
  // 빌드 결과에 나오면 안 되는 개인 흔적(로컬 경로 조각, 도구 이름). /Users/ 와 file:/// 는 늘 검사한다.
  privateMarkers: ['yohankoo', 'Obsidian_MBP', 'omnicontrol'],
  // 원고에 쓰면 테스트가 막는 표기 { 금지: 정본 }
  bannedTerms: { '체텔카스텐': '제텔카스텐' },
  // 회귀 방지 하한: 캡션 달린 본문 이미지 수, 이미지 기록 수 (글을 지워 수가 줄면 테스트가 알린다)
  checks: { minCaptionedImages: 43, minImageRecords: 41 },
};

// 글 분류 (frontmatter kind → URL /kind/{slug}/). 새 kind 는 여기 한 줄 추가.
export const KINDS = { '에세이': 'essay', '프레임워크': 'framework', '소개': 'intro', '보고서': 'report', '기술': 'tech' };

// 글 정보 사이드바의 "본문에서 찾은 키워드" 사전. [표시 이름, [본문에서 찾을 표기들]]
// 글 frontmatter 의 keywords 가 있으면 그것이 먼저다.
export const KEYWORD_TERMS = [
  ['Omnisearch', ['Omnisearch']], ['옵시디언', ['옵시디언', 'Obsidian']],
  ['지식 연결성', ['지식 연결성', 'knowledge connectivity']],
  ['니클라스 루만', ['루만', 'Luhmann']], ['제텔카스텐', ['제텔카스텐', 'Zettelkasten']],
  ['질 들뢰즈', ['들뢰즈', 'Deleuze']], ['리좀', ['리좀', 'rhizome']],
  ['자기생산', ['자기생산', 'autopoiesis']], ['소통', ['소통', 'communication']],
  ['LLM Wiki', ['LLM Wiki']], ['Karpathy', ['Karpathy', '카르파시']],
  ['kepano', ['kepano']], ['CMDS Process', ['CMDS Process']],
  ['시스템 파일', ['시스템 파일', 'System Files']], ['하네스', ['하네스', 'harness']],
  ['컨텍스트 엔지니어링', ['컨텍스트 엔지니어링', 'Context Engineering']],
  ['스키마', ['스키마', 'schema']], ['마크다운', ['마크다운', 'Markdown']],
  ['지식관리', ['지식관리', '지식 관리', 'knowledge management']],
  ['PKM', ['PKM']], ['세컨드 브레인', ['세컨드 브레인', '세컨드브레인', 'Second Brain']],
  ['AKM Index', ['AKM Index']], ['PSA Fit', ['PSA Fit', 'Person-System-AI']],
  ['9요한', ['9요한', '9Yohan', '아홉 명의 요한']], ['CmdMD', ['CmdMD']],
  ['Open Knowledge Format', ['Open Knowledge Format', 'OKF']],
  ['생성형 AI', ['생성형 AI', 'generative AI']], ['AI Divide', ['AI Divide', 'AI 디바이드']],
  ['에이전트', ['에이전트', 'agent']], ['메타데이터', ['메타데이터', 'metadata']],
  ['선택적 망각', ['선택적 망각', 'selective forgetting']], ['4C 프레임', ['4C']],
  ['Organizing Dimension', ['Organizing Dimension']], ['요한복음', ['요한복음']],
  ['표적', ['표적']], ['세례요한', ['세례요한']], ['파인만', ['파인만', 'Feynman']],
  ['회고', ['회고']], ['질문', ['질문']], ['기록', ['기록']],
];
