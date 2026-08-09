/**
 * Filesystem side of the sync: render MDX files, merge the site-owned
 * frontmatter overlay, write the manifest.
 *
 * Ownership contract (decision 2026-08-09):
 *   - Body: source-owned, verbatim. Every sync replaces it.
 *   - Frontmatter: site-owned overlay. Curated fields (description, tags,
 *     level, series, dates, draft, archived, aiAssisted) survive syncs
 *     unless the source note sets them explicitly — explicit source
 *     values always win.
 *
 * Safety: target paths are confined to SYNC_COLLECTIONS dirs; a target
 * file not tracked by the manifest is never overwritten.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { MANIFEST_PATH, SYNC_COLLECTIONS } from './config.mjs';
import { targetPathFor } from './core.mjs';

const today = () => new Date().toISOString().slice(0, 10);

function toYaml(data) {
  return stringifyYaml(data, { lineWidth: 0, singleQuote: true }).trimEnd();
}

function renderMdx(frontmatter, body) {
  return `---\n${toYaml(frontmatter)}\n---\n\n${body}\n`;
}

/** Frontmatter for a brand-new synced document. */
function createFrontmatter(doc) {
  const fm = {
    title: doc.title,
    description: doc.description,
    datePublished: today(),
    tags: doc.tags,
  };
  if (doc.level) fm.level = doc.level;
  if (doc.series) fm.series = doc.series;
  if (doc.status === 'archived') fm.archived = true;
  fm.sourceId = doc.id;
  fm.sourcePath = doc.sourcePath;
  fm.aiAssisted = true;
  return fm;
}

/** Merge overlay: existing site frontmatter wins except for explicit
 *  source fields and sync-owned bookkeeping. */
function mergeFrontmatter(existing, doc) {
  const fm = { ...existing };
  if (doc.explicit.title) fm.title = doc.title;
  if (doc.explicit.description) fm.description = doc.description;
  if (doc.explicit.tags) fm.tags = doc.tags;
  if (doc.explicit.level) fm.level = doc.level;
  if (doc.explicit.series && doc.series) fm.series = doc.series;
  fm.archived =
    doc.status === 'archived'
      ? true
      : existing.archived === true
        ? existing.archived
        : undefined;
  if (fm.archived === undefined) delete fm.archived;
  fm.sourceId = doc.id;
  fm.sourcePath = doc.sourcePath;
  return fm;
}

function splitExistingMdx(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('existing file has no frontmatter');
  return { frontmatter: parseYaml(match[1]) ?? {} };
}

/** Resolve and confine a target path to its collection directory. */
function safeTarget(root, doc) {
  const collectionDir = resolve(root, SYNC_COLLECTIONS[doc.collection].dir);
  const target = resolve(root, targetPathFor(doc));
  if (!target.startsWith(collectionDir + sep)) {
    throw new Error(`refusing to write outside ${collectionDir}: ${target}`);
  }
  return target;
}

/**
 * Apply a plan to the repo at `root`. Returns a log of actions.
 * Never deletes files; archives only flip `archived: true` and only when
 * `applyArchives` is set.
 */
export async function applyPlan(
  plan,
  manifest,
  { root, dryRun = false, applyArchives = false },
) {
  const actions = [];

  for (const doc of plan.creates) {
    const target = safeTarget(root, doc);
    let existing = null;
    try {
      existing = await readFile(target, 'utf8');
    } catch {
      /* new file — expected */
    }
    if (existing !== null) {
      const { frontmatter } = splitExistingMdx(existing);
      if (frontmatter.sourceId && frontmatter.sourceId !== doc.id) {
        throw new Error(
          `collision: ${targetPathFor(doc)} belongs to sourceId "${frontmatter.sourceId}", refusing to overwrite with "${doc.id}"`,
        );
      }
      if (!frontmatter.sourceId) {
        throw new Error(
          `collision: ${targetPathFor(doc)} exists but is not sync-tracked — refusing to overwrite a manual file`,
        );
      }
    }
    if (!dryRun) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, renderMdx(createFrontmatter(doc), doc.body));
    }
    actions.push({ action: 'create', id: doc.id, path: targetPathFor(doc) });
  }

  for (const doc of [...plan.updates, ...plan.moves]) {
    const target = safeTarget(root, doc);
    const raw = await readFile(target, 'utf8');
    const { frontmatter } = splitExistingMdx(raw);
    if (frontmatter.sourceId && frontmatter.sourceId !== doc.id) {
      throw new Error(
        `collision: ${targetPathFor(doc)} belongs to sourceId "${frontmatter.sourceId}", refusing update for "${doc.id}"`,
      );
    }
    const merged = mergeFrontmatter(frontmatter, doc);
    const bodyChanged = plan.updates.includes(doc);
    if (bodyChanged) merged.dateUpdated = today();
    if (!dryRun) await writeFile(target, renderMdx(merged, doc.body));
    actions.push({
      action: bodyChanged ? 'update' : 'move',
      id: doc.id,
      path: targetPathFor(doc),
    });
  }

  if (applyArchives) {
    for (const { id, entry } of plan.proposedArchives) {
      const target = resolve(root, entry.targetPath);
      const raw = await readFile(target, 'utf8');
      const { frontmatter } = splitExistingMdx(raw);
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
      frontmatter.archived = true;
      if (!dryRun) await writeFile(target, renderMdx(frontmatter, body));
      actions.push({ action: 'archive', id, path: entry.targetPath });
    }
  }

  return actions;
}

export async function readManifest(root) {
  try {
    return JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeManifest(root, manifest, { dryRun = false } = {}) {
  if (dryRun) return;
  await writeFile(
    join(root, MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
