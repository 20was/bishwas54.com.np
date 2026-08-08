/**
 * Build-time Open Graph images: one 1200×630 PNG per post plus a site
 * default, rendered from an SVG template via sharp (already an Astro
 * dependency). Output lands in public/og/ (gitignored).
 */
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public', 'og');

const COLORS = {
  bg: '#faf9f5',
  ink: '#211f1a',
  soft: '#675f4f',
  accent: '#1e5d55',
  line: '#e3e0d6',
};

function escapeXml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Greedy word wrap tuned for ~56px serif on a 1040px column. */
function wrap(text, maxChars = 32, maxLines = 4) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] += '…';
  }
  return lines;
}

function template({ title, kicker }) {
  const lines = wrap(title);
  const fontSize = lines.length > 3 ? 52 : 60;
  const lineHeight = fontSize * 1.25;
  const startY = 300 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="80" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <rect x="0" y="0" width="12" height="630" fill="${COLORS.accent}"/>
  <text font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="${COLORS.accent}" x="80" y="120">${escapeXml(kicker.toUpperCase())}</text>
  <text font-family="Georgia, serif" font-weight="bold" font-size="${fontSize}" fill="${COLORS.ink}" text-anchor="start">${tspans}</text>
  <line x1="80" y1="520" x2="1120" y2="520" stroke="${COLORS.line}" stroke-width="2"/>
  <text font-family="Georgia, serif" font-size="30" fill="${COLORS.soft}" x="80" y="570">bishwas54.com.np — Bishwas Adhikari</text>
</svg>`;
}

async function renderTo(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function collect(collection, kicker) {
  const dir = join(ROOT, 'src', 'content', collection);
  const outDir = join(OUT, collection);
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mdx'));
  for (const file of files) {
    const source = await readFile(join(dir, file), 'utf8');
    const title =
      source.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ??
      file.replace('.mdx', '');
    const slug = file.replace('.mdx', '');
    await renderTo(join(outDir, `${slug}.png`), template({ title, kicker }));
  }
  return files.length;
}

await mkdir(OUT, { recursive: true });
await renderTo(
  join(OUT, 'default.png'),
  template({
    title: 'I learn things and write them down so you can learn them too.',
    kicker: 'Notes & tutorials',
  }),
);
const tutorials = await collect('tutorials', 'Tutorial');
const notes = await collect('notes', 'Note');
console.log(`OG images: default + ${tutorials} tutorials + ${notes} notes`);
