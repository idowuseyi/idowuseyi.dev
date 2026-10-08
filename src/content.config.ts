import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './schemas/project';
import { postSchema } from './schemas/post';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: projectSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: postSchema,
});

export const collections = { projects, posts };
