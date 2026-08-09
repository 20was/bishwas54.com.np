# Generated content — do not hand-edit

Every `.mdx` file in this directory is a **generated artifact**, synced
one-way from the private study lab **20was/self-learn-docs** by
`scripts/sync-content.mjs` (triggered via `.github/workflows/sync-lessons.yml`,
which opens a PR on the `automation/sync-lessons` branch).

## Ownership contract

- **Body** (everything below the frontmatter): owned by the lab note.
  Any hand-edit here is overwritten verbatim on the next sync.
  To change lesson text, edit the note in `self-learn-docs`.
- **Frontmatter**: site-owned overlay. `description`, `tags`, `level`,
  `series`, and dates survive syncs — *unless* the lab note sets the same
  field explicitly in its frontmatter, in which case the source wins.
- **Identity**: `sourceId` = the note's stable `id`. The manifest
  (`../sync-manifest.json`) maps ids to slugs; published URLs are frozen —
  the sync refuses slug changes.

## Recovery

- Failed/wrong sync: close the sync PR without merging; nothing touched `main`.
- Bad merge: `git revert` the sync commit on `main`; the next sync
  regenerates cleanly (it is idempotent).
- Remove an article safely: set `status: archived` (or `publish: false`)
  in the lab note, then run the sync with `--apply-archives`. The sync
  never deletes files on its own.

Full process docs: `AGENTS.md` in this repo and `CLAUDE.md` in the lab repo.
