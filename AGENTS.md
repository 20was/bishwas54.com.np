# bishwas54.com.np

Personal learning notebook of Bishwas Adhikari: beginner-friendly tutorials and short notes. Not a portfolio — no marketing, no contact forms, no invented content.

## Stack

- Astro 7 (static output), strict TypeScript (`strictest` preset, TS pinned to 5.9 — do not upgrade to TS 7 until `astro check` compatibility is verified)
- MDX content collections (Content Layer API, Zod 4 schemas)
- Custom CSS design tokens, three themes: light, dark, sepia (`data-theme` on `<html>`)
- Zero-framework web components for interactivity (theme switch, TOC). No React/Preact. (Quizzes removed 2026-08-09 by owner decision — do not add quiz components back.)
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`, deploys `dist/`)

## Commands

- `npm run dev` — dev server
- `npm run check` — astro check (types)
- `npm run lint` / `npm run format` / `npm run format:check`
- `npm test` — vitest (includes the content-sync suite in `scripts/sync/`)
- `npm run build` — static build to `dist/`
- `npm run content:sync:dry-run` — preview what a lab sync would change (no writes)
- `npm run content:validate` — validate lab notes against the publishing contract
- `npm run content:sync` — apply a sync locally (reads `--lab` path, default `~/Desktop/Self-Learn-Docs`)
- Deploys: push to `main` auto-builds + deploys via Cloudflare Workers Builds (since 2026-08-09). `npm run deploy` still works for manual/local deploys but is normally unnecessary.

## Content sync (the publishing pipeline)

**`src/content/tutorials/` is a GENERATED ARTIFACT** — one-way synced from the private repo `20was/self-learn-docs`. Never hand-edit lesson bodies here. Full design:

- Publication is decided ONLY by lab-note frontmatter (`publish: true` + stable `id`) — never by folder. The contract lives in the lab repo's `CLAUDE.md`; the validator in [scripts/sync/contract.mjs](scripts/sync/contract.mjs).
- Identity key is `id`; [src/content/sync-manifest.json](src/content/sync-manifest.json) maps ids → slugs/paths/body-hashes. Folder moves and renames in the lab do NOT duplicate articles or change URLs. Published slugs are frozen; the sync errors on slug changes.
- Ownership overlay: body = source-owned (verbatim, minus the `# h1` which becomes the title); frontmatter `description`/`tags`/`level`/`series`/dates = site-owned and survive syncs, unless the lab note sets the field explicitly (source then wins).
- Flow: push to lab → `notify-blog.yml` dispatches with the commit SHA → [sync-lessons.yml](.github/workflows/sync-lessons.yml) checks out that exact SHA, runs [scripts/sync-content.mjs](scripts/sync-content.mjs), opens/updates a PR on `automation/sync-lessons` → ci.yml validates → manual merge → Workers Builds deploys. No AI anywhere in the pipeline; conversion is deterministic and idempotent.
- Deletions are never automatic: a vanished/unpublished note becomes a "proposed archive" in the PR summary; applying requires `--apply-archives` (sets `archived: true`, page stays up with a banner).
- Secrets (fine-grained PATs, least privilege): blog repo `LESSONS_SYNC_TOKEN` = read-only Contents on self-learn-docs; lab repo `BLOG_DISPATCH_TOKEN` = Contents read/write on this repo (dispatch only).
- `src/content/notes/` remains manually authored (via the `new-post` skill). The sync refuses to write into collections not listed in [scripts/sync/config.mjs](scripts/sync/config.mjs).

## Conventions

- URLs always end with a trailing slash; `trailingSlash: 'always'` + directory build format are load-bearing for SEO on Cloudflare — do not change.
- Markdown pipeline: stay on Astro's default Rust (Sätteri) pipeline. Do not add remark/rehype plugins (forces slow unified opt-in); use MDX components instead.
- JSON-LD: only Article, BreadcrumbList, Person, ProfilePage, WebSite. Never add FAQPage/HowTo/Quiz schema (removed from Google rich results 2023–2026).
- Content states: `draft: true` excludes from build; archived content stays visible with a banner.
- Manual content pipeline (notes): Bishwas gives raw notes (inbox/ file or pasted) to a Claude Code session; the `new-post` skill has the full flow. Draft from supplied material only, ask instead of inventing, publish only on his explicit OK. `aiAssisted: true` in frontmatter (internal, no public badge). No GitHub-Action drafting, no API keys.
- All PRs must pass: check, lint, format, unit tests, build, link check, e2e + axe, Lighthouse (ci.yml).

## Plan

Full approved brief: https://claude.ai/code/artifact/40280637-c8ee-400c-b0c1-e039b8171243
Phases: 0 foundation → 1 design system → 2 content engine → 3 findability/SEO → 4 launch → 5 AI pipeline → 6 polish.
