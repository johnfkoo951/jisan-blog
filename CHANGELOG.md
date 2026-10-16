# Changelog

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
