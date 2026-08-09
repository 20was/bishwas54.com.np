---
name: new-post
description: Author a new tutorial or note for bishwas54.com.np — correct frontmatter, components, style rules, quiz format, and the publish checklist. Use when Bishwas asks to write, draft, or publish a post/tutorial/note.
---

# New post

## The flow (this session IS the pipeline — no API keys, no Actions)

Bishwas studies a topic anywhere, then hands over raw material: a file in
`inbox/`, pasted text, a link, or just "write a tutorial about X from what
I learned". From that:

1. Extract the central idea. Draft using ONLY the supplied material plus
   well-established general knowledge. Where his notes are ambiguous or
   thin, ASK him — never guess, never invent his experiences, numbers,
   results, or citations. Never claim something was tested unless he says
   he tested it.
2. Write the post per the rules below, show him a summary + the live-file
   path, let him review (dev server or read the file).
3. Publish only on his explicit OK (see checklist). Delete the processed
   inbox file in the same commit.

## VERBATIM rule (owner requirement — overrides everything)

Bishwas's notes are published **word-for-word**. Never condense, rewrite,
"improve", or reflow his text. Conversion is mechanical:

1. Body = source file byte-for-byte, minus ONLY the top `# h1` line
   (which becomes the frontmatter title). Assemble by script, never retype.
2. Append `## Check what stuck` + `<Quiz>` (tutorials only) after his text.
3. The one-sentence frontmatter `description` is the only text you write.
4. Verify byte-identical: strip frontmatter/imports/quiz from the MDX,
   diff against the source minus h1 — must match exactly.
5. `src/content/` is in `.prettierignore` — keep it there.

## AUTOMATED since 2026-08-09 — conversion usually needs no session

Pushing lesson notes to `20was/self-learn-docs` triggers the pipeline:
dispatch → site repo `sync-lessons.yml` → `scripts/convert-lessons.mjs`
(mechanical verbatim, preserves frontmatter/quiz, stamps dateUpdated,
skips 0-byte stubs, SECTIONS + SLUG_OVERRIDES maps inside) → Claude
action appends quizzes to new lessons → build gate → push → auto-deploy.
Manual equivalents: `npm run sync-lessons` locally, or Actions →
"Sync lessons from study lab" → Run workflow. If a manual conversion IS
requested, prefer running the script over hand-converting. New lab
section folder ⇒ add it to SECTIONS in the script first.

## Series conversion (his study lab → site)

Study lab: `/Users/bishwas/Desktop/Self-Learn-Docs/networking-lab/`
(sections: 01-foundations, 02-aws, 03-docker, 04-kubernetes, 05-proxies,
06-traffic-flow). When he says "convert the new lessons":

- **Check file size first — 0-byte files are unwritten stubs; skip them,
  never invent content for them.** (As of 2026-08-08: foundations 01–06
  published, 07–14 empty.)
- Slug = filename minus the `NN-` prefix. Series order = the `NN` number.
- Series name so far: `'DevOps Networking'` (foundations). Ask before
  starting a new series name for other sections.
- Batchable: parallel agents fine (disjoint files), but the main session
  re-verifies every file byte-identical before deploy.
- MDX safety scan per source: literal `{` or raw `<`+letter in prose
  breaks MDX — report, don't silently edit.

## Decide type

- **Tutorial** (`src/content/tutorials/<slug>.mdx`): teachable topic, step-by-step, ends with a quiz. Level: beginner unless told otherwise.
- **Note** (`src/content/notes/<slug>.mdx`): one small tip/insight, no quiz.

Slug: short kebab-case, no dates (URLs are permanent).

## Frontmatter (validated by src/content.config.ts)

```yaml
---
title: 'Plain-words title'
description: 'One sentence, said simply — this is the SEO description and lede.'
datePublished: YYYY-MM-DD # today, real date
tags: ['lowercase', 'reuse-existing-tags']
level: beginner # tutorials only
draft: true # remove only at publish time
aiAssisted: true # if Claude drafted it
---
```

On revising a published post, set `dateUpdated` — only for real changes (fake freshness hurts SEO trust).

## Style

- Beginner-friendly: assume zero knowledge, plain words, short paragraphs, one idea each.
- First person allowed; NEVER invent personal experiences, numbers, project status, citations, or "I tested this" claims.
- Question-form H2s where natural ("Why does X exist?") — helps AI-search citability. Answer in the first two sentences of the section.
- Components (import from `../../components/`): `Callout` (note/tip/warning), `Quiz` + `QuizQuestion`, `Steps` (text-only steps).

## Hard rule: no code fences inside JSX bodies

Markdown code fences inside `<Steps>` or any component body **break the Astro 7 Sätteri build**. For step sequences with code, use `### Step N — title` headings with fences between them.

## Quiz (tutorials, required)

3–4 `QuizQuestion`s, answers drawn only from the post's own content:

```jsx
<Quiz>
  <QuizQuestion question="…?" options={['a', 'b', 'c']} answer={1}>
    Explanation shown after answering.
  </QuizQuestion>
</Quiz>
```

## Publish checklist

1. `npm run check && npm run lint && npm run format && npm test && npm run build` — all green (build regenerates OG images automatically).
2. Remove `draft: true`.
3. Commit, push to main (owner's chosen flow), `npm run deploy` (builds, deploys, pings IndexNow).
4. Spot-check the live URL after ~1 min propagation (new asset URLs 404 briefly).
