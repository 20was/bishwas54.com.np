---
name: new-post
description: Author a new note for bishwas54.com.np, or operate the lesson sync — correct frontmatter, components, style rules, and the publish checklist. Use when Bishwas asks to write, draft, publish, or sync a post/tutorial/note.
---

# New post

## Two pipelines — know which one you're in

1. **Tutorials/lessons** (`src/content/tutorials/`) are a GENERATED
   ARTIFACT, one-way synced from the private study lab
   `20was/self-learn-docs`. **Never author or hand-edit tutorial MDX in a
   session.** To publish a lesson: it gets `publish: true` frontmatter in
   the lab repo (contract documented in the lab's `CLAUDE.md`), and the
   sync does the rest. See "Sync operations" below.
2. **Notes** (`src/content/notes/`) are authored in-session from
   Bishwas's raw material via the flow below.

## Notes flow (this session IS the pipeline — no API keys, no Actions)

Bishwas hands over raw material: a file in `inbox/`, pasted text, a link,
or "write a note about X from what I learned". From that:

1. Extract the central idea. Draft using ONLY the supplied material plus
   well-established general knowledge. Where his notes are ambiguous or
   thin, ASK him — never guess, never invent his experiences, numbers,
   results, or citations. Never claim something was tested unless he says
   he tested it.
2. Write the post per the rules below, show him a summary + the file
   path, let him review.
3. Publish only on his explicit OK (see checklist). Delete the processed
   inbox file in the same commit.

## VERBATIM rule (owner requirement — overrides everything)

Bishwas's study notes are published **word-for-word**. Never condense,
rewrite, "improve", or reflow his text. The sync script enforces this for
tutorials (body = lab note minus the `# h1`, byte-for-byte). For notes,
the one-sentence frontmatter `description` is the only text you write
unless he asks for drafting help. `src/content/` is in `.prettierignore`
— keep it there.

## Quizzes are REMOVED (owner decision, 2026-08-09)

No quizzes anywhere. Quiz components were deleted. Do not add quiz
sections, quiz components, or Quiz JSON-LD to anything.

## Sync operations (tutorials)

- Automated path: he pushes notes to the lab → `notify-blog.yml`
  dispatches (with commit SHA) → this repo's `sync-lessons.yml` runs
  `scripts/sync-content.mjs` against that exact SHA → PR on
  `automation/sync-lessons` → ci.yml validates → he merges → auto-deploy.
- Local commands: `npm run content:sync:dry-run` (preview),
  `npm run content:validate`, `npm run content:sync` (apply). Default lab
  path `~/Desktop/Self-Learn-Docs`, override with `--lab <path>`.
- Publication is decided ONLY by `publish: true` + `id` in the lab note's
  frontmatter. Empty files and unmarked files are skipped — never invent
  content for them.
- Identity = `id` (see `src/content/sync-manifest.json`). Routes/URLs are
  frozen; the sync errors on slug OR series changes that would move a
  URL. Folder moves don't duplicate.
- Routes: series lessons `/tutorials/<series-slug>/<slug>/` (+ landing
  page at `/tutorials/<series-slug>/`); standalone `/tutorials/<slug>/`.
  Series orders must be contiguous 1..n — publishing part 3 before part 2
  fails validation. URL migrations append 301s to `public/_redirects`.
- Frontmatter overlay: `description`/`tags`/`level`/`series` may be
  curated here and survive syncs (unless the lab note sets them
  explicitly). Body edits here are ALWAYS lost on next sync.
- Deletions: never automatic — "proposed archive" in the PR; apply with
  `--apply-archives`.
- New lab track/section ⇒ extend `SERIES_BY_FOLDER` (metadata default)
  and, for new collections, `SYNC_COLLECTIONS` in `scripts/sync/config.mjs`.
- MDX safety: literal `{` or raw `<`+letter in note prose breaks the MDX
  build — the sync PR's ci run catches it; report, don't silently edit.

## Notes: frontmatter (validated by src/content.config.ts)

```yaml
---
title: 'Plain-words title'
description: 'One sentence, said simply — this is the SEO description and lede.'
datePublished: YYYY-MM-DD # today, real date
tags: ['lowercase', 'reuse-existing-tags']
draft: true # remove only at publish time
aiAssisted: true # if Claude drafted it
---
```

On revising a published post, set `dateUpdated` — only for real changes (fake freshness hurts SEO trust).

## Style

- Beginner-friendly: assume zero knowledge, plain words, short paragraphs, one idea each.
- First person allowed; NEVER invent personal experiences, numbers, project status, citations, or "I tested this" claims.
- Question-form H2s where natural ("Why does X exist?") — helps AI-search citability. Answer in the first two sentences of the section.
- Components (import from `../../components/`): `Callout` (note/tip/warning), `Steps` (text-only steps).

## Hard rule: no code fences inside JSX bodies

Markdown code fences inside `<Steps>` or any component body **break the Astro 7 Sätteri build**. For step sequences with code, use `### Step N — title` headings with fences between them.

## Publish checklist (notes)

1. `npm run check && npm run lint && npm run format && npm test && npm run build` — all green (build regenerates OG images automatically).
2. Remove `draft: true`.
3. Commit, push to main (owner's chosen flow) — Workers Builds deploys automatically.
4. Spot-check the live URL after ~1 min propagation (new asset URLs 404 briefly).
