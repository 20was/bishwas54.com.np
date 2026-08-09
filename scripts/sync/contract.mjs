/**
 * Source content contract: parse and validate lab-note frontmatter into a
 * normalized document, or report exactly why a file is not publishable.
 *
 * Contract (documented in the lab repo's CLAUDE.md):
 *   id: net-foundations-07     required to publish; stable forever
 *   publish: true              required to publish; default false
 *   status: published          draft | published | archived | private
 *   type: tutorial             see CONTENT_TYPES; default tutorial
 *   collection: tutorials      default derived from type
 *   slug: routing              default: filename minus NN- prefix
 *   title / description / tags / level / series / order — optional
 *                              overrides for folder-derived defaults
 *
 * Everything below the frontmatter is the body, published verbatim
 * (minus the first h1, which becomes the title). No AI, no rewriting.
 */
import { basename, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  CONTENT_TYPES,
  DEFAULT_TAGS,
  PUBLIC_STATUSES,
  SERIES_BY_FOLDER,
  STATUSES,
  SYNC_COLLECTIONS,
  TYPE_TO_COLLECTION,
} from './config.mjs';

export const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const KNOWN_KEYS = new Set([
  'id',
  'publish',
  'status',
  'type',
  'collection',
  'slug',
  'title',
  'description',
  'tags',
  'level',
  'series',
  'order',
]);

/** Split raw file content into frontmatter data and body. */
export function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: null, body: raw };
  try {
    return {
      data: parseYaml(match[1]) ?? {},
      body: raw.slice(match[0].length),
    };
  } catch (error) {
    return {
      data: null,
      body: '',
      parseError: `invalid YAML frontmatter: ${error.message}`,
    };
  }
}

/** First `# h1` becomes the title; the rest is the verbatim body. */
export function extractTitle(body) {
  const lines = body.split('\n');
  const h1Index = lines.findIndex((line) => line.startsWith('# '));
  if (h1Index === -1) return { title: null, body: body.trim() };
  return {
    title: lines[h1Index].replace(/^# /, '').trim(),
    body: lines
      .filter((_, i) => i !== h1Index)
      .join('\n')
      .trim(),
  };
}

/** First sentence of the first prose paragraph — mechanical description fallback. */
export function firstSentence(body) {
  for (const block of body.split(/\n\s*\n/)) {
    const line = block.trim();
    if (
      !line ||
      line.startsWith('#') ||
      line.startsWith('>') ||
      line.startsWith('```') ||
      line.startsWith('|') ||
      line.startsWith('import ')
    )
      continue;
    const plain = line
      .replace(/[*_`[\]]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const sentence = plain.split(/(?<=[.!?])\s/)[0] ?? plain;
    if (sentence.length > 20) return sentence.slice(0, 300);
  }
  return '';
}

/**
 * Normalize one source file against the contract.
 * Returns { publishable: false, reason } for private/unmarked files, or
 * { publishable: true, doc } / { publishable: false, errors } otherwise.
 * sourcePath is the path relative to the lab repo root.
 */
export function normalizeDoc(raw, sourcePath) {
  const { data, body: rawBody, parseError } = splitFrontmatter(raw);
  if (parseError)
    return { publishable: false, errors: [`${sourcePath}: ${parseError}`] };
  if (!data || data.publish !== true) {
    return {
      publishable: false,
      reason: data ? 'publish is not true' : 'no frontmatter',
    };
  }

  const errors = [];
  const warnings = [];

  for (const key of Object.keys(data)) {
    if (!KNOWN_KEYS.has(key))
      warnings.push(`${sourcePath}: unknown frontmatter key "${key}"`);
  }

  const status = data.status ?? 'published';
  if (!STATUSES.includes(status)) {
    errors.push(
      `${sourcePath}: invalid status "${status}" (expected ${STATUSES.join('|')})`,
    );
  } else if (!PUBLIC_STATUSES.includes(status)) {
    return { publishable: false, reason: `status is ${status}` };
  }

  if (typeof data.id !== 'string' || !ID_RE.test(data.id)) {
    errors.push(`${sourcePath}: publish:true requires an id matching ${ID_RE}`);
  }

  const type = data.type ?? 'tutorial';
  if (!CONTENT_TYPES.includes(type)) {
    errors.push(
      `${sourcePath}: invalid type "${type}" (expected ${CONTENT_TYPES.join('|')})`,
    );
  }

  const collection = data.collection ?? TYPE_TO_COLLECTION[type];
  if (!collection) {
    errors.push(
      `${sourcePath}: type "${type}" has no default collection — set "collection:" explicitly or add the type to TYPE_TO_COLLECTION in scripts/sync/config.mjs`,
    );
  } else if (!SYNC_COLLECTIONS[collection]) {
    errors.push(
      `${sourcePath}: collection "${collection}" is not sync-enabled — add it to SYNC_COLLECTIONS in scripts/sync/config.mjs (manually maintained collections are refused on purpose)`,
    );
  }

  const file = basename(sourcePath).replace(/\.mdx?$/, '');
  const slug = data.slug ?? file.replace(/^\d+-/, '');
  if (!SLUG_RE.test(slug)) {
    errors.push(
      `${sourcePath}: slug "${slug}" must match ${SLUG_RE} (set "slug:" explicitly)`,
    );
  }

  const { title: h1Title, body } = extractTitle(rawBody);
  const title = data.title ?? h1Title;
  if (!title)
    errors.push(`${sourcePath}: no title — add an "# h1" or a "title:" field`);
  if (!body) errors.push(`${sourcePath}: body is empty`);

  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) || data.tags.some((t) => typeof t !== 'string'))
  ) {
    errors.push(`${sourcePath}: tags must be a list of strings`);
  }

  if (errors.length > 0) return { publishable: false, errors };

  const sectionFolder = basename(dirname(sourcePath));
  const seriesName = data.series ?? SERIES_BY_FOLDER[sectionFolder];
  const order = data.order ?? Number(file.match(/^(\d+)-/)?.[1] ?? 0);

  return {
    publishable: true,
    warnings,
    doc: {
      /** Which optional fields the author set explicitly in source
       *  frontmatter. Explicit values override site-side curation on
       *  update; derived defaults never do. */
      explicit: {
        title: data.title !== undefined,
        description: data.description !== undefined,
        tags: data.tags !== undefined,
        level: data.level !== undefined,
        series: data.series !== undefined || data.order !== undefined,
      },
      id: data.id,
      status,
      type,
      collection,
      slug,
      title,
      description: data.description ?? firstSentence(body) ?? title,
      tags: data.tags ?? DEFAULT_TAGS,
      level: data.level,
      series: seriesName && order > 0 ? { name: seriesName, order } : undefined,
      sourcePath,
      body,
    },
  };
}
