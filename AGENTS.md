# bishwas54.com.np

Personal learning notebook of Bishwas Adhikari: beginner-friendly tutorials (each ends with a practice quiz) and short notes. Not a portfolio — no marketing, no contact forms, no invented content.

## Stack

- Astro 7 (static output), strict TypeScript (`strictest` preset, TS pinned to 5.9 — do not upgrade to TS 7 until `astro check` compatibility is verified)
- MDX content collections (Content Layer API, Zod 4 schemas) — arrives Phase 2
- Custom CSS design tokens, three themes: light, dark, sepia (`data-theme` on `<html>`)
- Zero-framework web components for interactivity (quiz, theme switch, TOC). No React/Preact.
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`, deploys `dist/`)

## Commands

- `npm run dev` — dev server
- `npm run check` — astro check (types)
- `npm run lint` / `npm run format` / `npm run format:check`
- `npm run build` — static build to `dist/`
- `npm run deploy` — build + `wrangler deploy` (requires Cloudflare auth)

## Conventions

- URLs always end with a trailing slash; `trailingSlash: 'always'` + directory build format are load-bearing for SEO on Cloudflare — do not change.
- Markdown pipeline: stay on Astro's default Rust (Sätteri) pipeline. Do not add remark/rehype plugins (forces slow unified opt-in); use MDX components instead.
- JSON-LD: only Article, BreadcrumbList, Person, ProfilePage, WebSite. Never add FAQPage/HowTo/Quiz schema (removed from Google rich results 2023–2026).
- Content states: `draft: true` excludes from build; archived content stays visible with a banner.
- AI-drafted content lands only via draft PRs from `inbox/` workflow; never modifies published posts; `aiAssisted: true` recorded in frontmatter (internal only, no public badge).
- All PRs must pass: check, lint, format, build (later: tests, axe, lychee, Lighthouse).

## Plan

Full approved brief: https://claude.ai/code/artifact/40280637-c8ee-400c-b0c1-e039b8171243
Phases: 0 foundation → 1 design system → 2 content engine → 3 findability/SEO → 4 launch → 5 AI pipeline → 6 polish.
