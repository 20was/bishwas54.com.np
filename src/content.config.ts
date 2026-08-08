import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const common = {
  title: z.string().min(1),
  description: z.string().min(1),
  datePublished: z.coerce.date(),
  dateUpdated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  archived: z.boolean().default(false),
  aiAssisted: z.boolean().default(false),
};

const tutorials = defineCollection({
  loader: glob({ base: './src/content/tutorials', pattern: '**/*.mdx' }),
  schema: z.object({
    ...common,
    level: z.enum(['beginner', 'intermediate']).default('beginner'),
    series: z
      .object({ name: z.string(), order: z.number().int().positive() })
      .optional(),
  }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.mdx' }),
  schema: z.object(common),
});

export const collections = { tutorials, notes };
