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
  return join(SYNC_COLLECTIONS[doc.collection].dir, `${doc.route}.mdx`);
}

/** Series lessons must be publishable as an unbroken 1..n run — a reader
 *  following a series must never hit a missing part. */
export function checkSeriesContiguity(docs) {
  const errors = [];
  const bySeries = new Map();
  for (const doc of docs) {
    if (!doc.series) continue;
    const key = `${doc.collection}/${doc.series.name}`;
    bySeries.set(key, [...(bySeries.get(key) ?? []), doc]);
  }
  for (const [key, members] of bySeries) {
    const orders = members.map((d) => d.series.order).sort((a, b) => a - b);
    const expected = Array.from({ length: orders.length }, (_, i) => i + 1);
    if (orders.join() !== expected.join()) {
      const missing = expected.filter((n) => !orders.includes(n));
      const dupes = orders.filter((n, i) => orders.indexOf(n) !== i);
      errors.push(
        `series "${key}": published orders [${orders.join(', ')}] must run 1..${orders.length} with no gaps` +
          (missing.length ? ` — missing part(s): ${missing.join(', ')}` : '') +
          (dupes.length ? ` — duplicate order(s): ${dupes.join(', ')}` : '') +
          '. Publish the missing lesson first, or fix the order fields.',
      );
    }
  }
  return errors;
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
  const byRoute = new Map();
  for (const doc of docs) {
    if (byId.has(doc.id)) {
      errors.push(
        `duplicate id "${doc.id}" in ${byId.get(doc.id).sourcePath} and ${doc.sourcePath}`,
      );
      continue;
    }
    byId.set(doc.id, doc);
    const routeKey = `${doc.collection}/${doc.route}`;
    if (byRoute.has(routeKey)) {
      errors.push(
        `duplicate route "${routeKey}" in ${byRoute.get(routeKey).sourcePath} and ${doc.sourcePath}`,
      );
      continue;
    }
    byRoute.set(routeKey, doc);
  }

  // Routes already claimed in the manifest by a *different* id are taken:
  // published URLs are permanent.
  for (const doc of byId.values()) {
    const owner = Object.entries(manifest.documents).find(
      ([id, entry]) =>
        (entry.route ?? entry.slug) === doc.route &&
        entry.collection === doc.collection &&
        id !== doc.id,
    );
    if (owner) {
      errors.push(
        `route "${doc.route}" (${doc.sourcePath}) already belongs to published id "${owner[0]}" — pick a different slug`,
      );
    }
  }

  // A standalone post's URL segment must not collide with a series landing
  // page (/tutorials/<x>/ can't be both), in either direction.
  const seriesSegments = new Set();
  const standaloneSegments = new Map();
  const claim = (collection, route, source) => {
    const [head, ...rest] = route.split('/');
    if (rest.length > 0) seriesSegments.add(`${collection}/${head}`);
    else standaloneSegments.set(`${collection}/${head}`, source);
  };
  for (const doc of byId.values())
    claim(doc.collection, doc.route, doc.sourcePath);
  for (const entry of Object.values(manifest.documents))
    claim(entry.collection, entry.route ?? entry.slug, entry.sourcePath);
  for (const seg of seriesSegments) {
    if (standaloneSegments.has(seg)) {
      errors.push(
        `"${seg}" is both a standalone post and a series landing page — rename the standalone slug or the series`,
      );
    }
  }

  errors.push(...checkSeriesContiguity([...byId.values()]));

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

    const entryRoute = entry.route ?? entry.slug;
    if (entryRoute !== doc.route || entry.collection !== doc.collection) {
      errors.push(
        `id "${doc.id}": route change (${entry.collection}/${entryRoute} → ${doc.collection}/${doc.route}) is frozen — published URLs are permanent. Revert it (slug AND series/order affect the route), or do an explicit URL migration (redirect + manifest edit) as a separate reviewed change.`,
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
      route: doc.route,
      ...(documents[doc.id]?.previousRoutes
        ? { previousRoutes: documents[doc.id].previousRoutes }
        : {}),
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
