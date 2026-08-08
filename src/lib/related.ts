interface Taggable {
  id: string;
  tags: string[];
}

/**
 * Posts related to `current`, ranked by shared-tag count (ties broken
 * alphabetically by id for build determinism). Posts with no shared
 * tags are excluded.
 */
export function relatedPosts<T extends Taggable>(
  current: Taggable,
  all: readonly T[],
  limit = 3,
): T[] {
  const currentTags = new Set(current.tags);
  return all
    .filter((post) => post.id !== current.id)
    .map((post) => ({
      post,
      shared: post.tags.filter((tag) => currentTags.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared || a.post.id.localeCompare(b.post.id))
    .slice(0, limit)
    .map(({ post }) => post);
}
