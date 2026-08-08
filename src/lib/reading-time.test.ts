import { describe, expect, it } from 'vitest';
import { readingMinutes } from './reading-time';

describe('readingMinutes', () => {
  it('returns at least 1 minute for short text', () => {
    expect(readingMinutes('Hello world.')).toBe(1);
  });

  it('scales with word count', () => {
    const words = Array.from({ length: 430 }, (_, i) => `word${i}`).join(' ');
    expect(readingMinutes(words)).toBe(2);
  });

  it('weights code blocks at a quarter', () => {
    const code = '```js\n' + 'x '.repeat(860) + '\n```';
    // 860 code words / 4 = 215 effective words = 1 minute
    expect(readingMinutes(code)).toBe(1);
  });

  it('ignores frontmatter', () => {
    const doc =
      '---\ntitle: A very long title with many words here\n---\nShort body.';
    expect(readingMinutes(doc)).toBe(1);
  });

  it('strips JSX tags from the count', () => {
    expect(
      readingMinutes('<Callout type="note">A short aside.</Callout>'),
    ).toBe(1);
  });
});
