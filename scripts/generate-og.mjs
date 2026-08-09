/**
 * Build-time Open Graph images: one 1200×630 PNG per post plus a site
 * default. Satori lays out real Literata (embedded as glyph paths in
 * SVG), sharp rasterizes to PNG. Output: public/og/ (gitignored).
 */
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import satori from 'satori';
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

const fonts = [
  {
    name: 'Literata',
    data: await readFile(join(ROOT, 'scripts', 'fonts', 'literata-400.ttf')),
    weight: 400,
    style: 'normal',
  },
  {
    name: 'Literata',
    data: await readFile(join(ROOT, 'scripts', 'fonts', 'literata-700.ttf')),
    weight: 700,
    style: 'normal',
  },
];

function template({ title, kicker }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: COLORS.bg,
        borderLeft: `14px solid ${COLORS.accent}`,
        padding: '70px 80px',
        fontFamily: 'Literata',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: '26px',
              letterSpacing: '5px',
              color: COLORS.accent,
              textTransform: 'uppercase',
            },
            children: kicker,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: title.length > 70 ? '52px' : '60px',
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.25,
              maxWidth: '1020px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              borderTop: `2px solid ${COLORS.line}`,
              paddingTop: '28px',
              fontSize: '30px',
              color: COLORS.soft,
            },
            children: 'bishwas54.com.np — Bishwas Adhikari',
          },
        },
      ],
    },
  };
}

async function renderTo(file, { title, kicker }) {
  const svg = await satori(template({ title, kicker }), {
    width: 1200,
    height: 630,
    fonts,
  });
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function collect(collection, kicker) {
  const dir = join(ROOT, 'src', 'content', collection);
  const outDir = join(OUT, collection);
  // Series lessons nest one level (<series>/<slug>.mdx) — walk recursively.
  const files = (
    await readdir(dir, { recursive: true }).catch(() => [])
  ).filter((f) => f.endsWith('.mdx'));
  for (const file of files) {
    const source = await readFile(join(dir, file), 'utf8');
    const id = file.replace('.mdx', '');
    const title = source.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? id;
    await mkdir(dirname(join(outDir, file)), { recursive: true });
    await renderTo(join(outDir, `${id}.png`), { title, kicker });
  }
  return files.length;
}

await mkdir(OUT, { recursive: true });
await renderTo(join(OUT, 'default.png'), {
  title: 'I learn things and write them down so you can learn them too.',
  kicker: 'Notes & tutorials',
});
const tutorials = await collect('tutorials', 'Tutorial');
const notes = await collect('notes', 'Note');
console.log(`OG images: default + ${tutorials} tutorials + ${notes} notes`);
