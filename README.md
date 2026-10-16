# 紙散 (Jisan) — Author Blog of Yohan Koo

🇬🇧 English | [🇰🇷 한국어](README.ko.md)

> **Live**: https://jisan.cmdspace.work

Personal author blog published under the pen name **紙散 (Jisan)** — "spreading knowledge on paper". A permanent-URL canonical layer for essays and frameworks: written in an Obsidian vault, published as static pages people can cite and share.

**Vault-as-CMS**: the markdown files are the master, the build is a derivative. No admin panel: articles remain static Markdown. Optional shared engagement uses a server-side Redis REST endpoint; reading does not depend on it.

## Architecture

```
content/posts/*.md    post masters (frontmatter: title/slug/date/kind/summary[/updated/firstPublished])
content/images/{slug}/ per-post images (copied to /images/ at build; _src/ keeps regenerable originals)
build.mjs             generator — index + posts/{slug}/ + feed.xml + robots.txt + sitemap.xml
assets/               brand logos + OG image (v4.3 design standards)
dist/                 build output (gitignored)
vercel.json           buildCommand=npm run build · outputDirectory=dist
deploy.sh             build + vercel --prod
```

Features: light/dark theme (green `#134538` / pink `#E985A2`), per-post citation block with copy button, RSS, lazy `<figure>` promotion for images (`title` → `<figcaption>`), 17 OG/Twitter meta tags.

## Reader experience
- Responsive image-led archive, full-text Korean search, `/` and Cmd/Ctrl+K shortcuts, Escape to clear.
- Collapsible series navigation and contents, reading progress, adjustable text size, native sharing / canonical URL copy.
- Storage-safe light/dark preferences, keyboard focus, skip link, reduced motion, accessible status messages.
- Shared views and reversible likes appear only when the metrics backend is configured and responds successfully. No fabricated counts or browser-local counters.

## Optional engagement setup
The Vercel function `api/engagement.js` requires server-only environment variables:
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Use a Redis database dedicated to this blog.
- `ENGAGEMENT_COOKIE_SECRET`: a securely generated random secret of at least 32 characters. Never place it in assets or commit it. Keep it stable; rotation changes anonymous identity continuity.
- `ENGAGEMENT_ALLOWED_ORIGIN`: optional exact preview origin. Production permits only `https://jisan.cmdspace.work` by default.

Provisioning a service, accepting its price/retention terms, setting production secrets and deployment require owner approval. These are **not** performed by a local build. Without configuration the API reports `enabled: false` and metrics stay hidden. `vercel.json` bundles published Markdown filenames for the endpoint's slug allowlist.

Counting contract:
- Views start from activation, not the original article publication date or past Analytics totals. After 8 uninterrupted visible seconds the browser submits a view; Redis deduplicates per anonymous browser, article and UTC calendar day.
- One active like per anonymous browser/article, reversible. Redis set membership and counters mutate atomically using Lua.
- A signed, HttpOnly, Secure, SameSite=Lax first-party cookie lasts one year. Redis stores pseudonymous HMAC IDs, not email addresses or raw IP addresses. Daily deduplication and rate keys expire; active like memberships persist until unliked or administratively deleted. Hosting-provider logs have their own retention policies.
- These are approximate reactions, **not unique people**. Cookie deletion, cookie blocking, another browser/device, or deliberate automation can inflate counts. Basic same-origin checks, known-bot rejection and 30 mutations/minute/browser are not comprehensive abuse protection. Configure platform rate limits and spending alerts before promotion.
- No database migration/import or historical backfill occurs automatically. Public UI errors never replace unavailable counts with zero.

## Validation
```bash
npm run build
npm test
node scripts/seo_audit.mjs
```
API unit tests use mocked Redis responses; they do not certify a production Redis connection. Validate deployed cookies, concurrent Lua mutations and backend persistence after configuring a preview environment, before production rollout. Browser smoke coverage includes 320/390/768/1440px layouts, keyboard search, search outage, TOC, blocked storage, and mocked like/unlike/view flows.

## Operating

```bash
node build.mjs        # local build → dist/
./deploy.sh           # build + deploy → jisan.cmdspace.work
```

## Rules

- **Slugs are immutable** — the URL survives title changes (citation permanence).
- License **CC BY-NC-ND 4.0** — every post carries a citation block and permanent address.
- The vault markdown is the master; never reverse-extract from derivatives.
- Fidelity-first sanitize: internal wikilinks become links or plain text, local paths are stripped — the prose itself is never rewritten.

---

Built by **Yohan Koo (CMDSPACE)** — https://cmdspace.work

## Production verification (2026-10-16)
The production project uses a dedicated Upstash Free database, connected only to Production. Anonymous shared views and likes are active; paid database plans and Analytics Plus are not enabled.
- Verified against the actual Redis-backed API: 8-second visible dwell, same-browser/day deduplication, like persistence across reload, unlike, five concurrent identical likes counting once, and consistent totals in a second isolated browser.
- Verified wrong-origin rejection and simulated storage-error UI recovery. These checks do not certify resistance to sustained abuse.
- All 27 posts have a hero; two reuse existing editorial art. Local links resolve and 70 distinct public image/external URLs responded during the hygiene pass. HTTP success does not certify the content of external pages.
- Open Graph PNG/JPEG MIME type and dimensions are read from local image bytes. Unknown external image dimensions are omitted rather than invented.

## Engagement incident runbook
- Stop only reactions: set the Production environment variable `ENGAGEMENT_ENABLED=false`, then redeploy with `bash deploy.sh`. GET and POST return `{ "enabled": false }` before any Redis request or cookie creation. Static articles and other projects remain available. Environment changes alone do not change existing deployments.
- Restore: change the variable to `true` and redeploy after checking Redis availability, quota, and credentials. Do not delete the database or rotate the signing secret as a routine recovery step; those lose counts or identity continuity.
- Verify: request `/api/engagement/?slug=quarter-point-short`; disabled is HTTP 200 with `enabled:false`, healthy is HTTP 200 with real counts, storage failure is HTTP 503. Read an article and check search/font controls independently.
- Rate limits: 60 reads and 30 mutations per anonymous browser per minute, with HTTP 429 and Retry-After: 60. This is not a global request cap: cookie churn bypasses it and rejected requests still consume Redis/function resources.
- Budget alerts are notifications, not a spending cap. Review Vercel function usage and Upstash command usage separately. Redis Lua inner commands must not be assumed to cost only one command.
- At 50% of the free database quota review growth; at 75% investigate unusual traffic; at 90% disable reactions if continued use would exhaust the quota. These are manual operating thresholds, not installed automatic alerts or jobs.
- Credential exposure: revoke/replace the exposed Redis token, update server-only Production variables and redeploy. Never put secrets in a ticket, source file, command history or public logs.
- Data loss: no backup/restore guarantee is configured by this repository. Check the provider's available backup/export features before changing plans; do not reset counters or fabricate historical data. Preserve the cookie secret when restoring the same data.
- Public counting/cookie information is available on every article even when Redis is unavailable.
