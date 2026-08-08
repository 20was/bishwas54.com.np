/**
 * Notify IndexNow (Bing & friends) about the site's URLs after a deploy.
 * ChatGPT search retrieves largely from Bing's index, so this matters.
 * The key is public by design — it only proves domain ownership via the
 * key file served at the site root.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOST = 'bishwas54.com.np';
const KEY = '4d455ae34a5d4847a68cf2383574013f';
const ROOT = new URL('..', import.meta.url).pathname;

const sitemap = await readFile(
  join(ROOT, 'dist', 'sitemap-0.xml'),
  'utf8',
).catch(() => {
  console.error('No dist/sitemap-0.xml — run the build first.');
  process.exit(1);
});

const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error('Sitemap contained no URLs; nothing to submit.');
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});

console.log(`IndexNow: submitted ${urls.length} URLs — HTTP ${res.status}`);
if (!res.ok && res.status !== 202) process.exit(1);
