---
name: new-post
description: Author a new tutorial or note for bishwas54.com.np — correct frontmatter, components, style rules, quiz format, and the publish checklist. Use when Bishwas asks to write, draft, or publish a post/tutorial/note.
---

# New post

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
