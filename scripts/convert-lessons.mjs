/**
 * Mechanical lesson sync: study-lab markdown → site MDX, verbatim.
 *
 * For every non-empty lesson note in the lab, ensure a matching tutorial
 * MDX exists on the site whose body is the note byte-for-byte (minus the
 * h1, which becomes the frontmatter title). Existing frontmatter and the
 * "## Check what stuck" quiz section are preserved on update; a body
 * change stamps dateUpdated. New lessons are created without a quiz —
 * a separate step (Claude) appends one.
 *
 * No AI here. Deterministic by design so it can run unattended.
 *
 * Usage: node scripts/convert-lessons.mjs [--lab <path>] [--dry-run]
 */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const labFlag = args.indexOf('--lab');
const LAB =
  labFlag !== -1
    ? args[labFlag + 1]
    : '/Users/bishwas/Desktop/Self-Learn-Docs/networking-lab';
const DRY = args.includes('--dry-run');

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'src', 'content', 'tutorials');

/** Lab section folder → series name. Extend as new sections begin. */
const SECTIONS = {
  '01-foundations': 'DevOps Networking',
  '02-aws': 'DevOps Networking — AWS',
  '03-docker': 'DevOps Networking — Docker',
  '04-kubernetes': 'DevOps Networking — Kubernetes',
  '05-proxies': 'DevOps Networking — Proxies',
  '06-traffic-flow': 'DevOps Networking — Traffic Flow',
};

/** Published URLs are permanent; map any lab file whose derived slug
 *  must differ from its filename. */
const SLUG_OVERRIDES = {
  '01-foundations/01-what-networking-is-and-ip-addresses.md':
    'networking-and-ip-addresses',
};

const today = () => new Date().toISOString().slice(0, 10);

function esc(value) {
  return value.replaceAll("'", "''");
}

/** First sentence of the first prose paragraph — mechanical description. */
function firstSentence(body) {
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

function splitExisting(mdx) {
  const fmMatch = mdx.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;
  const rest = mdx.slice(fmMatch[0].length);
  const quizIndex = rest.indexOf('## Check what stuck');
  const beforeQuiz = quizIndex === -1 ? rest : rest.slice(0, quizIndex);
  const quiz = quizIndex === -1 ? '' : rest.slice(quizIndex);
  const body = beforeQuiz.replace(/^import .*$/gm, '').trim();
  return { frontmatter: fmMatch[1], body, quiz: quiz.trim() };
}

function getFm(frontmatter, key) {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim();
}

const IMPORTS = `import Quiz from '../../components/Quiz.astro';
import QuizQuestion from '../../components/QuizQuestion.astro';`;

let created = 0;
let updated = 0;
let unchanged = 0;
let skippedEmpty = 0;

const sections = (await readdir(LAB, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const section of sections) {
  const series = SECTIONS[section];
  if (!series) {
    console.log(`skip ${section}: no series mapping — add it to SECTIONS`);
    continue;
  }
  const dir = join(LAB, section);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();

  for (const file of files) {
    const full = join(dir, file);
    if ((await stat(full)).size === 0) {
      skippedEmpty += 1;
      continue;
    }

    const source = await readFile(full, 'utf8');
    const lines = source.split('\n');
    const h1Index = lines.findIndex((l) => l.startsWith('# '));
    const title = h1Index === -1 ? file : lines[h1Index].replace(/^# /, '');
    const body = lines
      .filter((_, i) => i !== h1Index)
      .join('\n')
      .trim();

    const order = Number(file.match(/^(\d+)-/)?.[1] ?? 0);
    const sourcePath = `${section}/${file}`;
    const slug =
      SLUG_OVERRIDES[sourcePath] ?? basename(file, '.md').replace(/^\d+-/, '');
    const outFile = join(OUT_DIR, `${slug}.mdx`);

    const existing = await readFile(outFile, 'utf8').catch(() => null);

    if (existing) {
      const parts = splitExisting(existing);
      const existingSource = parts
        ? getFm(parts.frontmatter, 'sourcePath')
        : null;
      if (
        existingSource &&
        existingSource.replace(/^'|'$/g, '') !== sourcePath
      ) {
        console.error(
          `COLLISION: ${slug}.mdx belongs to ${existingSource}, refusing to overwrite with ${sourcePath}`,
        );
        process.exitCode = 1;
        continue;
      }
      if (parts && parts.body === body) {
        unchanged += 1;
        continue;
      }
      // Body changed: keep frontmatter + quiz, refresh body, stamp dateUpdated
      let fm = parts.frontmatter;
      if (/^dateUpdated:/m.test(fm)) {
        fm = fm.replace(/^dateUpdated:.*$/m, `dateUpdated: ${today()}`);
      } else {
        fm = fm.replace(/^(datePublished:.*)$/m, `$1\ndateUpdated: ${today()}`);
      }
      if (!/^sourcePath:/m.test(fm)) fm += `\nsourcePath: '${esc(sourcePath)}'`;
      const next = `---\n${fm}\n---\n\n${IMPORTS}\n\n${body}\n${
        parts.quiz ? `\n${parts.quiz}\n` : ''
      }`;
      if (!DRY) await writeFile(outFile, next);
      console.log(`updated: ${slug}.mdx`);
      updated += 1;
      continue;
    }

    // New lesson — no quiz yet; Claude step appends it.
    const description = firstSentence(body) || title;
    const fm = `title: '${esc(title)}'
description: '${esc(description)}'
datePublished: ${today()}
tags: ['networking', 'basics', 'devops']
level: beginner
series:
  name: '${esc(series)}'
  order: ${order}
sourcePath: '${esc(sourcePath)}'
aiAssisted: true`;
    const next = `---\n${fm}\n---\n\n${IMPORTS}\n\n${body}\n`;
    if (!DRY) {
      await mkdir(OUT_DIR, { recursive: true });
      await writeFile(outFile, next);
    }
    console.log(`created: ${slug}.mdx (${series} · part ${order})`);
    created += 1;
  }
}

console.log(
  `sync done — created ${created}, updated ${updated}, unchanged ${unchanged}, empty-skipped ${skippedEmpty}`,
);
