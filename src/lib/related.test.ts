import { describe, expect, it } from 'vitest';
import { relatedPosts } from './related';

const posts = [
  { id: 'git-basics', tags: ['git', 'basics'] },
  { id: 'git-branches', tags: ['git'] },
  { id: 'docker-intro', tags: ['docker'] },
  { id: 'git-and-docker', tags: ['git', 'docker', 'basics'] },
];

describe('relatedPosts', () => {
  it('excludes the current post itself', () => {
    const result = relatedPosts(posts[0]!, posts);
    expect(result.map((p) => p.id)).not.toContain('git-basics');
  });

  it('ranks by shared-tag count', () => {
    const result = relatedPosts(posts[0]!, posts);
    expect(result[0]!.id).toBe('git-and-docker'); // shares git + basics
    expect(result[1]!.id).toBe('git-branches'); // shares git
  });

  it('excludes posts with no shared tags', () => {
    const result = relatedPosts(posts[1]!, posts);
    expect(result.map((p) => p.id)).not.toContain('docker-intro');
  });

  it('respects the limit', () => {
    expect(relatedPosts(posts[3]!, posts, 1)).toHaveLength(1);
  });

  it('returns empty for a post with no tags', () => {
    expect(relatedPosts({ id: 'x', tags: [] }, posts)).toEqual([]);
  });
});
