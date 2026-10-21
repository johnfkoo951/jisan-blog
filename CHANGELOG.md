# Changelog

## 2026-10-21: Site footer centered between the reader rails
- The site footer was left-aligned in a 940px wrap, so with the fixed reader rails open (≥1360px, rails at 50% ± 414px) its first characters sat under the left rail.
- `.site-foot` is now centered on every page, and at ≥1360px its wrap is limited to 828px, the gap between the rails. Checked at 1440, 1200 and 390px and on the home page; 50 unit tests, 22 reader and 4 diagram browser scenarios pass.
- First post with Pele diagrams published the same day: `alexandria-for-my-son` (four diagrams, `npm run diagrams` cache committed).

## 2026-10-20: Code-rendered diagrams (not deployed)
- Added ```mermaid support. `npm run diagrams` lints with cmds-pele `pele-check --surface blog`, renders locally with Pele 1.6.0 in Chrome and commits a cache: `content/diagrams/{slug}/{sha8}.json` (732px and 340px SVG), `content/images/{slug}/diagram-{sha8}.png` (light @2x) and a diagram-only Pretendard subset `assets/fonts/cmds-pele-sans-{400,700}.woff`.
- `build.mjs` only reads the cache, so the Vercel build still needs no browser, font or network. A missing or stale entry fails with `run npm run diagrams`.
- Diagrams render as `<figure class="diagram">` with the italic line after the fence as caption. Site tokens map to the cmds-pele `--cp-*` hooks for light, dark and print. RSS carries the PNG instead of SVG.
- New caption kind `code-diagram` (`코드로 렌더링한 도식.`) with `diagram:{slug}:{sha8}` registry records, counted separately from images.
- Pages without diagrams, the feed, search index and sitemap are byte-identical to the previous build. Only `assets/diagram.css` and `assets/vendor/cmds-pele/` are added to dist.
- Tests use fixtures in `tests/fixtures/diagrams`; no article was added or changed. New `npm run test:diagram-reader` checks widths 320 to 1920, theme tokens and font metrics in Chrome.
- Follow-up fixes after independent review: a mermaid fence inside a list item now fails `npm run diagrams` and the build with the post and line (line numbers come from token positions, so fences in quotes and lists report the right line). `npm run diagrams -- --check` also reports missing or drifted registry records with the same rules as the build. A missing or incomplete renderer Python names `PELE_PYTHON` and what it needs. Cache errors no longer carry marked's bug-report suffix. Three regression tests added (50 in total).

## 2026-10-18 — Citation heading refinement
- Renamed both sidebar and footer citation section headings to 인용하기. Bilingual APA formatting and clipboard behavior are unchanged.

## 2026-10-17 — Evidence-based captions and bilingual APA 7
- Audited 43 image placements across 29 posts; added type/topic captions and provenance registry entries for 41 unique sources. Each image now has a separate figure, including the former grouped HQ photos.
- Preserved original image files, article slugs/dates and non-caption prose; synchronized caption and citation fields with the vault masters.
- Added Korean localized APA 7 and English romanized-title plus translation references in the sidebar and footer, full publication dates and italic blog names, and HTML/plain clipboard copying.
- Added strict gates for missing captions, provenance/hash drift, stale title metadata, dates, reference punctuation and rich-text copying.
- Recorded original-photographer uncertainty for external reference photos instead of inventing attribution.

## 2026-10-17 — Markdown source clipboard
- Added a shared full-Markdown copy button below the raw-source link, using the public index.md including its public frontmatter.
- Added loading state, success/error feedback, retryable failed fetches and a gesture-preserving clipboard path with text fallback.
- Verified exact source copying for all 29 articles and failure/permission/fallback cases; browser coverage increased to 21 scenarios.

## 2026-10-17 — Shared reader sidebars
- Deployed after approval; verified all 29 live HTML/Markdown endpoints, desktop and mobile interactions, keyword search, and zero SEO failures.
- Added shared heading and information rails to all current/future article pages without editing article sources or canonical URLs.
- Added active H2–H4 navigation, section-link copying, explicit author keyword/related overrides, labeled text-match keywords, source resources and citation/URL actions.
- Preserved the desktop reading measure; added one-at-a-time modal drawers, focus handling, IME/modifier guards, blocked-storage and legacy/no-JS fallbacks, and print behavior.
- Connected keyword links to prefilled archive search and included keywords in the search index.
- Corrected SEO auditing of actual Markdown endpoints and added 26 unit/build/API checks plus 18 browser scenarios covering all 29 articles.
- Documented the system in both README languages and a shared contract with desktop/mobile captures.

## 2026-10-16 — Operational safeguards
- Added a Production environment kill switch that bypasses Redis and anonymous cookie issuance without interrupting static reading.
- Added atomic per-browser read throttling and Retry-After responses. These are not global spending caps.
- Added reader-facing counting, cookie, retention and analytics information to every article.
- Documented disable/restore, quota review, credential rotation and data-loss procedures in both README languages.
- Added kill-switch and read-rate regression tests.

## 2026-10-16 — Shared engagement activation and article hygiene
- Connected a dedicated free Redis database to production only; signing secrets are server-only.
- Added an eight-second network timeout to engagement requests and removed an unnecessary API redirect.
- Filled two missing heroes with existing editorial artwork; added dated historical-context notes in the canonical manuscripts before syncing. Historical scores and subscriber counts remain unchanged.
- Fixed Open Graph image MIME type and dimensions to reflect actual PNG/JPEG bytes rather than hard-coded PNG/1200×630 values.
- Added a regression gate requiring an existing article hero for every post.
- Production checks passed: real view deduplication, persisted/reversible likes, concurrent idempotent likes, second-browser shared counts, origin rejection, and simulated failure recovery. All 70 checked public image/external URLs responded; no missing local links across 27 articles.

## 2026-10-16 — Reset reading size
- Added an accessible default-size button beside the font controls. Restores and persists the default 18px size with status feedback; blocked browser storage remains non-fatal.
- Added the reset control to the all-article build regression checks.

## 2026-10-16 — Production reader UI rollout
- Release scope: the previously tested reading/search UI and optional engagement endpoint; all 27 article sources and URLs remain unchanged.
- Shared metrics remain disabled until a real store is provisioned and verified. No paid database or add-on is enabled by this release.
- Existing deploy.sh runs the private site catalog callback after successful deployment.
- Enabled basic Vercel Web Analytics (not Plus); redeployed after activation to serve the analytics script.
- Pre-release checks: build, 10 tests, whitespace and specified private-path leak scan passed. Deployment outcome is tracked in the private operations ledger.

## 2026-10-15 — Editorial reading experience (local, not deployed)
- Refined light/dark typography, archive layout and existing-image thumbnails. No new editorial content or images.
- Added collapsible contents and series navigation, reading progress, adjustable text size, share controls and accessible feedback.
- Made search keyboard/IME friendly with loading, empty and failure states. Reader controls tolerate unavailable browser storage.
- Added optional server-side Redis REST engagement: delayed daily-deduplicated views and reversible likes. Signed anonymous cookies, atomic updates, origin validation, basic bot filtering and per-browser mutation limits.
- Disabled/unavailable metrics stay hidden; real storage provisioning and production rollout remain pending approval.
- Added ten build/API tests. Verified four viewport widths across four page types, search failure, storage failure, TOC, font persistence and mocked interaction flows in a browser.
- SEO: 14 PASS, 3 existing WARN, 0 FAIL. The description-length warning and search-engine verification notices remain unchanged.
- Preserved all 27 article source files and immutable slugs. No commit, push, service creation or deployment in this change.
