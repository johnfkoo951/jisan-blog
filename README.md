# 紙散 (Jisan) — Author Blog of Yohan Koo

🇬🇧 English | [🇰🇷 한국어](README.ko.md)

> **Live**: https://jisan.cmdspace.work

Personal author blog published under the pen name **紙散 (Jisan)** — "spreading knowledge on paper". A permanent-URL canonical layer for essays and frameworks: written in an Obsidian vault, published as static pages people can cite and share.

**Vault-as-CMS**: the markdown files are the master, the build is a derivative. No database, no admin panel — `content/posts/*.md` plus one build script.

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
