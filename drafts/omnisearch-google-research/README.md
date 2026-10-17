# Omnisearch research guide
## Publication package
The original preparation snapshot remains here. Published on 2026-10-17: https://jisan.cmdspace.work/posts/omnisearch-google-research/ . Live article, category, source viewer, userscript and five images returned HTTP 200 and matched the local build byte-for-byte. The release copy is `content/posts/omnisearch-google-research.md`, with assets in `content/images/omnisearch-google-research/`; the `기술` category maps to `tech`. Edit the vault master first, then regenerate the release copy. Do not assume this archived draft has later editorial changes.

## Contents
- `article.md`: sanitized derivative of the Obsidian master, with unchanged prose apart from link/image/frontmatter transformations.
- `assets/`: five real-Chrome-derived images, a full-source viewer with Copy, versioned userscript and license notice.
- `checksums.json`: public-asset SHA-256 manifest.
- `verify.cjs`: local browser checks for an isolated build.

## Capture provenance
Captured 2026-10-17 from the user's real Chrome with the installed Tampermonkey script, using macOS app controls. The cmux WKWebView was used only to read Google results initially and was not used for the published images. Search terms: `Luhmann's communication` and `knowledge connectivity`.

Images are cropped, scaled to 1600px (1200×630 for the hero), stripped of browser tabs/bookmarks/account areas, and explicitly redact internal path rows. Result titles, score order and Google text were not manufactured or rearranged. Settings were inspected and closed without saving; the REST key/path fields were already empty.

The first comparison selects Main; the second shows all vaults. Counts and rankings are a time-specific observation, not benchmark results. Google AI Overview is not used as an authoritative theoretical source.

## Publication checklist
1. Review the vault master, especially the first-person research interpretation and the local-note titles visible in images.
2. Regenerate this derivative from the master if edited; preserve source-byte identity and the source license.
3. Copy `article.md` to `content/posts/omnisearch-google-research.md` and `assets/` to `content/images/omnisearch-google-research/` only when publication is approved.
4. Set the intended publication date, run build/tests, scan the new post and source assets for private paths, and validate all links/images.
5. Deploy only on approval. Record the public URL and channels in the vault and publishing ledger after live verification.

The raw GitHub script may still be v0.13.3. This article's source viewer and download point to the bundled v0.14.1, not to an assumed GitHub release. The full-source appendix is software; the blog's article license must not be substituted for its own license notice.

## Verification
Existing blog regression: 15 tests passed. Isolated draft: tech category, five decoded figures, 1200×630 hero metadata, source links, exact source DOM/download/clipboard bytes, 1440px and 390px layouts, and runtime errors checked.

Run with Node, installed Chrome and Playwright:
```sh
node drafts/omnisearch-google-research/verify.cjs <isolated-dist-directory> <canonical-userscript>
```
`PLAYWRIGHT_MODULE` may point to an existing Playwright package; `TEST_OUTPUT_DIR` optionally receives browser screenshots. The checker starts a loopback HTTP server and closes it and Chrome after completion.

## Changelog
- 2026-10-17: Production verified; tech category live, IndexNow accepted 34 URLs, SEO audit passed with zero failures.
- 2026-10-17: User approved publication; copied the article and assets into the production content tree.
- 2026-10-17: Created the unpublished technical guide, real-screen comparisons, source appendix and validation package. Prepared the tech category locally.
