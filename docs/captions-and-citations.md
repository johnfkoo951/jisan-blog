# Image provenance and APA references
## Scope
Production deployment verified on 2026-10-17: all 29 live article HTML and Markdown endpoints match the local build; 43 captions are rendered. Both citation languages were copied on the live mobile layout, including HTML italics and hanging indents.

All 29 published articles were reviewed for their body images and generated citation UI. This is an image/citation audit, not a new fact-check of every theoretical assertion in their prose. Article slugs, publication dates, external links, original image bytes and non-caption body prose were preserved. Captions and citation metadata are maintained in the vault masters and the blog derivatives together.

## Captions
All **43 image placements / 41 unique image URLs** have separate, visible captions stating image type and subject:
- 26 AI-generated illustration placements and one AI-generated graphic.
- Three actual-running Chrome captures, two actual-settings captures and one service screenshot.
- Six photographs, two reference images and two HTML/CSS-rendered data charts.

Evidence includes original publication records, rendering sources, capture records and direct author confirmations. The author explicitly confirmed the two initially uncertain heroes, “My own probability” and “My name is Yohan Koo”, as AI-generated. The Markdown hero's historical source filename identifies a Gemini-generated asset. No model identity was inferred from appearance.

The Feynman portrait's original photographer/date and some external reference-image rights remain unverified. The caption describes that limit rather than inventing a credit. A caption is not a copyright clearance. Chart captions identify historical analysis, not current results. Omnisearch crops and path masking are disclosed.

The manifest is `content/image-captions.json`. `lib/image-captions.mjs` validates every rendered figure; each needs one image, descriptive alt, a type/topic caption and a provenance record. `npm test` also verifies local asset hashes. Update a record when changing the source asset. Unknown provenance is an explicit `unknown` classification, not a silent default to “AI generated”.

## Code-rendered diagrams
A ```mermaid fence in a post becomes an inline SVG figure. Its caption is the italic line right after the fence and starts with `코드로 렌더링한 도식.` (kind `code-diagram`). The registry key is `diagram:{slug}:{sha8}` with `caption`, `alt`, `evidence` and `srcSha256` (the source hash, not a file hash). The validator counts diagrams separately from images and requires the caption, the record and an accessible name on each SVG view.

Run `npm run diagrams` after adding or editing a fence. It prints the registry record to add. RSS and newsletters use the light PNG at `/images/{slug}/diagram-{sha8}.png`. Type choice and source rules live in the cmds-diagram skill and the cmds-pele catalog, not here. The skill workflow is jisan-blog SKILL.md workflow G.

Diagrams go at the top level or inside a blockquote. A fence inside a list item makes both `npm run diagrams` and the build fail with the post and line. `npm run diagrams -- --check` writes nothing; it lists stale caches, orphans and registry gaps and exits 1 when any exist. Rendering needs a Python with Playwright and fontTools (`PELE_PYTHON`) and the sibling cmds-pele module (`CMDS_PELE_DIR`).

## APA 7 blog-post references
These pages are blog posts, not generic standalone webpages. Use full publication dates, a plain post title and an italic blog title. Do not put a period after the URL or add a retrieval date to a fixed post.

### Korean rendering
The Korean option is explicitly a **Korean application of APA 7**, following the Korean university guide's pattern:

구요한. (2026. 10. 17.). Google 검색 옆에 내 노트를 꺼내 놓기. *紙散(지산).* https://jisan.cmdspace.work/posts/omnisearch-google-research/

The full Korean name's period separates the author element; it is not an initial abbreviation. In-text citation is instead `(구요한, 2026)`. Domestic journals may use house punctuation/date conventions. Do not claim all Korean journals use one style or remove the period merely because the author name is Korean.

### English rendering of a Korean source

Koo, Y. (2026, October 17). Google geomsaek yeope nae noteureul kkeonae noki [Bringing my notes alongside Google search]. *Jisan.* https://jisan.cmdspace.work/posts/omnisearch-google-research/

The original title is romanized and its meaning translated in square brackets. The translation is an explanatory rendering, not a separate English publication. Author spelling uses the established public name Yohan Koo. Jisan is the blog name's romanization, not an invented English title. In-text citation is `(Koo, 2026)`.

Same-author/same-year suffixes such as 2026a and 2026b depend on the reader's complete reference list and must be assigned there, not independently on each article page.

### Metadata and copying
```yaml
citationTitleSource: "Current original public title"
citationTitleEn: "A sentence-case meaning translation"
citationTitleRomanized: "Romanized original title"
```
Both master and derivative carry these fields. The build rejects missing translations or a `citationTitleSource` different from `title`, so title edits cannot silently leave stale references. Use `node scripts/prepare-citation.mjs "Original title" "English translation"` for a romanization candidate and review names/loanwords. `koroman` is only a spelling aid; it is not a translator or a substitute for editorial checking. The known 읽기가 form is explicitly corrected.

Both the sidebar and footer offer Korean and English copy buttons. Clipboard writes contain `text/plain` and `text/html` when supported. HTML preserves blog-name italics, a 0.5-inch hanging indent and double line spacing. Plain-text environments lose those visual styles; no literal Markdown asterisks are inserted. The original `date`, not an unrelated UI modification date, controls the reference date.

## Sources checked on 2026-10-17
- APA Style, [Blog post and blog comment references](https://apastyle.apa.org/style-grammar-guidelines/references/examples/blog-post-references).
- APA Style, [When and how to transliterate titles in references](https://apastyle.apa.org/blog/transliterated-titles-references).
- Kyung Hee University Library, [APA 7 website and social-media references](https://libguides.khu.ac.kr/seoul/citationNreferencing/apastyle/RefOnline): supplies a Korean blog reference beginning `송재룡. (2021. 11. 1.).`.
- Monash University Library, [Non-English-language sources](https://guides.lib.monash.edu/apa-7/non-english-language-sources): Roman alphabet conversion and bracketed English title translation.
- Cranfield University Library, [Referencing foreign-language material](https://blogs.cranfield.ac.uk/library/referencing-foreign-language/): cross-checks the original-script/romanization distinction.
- UNLV, [APA references page, seventh edition](https://www.unlv.edu/sites/default/files/media/document/2026-04/APA_References_Page_7th_Edition.pdf): blog name, not post title, is italicized.

The official APA pages returned empty body text to the retrieval tool in this session. They are cited as canonical entry points, not claimed to have been directly quoted. The implementable rules were cross-checked against accessible university guides. Publisher-specific submission instructions can override the Korean localized rendering.

## Checks
`npm run build && npm test && npm run test:reader`

Gates cover image provenance/caption presence and asset identity, both citation languages on all posts, full dates and valid dates, punctuation and URL termination, title-source drift, escaping, rich/plain clipboard equivalence, legacy cached HTML, mobile focus behavior and unchanged original Markdown copying.

## Changelog
- 2026-10-17: Audited all image placements, synchronized captions and bilingual citation fields with vault masters, and introduced mandatory build/test gates.
- 2026-10-20: Added the `code-diagram` caption kind and `diagram:` registry records for code-rendered diagrams.
