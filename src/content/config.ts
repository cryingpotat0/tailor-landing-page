import { defineCollection, z } from 'astro:content';

const feature = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = {
  feature,
};
