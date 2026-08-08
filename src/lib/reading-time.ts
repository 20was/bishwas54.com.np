const WORDS_PER_MINUTE = 215;

/**
 * Estimated reading time in whole minutes (minimum 1) from raw
 * Markdown/MDX source. Code blocks are skimmed rather than read,
 * so they count at a quarter weight.
 */
export function readingMinutes(source: string): number {
  const codeBlocks = source.match(/```[\s\S]*?```/g) ?? [];
  const codeWords = codeBlocks.join(' ').split(/\s+/).filter(Boolean).length;

  const prose = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^---[\s\S]*?---/, ' ') // frontmatter
    .replace(/<[^>]+>/g, ' ') // JSX/HTML tags
    .replace(/[#*_>`[\]()!-]/g, ' '); // markdown punctuation
  const proseWords = prose.split(/\s+/).filter(Boolean).length;

  const effectiveWords = proseWords + codeWords / 4;
  return Math.max(1, Math.round(effectiveWords / WORDS_PER_MINUTE));
}
