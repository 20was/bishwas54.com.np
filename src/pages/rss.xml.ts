import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

/** Feed body: the post's verbatim markdown with MDX imports and the
 *  interactive quiz section stripped, rendered to plain HTML. */
function feedHtml(body: string | undefined): string {
  if (!body) return '';
  const markdown = body
    .replace(/^import .*$/gm, '')
    .split('## Check what stuck')[0]!
    .trim();
  return md.render(markdown);
}

export const GET: APIRoute = async (context) => {
  const tutorials = await getCollection(
    'tutorials',
    ({ data }) => !data.draft || import.meta.env.DEV,
  );
  const notes = await getCollection(
    'notes',
    ({ data }) => !data.draft || import.meta.env.DEV,
  );

  const items = [
    ...tutorials.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.datePublished,
      link: `/tutorials/${entry.id}/`,
      categories: entry.data.tags,
      content: feedHtml(entry.body),
    })),
    ...notes.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.datePublished,
      link: `/notes/${entry.id}/`,
      categories: entry.data.tags,
      content: feedHtml(entry.body),
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Bishwas Adhikari',
    description:
      'Beginner-friendly notes and tutorials. I learn things and write them down so you can learn them too.',
    site: context.site!,
    items,
    customData: '<language>en</language>',
  });
};
