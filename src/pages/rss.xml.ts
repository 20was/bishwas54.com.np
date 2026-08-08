import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async (context) => {
  const tutorials = await getCollection('tutorials', ({ data }) => !data.draft);
  const notes = await getCollection('notes', ({ data }) => !data.draft);

  const items = [
    ...tutorials.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.datePublished,
      link: `/tutorials/${entry.id}/`,
      categories: entry.data.tags,
    })),
    ...notes.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.datePublished,
      link: `/notes/${entry.id}/`,
      categories: entry.data.tags,
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
