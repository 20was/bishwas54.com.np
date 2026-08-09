/**
 * Pure planning logic: given normalized source docs and the previous
 * manifest, compute what the sync would do. No filesystem access here —
 * this is the part the tests hammer.
 *
 * Identity key is `id` (stable content ID). Source path is metadata:
 * a moved file with the same id is the same document. Slugs are frozen:
 * changing a published slug is an error until an explicit URL-migration
 * flow exists, because published URLs are permanent.
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { MANIFEST_SCHEMA_VERSION, SYNC_COLLECTIONS } from './config.mjs';

export function hashBody(body) {
  return `sha256:${createHash('sha256').update(body, 'utf8').digest('hex')}`;
}

export function emptyManifest() {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    sourceRepository: '20was/self-learn-docs',
    sourceCommit: null,
    documents: {},
  };
}

export function targetPathFor(doc) {
  return join(SYNC_COLLECTIONS[doc.collection].dir, `${doc.slug}.mdx`);
}

/**
 * @returns {{
 *   creates: doc[], updates: doc[], moves: doc[], unchanged: doc[],
 *   proposedArchives: {id, entry}[], errors: string[]
 * }}
 */
export function planSync(docs, manifest) {
  const errors = [];
  const creates = [];
  const updates = [];
  const moves = [];
  const unchanged = [];

  const byId = new Map();
  const bySlug = new Map();
  for (const doc of docs) {
    if (byId.has(doc.id)) {
      errors.push(
        `duplicate id "${doc.id}" in ${byId.get(doc.id).sourcePath} and ${doc.sourcePath}`,
      );
      continue;
    }
    byId.set(doc.id, doc);
    const slugKey = `${doc.collection}/${doc.slug}`;
    if (bySlug.has(slugKey)) {
      errors.push(
        `duplicate slug "${slugKey}" in ${bySlug.get(slugKey).sourcePath} and ${doc.sourcePath}`,
      );
      continue;
    }
    bySlug.set(slugKey, doc);
  }

  // Slugs already claimed in the manifest by a *different* id are taken:
  // published URLs are permanent.
  for (const doc of byId.values()) {
    const owner = Object.entries(manifest.documents).find(
      ([id, entry]) =>
        entry.slug === doc.slug &&
        entry.collection === doc.collection &&
        id !== doc.id,
    );
    if (owner) {
      errors.push(
        `slug "${doc.slug}" (${doc.sourcePath}) already belongs to published id "${owner[0]}" — pick a different slug`,
      );
    }
  }

  if (errors.length > 0) {
    return { creates, updates, moves, unchanged, proposedArchives: [], errors };
  }

  for (const doc of byId.values()) {
    const entry = manifest.documents[doc.id];
    const bodyHash = hashBody(doc.body);

    if (!entry) {
      creates.push({ ...doc, bodyHash });
      continue;
    }

    if (entry.slug !== doc.slug || entry.collection !== doc.collection) {
      errors.push(
        `id "${doc.id}": slug/collection change (${entry.collection}/${entry.slug} → ${doc.collection}/${doc.slug}) is frozen — published URLs are permanent. Revert it, or do an explicit URL migration (redirect + manifest edit) as a separate reviewed change.`,
      );
      continue;
    }

    const moved = entry.sourcePath !== doc.sourcePath;
    const bodyChanged = entry.bodyHash !== bodyHash;
    const statusChanged = entry.status !== doc.status;

    if (bodyChanged || statusChanged) {
      updates.push({ ...doc, bodyHash, moved });
    } else if (moved) {
      moves.push({ ...doc, bodyHash });
    } else {
      unchanged.push({ ...doc, bodyHash });
    }
  }

  const proposedArchives = Object.entries(manifest.documents)
    .filter(([id, entry]) => !byId.has(id) && entry.status !== 'archived')
    .map(([id, entry]) => ({ id, entry }));

  return { creates, updates, moves, unchanged, proposedArchives, errors };
}

/** Next manifest after a plan is applied (archives only when applyArchives). */
export function nextManifest(
  manifest,
  plan,
  { sourceCommit, applyArchives = false } = {},
) {
  const documents = { ...manifest.documents };
  for (const doc of [
    ...plan.creates,
    ...plan.updates,
    ...plan.moves,
    ...plan.unchanged,
  ]) {
    documents[doc.id] = {
      sourcePath: doc.sourcePath,
      targetPath: targetPathFor(doc),
      collection: doc.collection,
      slug: doc.slug,
      bodyHash: doc.bodyHash,
      status: doc.status,
    };
  }
  if (applyArchives) {
    for (const { id } of plan.proposedArchives) {
      documents[id] = { ...documents[id], status: 'archived' };
    }
  }
  return {
    ...manifest,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    sourceCommit: sourceCommit ?? manifest.sourceCommit,
    documents: Object.fromEntries(
      Object.entries(documents).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}
