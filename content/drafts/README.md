# drafts — 발행 대기 글

빌드는 `content/posts/`만 읽는다. 여기 있는 글은 라이브에 나가지 않는다.

## agent-harness-communication-2 (발행 예정일 2026-10-26)

시리즈 「소통으로 읽는 에이전트 하네스」 2편. 1편은 2026-10-25 발행. 날짜를 하루 늦춘 것은 시리즈 정렬 규칙(1부가 가장 이른 날짜) 때문이다.

발행 절차 (자정 이후, 날짜는 frontmatter `date: 2026-10-26` 그대로):

```bash
cd /Users/yohankoo/DEV/jisan-blog
git mv content/drafts/agent-harness-communication-2.md content/posts/agent-harness-communication-2.md
mkdir -p content/images/agent-harness-communication-2
git mv content/drafts/agent-harness-communication-2/hero-agent-harness-communication-2.png content/images/agent-harness-communication-2/
npm run diagrams            # 도식 3개 렌더. 출력의 srcSha256 전체값을 아래 JSON의 FILL 자리에 넣는다
# content/drafts/agent-harness-communication-2.captions.json 의 4개 기록을 content/image-captions.json "images"에 넣는다 (키 그대로)
npm run build && grep -rl "yohankoo\|Obsidian_MBP\|omnicontrol\|file:///" dist/posts/ ; npm test && npm run test:reader && npm run test:diagram-reader
vercel deploy --prod --yes --scope johnfkoo951s-projects
curl -s https://jisan.cmdspace.work/posts/agent-harness-communication-2/ | grep -c "책임의 배열"
git rm -q content/drafts/agent-harness-communication-2.captions.json && git add -A && git commit -m "post: agent-harness-communication-2" && git push
```

그 뒤 볼트: 2편 정본 frontmatter `published: true`, `publishedUrl`, `publishedChannels: [blog]`, 발행 기록(`71. Published/2026-08-16-지산 블로그 개장 기록` 추가분 표)과 `06-개장-큐레이션`, `blog-mapping.json`에 한 줄.
