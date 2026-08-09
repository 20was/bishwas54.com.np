/**
 * One-way content sync: 20was/self-learn-docs → this repo.
 *
 * Deterministic and mechanical by design — no AI anywhere. Scans the
 * whole lab repo for notes whose frontmatter says `publish: true`
 * (folder location never decides publication), validates them against
 * the contract, and creates/updates the matching MDX under the
 * sync-owned collections. Identity is the stable `id`; moves and
 * renames in the lab do not duplicate articles or change URLs.
 *
 * Usage:
 *   node scripts/sync-content.mjs [--lab <path>] [--dry-run]
 *     [--validate-only] [--apply-archives] [--source-commit <sha>]
 *
 * Safe by default: never deletes, never overwrites manual files,
 * archive proposals require --apply-archives.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';

import { normalizeDoc } from './sync/contract.mjs';
import { emptyManifest, nextManifest, planSync } from './sync/core.mjs';
import { applyPlan, readManifest, writeManifest } from './sync/apply.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const LAB = opt('--lab') ?? '/Users/bishwas/Desktop/Self-Learn-Docs';
const ROOT = new URL('..', import.meta.url).pathname;
const DRY = flag('--dry-run') || flag('--validate-only');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

const docs = [];
const errors = [];
const warnings = [];
const skipped = [];

for await (const file of walk(LAB)) {
  const sourcePath = relative(LAB, file);
  const raw = await readFile(file, 'utf8');
  const result = normalizeDoc(raw, sourcePath);
  if (result.publishable) {
    docs.push(result.doc);
    warnings.push(...(result.warnings ?? []));
  } else if (result.errors) {
    errors.push(...result.errors);
  } else {
    skipped.push({ sourcePath, reason: result.reason });
  }
}

const manifest = (await readManifest(ROOT)) ?? emptyManifest();
const plan = planSync(docs, manifest);
errors.push(...plan.errors);

console.log('Content sync preview\n');
const list = (label, items, fmt) => {
  if (items.length === 0) return;
  console.log(`${label}:`);
  for (const item of items) console.log(`  - ${fmt(item)}`);
  console.log('');
};
list(
  'Added',
  plan.creates,
  (d) => `${d.id} (${d.sourcePath} → ${d.collection}/${d.slug}/)`,
);
list('Updated', plan.updates, (d) => d.id);
list(
  'Moved (metadata only)',
  plan.moves,
  (d) =>
    `${d.id}\n    ${manifest.documents[d.id].sourcePath}\n    → ${d.sourcePath}`,
);
list(
  'Proposed archive (no action without --apply-archives)',
  plan.proposedArchives,
  (a) => `${a.id} (${a.entry.sourcePath} no longer publishable)`,
);
list('Warnings', warnings, (w) => w);
list('Errors', errors, (e) => e);
console.log(
  `Unchanged: ${plan.unchanged.length} · Private/skipped: ${skipped.length} · Source docs published: ${docs.length}`,
);

if (errors.length > 0) {
  console.error('\nValidation failed — nothing written.');
  process.exit(1);
}

if (flag('--validate-only')) {
  console.log('\nValidation passed. No files were written.');
  process.exit(0);
}

const changes =
  plan.creates.length +
  plan.updates.length +
  plan.moves.length +
  (flag('--apply-archives') ? plan.proposedArchives.length : 0);

if (changes === 0) {
  console.log('\nNo publishable changes. Nothing written.');
  process.exit(0);
}

const actions = await applyPlan(plan, manifest, {
  root: ROOT,
  dryRun: DRY,
  applyArchives: flag('--apply-archives'),
});
const updated = nextManifest(manifest, plan, {
  sourceCommit: opt('--source-commit') ?? null,
  applyArchives: flag('--apply-archives'),
});
await writeManifest(ROOT, updated, { dryRun: DRY });

console.log('');
for (const a of actions) console.log(`${a.action}: ${a.path}`);
console.log(
  DRY
    ? '\nDry run — no files were written, no branch or PR created.'
    : `\nSync done — ${actions.length} file(s) written, manifest updated.`,
);
