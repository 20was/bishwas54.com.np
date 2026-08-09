/**
 * Sync routing config: which blog collections the sync may write, how
 * content types map to collections, and per-track defaults.
 *
 * Publication is decided ONLY by source frontmatter (`publish: true`);
 * nothing here makes a folder publishable. Folder-derived values below
 * are metadata defaults that source frontmatter can always override.
 */

/** Collections the sync owns. Anything not listed is manually maintained
 *  and the sync must refuse to write there. */
export const SYNC_COLLECTIONS = {
  tutorials: { dir: 'src/content/tutorials' },
};

/** Default collection per content type. A type without an entry (or a
 *  collection not in SYNC_COLLECTIONS) fails validation with a clear
 *  message instead of being silently ignored. */
export const TYPE_TO_COLLECTION = {
  tutorial: 'tutorials',
};

export const CONTENT_TYPES = [
  'tutorial',
  'article',
  'project',
  'note',
  'practice-note',
  'experiment',
  'reference',
  'case-study',
];

export const STATUSES = ['draft', 'published', 'archived', 'private'];

/** Statuses that produce a public page (archived pages stay up with a banner). */
export const PUBLIC_STATUSES = ['published', 'archived'];

/** Lab section folder → series metadata default. Source frontmatter
 *  `series`/`order` wins over this. Extend as new tracks begin. */
export const SERIES_BY_FOLDER = {
  '01-foundations': 'DevOps Networking',
  '02-aws': 'DevOps Networking — AWS',
  '03-docker': 'DevOps Networking — Docker',
  '04-kubernetes': 'DevOps Networking — Kubernetes',
  '05-proxies': 'DevOps Networking — Proxies',
  '06-traffic-flow': 'DevOps Networking — Traffic Flow',
};

export const DEFAULT_TAGS = ['networking', 'basics', 'devops'];

export const MANIFEST_PATH = 'src/content/sync-manifest.json';

export const MANIFEST_SCHEMA_VERSION = 2;
