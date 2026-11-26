import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour, e.g. #D9483B');

/**
 * One JSON file per project in src/content/projects/.
 * `cover` should also be the first entry of `images` (it is the main image on the project page
 * and the texture used for the WebGL slice, so the hand-off between the two is seamless).
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    slug: z.string(),
    index: z.number().int().min(1),
    title: z.string(),
    titleMixedCase: z.string(),
    year: z.number().int(),
    completed: z.string(),
    type: z.string(),
    role: z.string(),
    client: z.string(),
    description: z.string(),
    color: hex,
    textColor: hex,
    cover: z.string(),
    images: z.array(z.string()).min(1),
    url: z.string().url().optional().or(z.literal('')),
  }),
});

export const collections = { projects };
