import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import yaml from 'js-yaml';
import { beforeAll, describe, expect, test } from 'vitest';
import Index from '../src/pages/index.astro';
import { projectSchema } from '../src/schemas/project';

let html = '';

const projectsDir = path.resolve(__dirname, '../src/content/projects');

// `getCollection('projects')` returns an empty array under Vitest — Task 5
// established that the content layer's data store isn't populated in this
// environment (see tests/case-study.test.ts). Reading the .mdx files from
// disk and validating their frontmatter directly against `projectSchema`
// (the same schema the real content loader uses) is unit-testable, as
// tests/project-schema.test.ts already proves, and actually pins both "three
// case studies" and "every one satisfies the evidence rule" instead of
// vacuously passing over an empty collection.
function readProjectFrontmatter(filename: string): unknown {
  const raw = readFileSync(path.join(projectsDir, filename), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${filename} has no frontmatter block.`);
  return yaml.load(match[1]);
}

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Index);
});

describe('homepage', () => {
  test('presents sections in the spec order', () => {
    const order = ['hero', 'work', 'cta-break', 'experience', 'contact'];
    const positions = order.map((id) => html.indexOf(`id="${id}"`));
    expect(positions.every((p) => p !== -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  test('repeats the CTA at all three placements', () => {
    for (const placement of ['hero', 'break', 'contact']) {
      expect(html).toContain(`data-placement="${placement}"`);
    }
  });

  test('features exactly three case studies', () => {
    const files = readdirSync(projectsDir).filter((f) => f.endsWith('.mdx'));
    expect(files).toHaveLength(3);
  });

  test('every project satisfies the evidence rule', () => {
    const files = readdirSync(projectsDir).filter((f) => f.endsWith('.mdx'));
    for (const file of files) {
      const frontmatter = readProjectFrontmatter(file);
      const result = projectSchema.safeParse(frontmatter);
      expect(result.success, `${file}: ${!result.success ? JSON.stringify(result.error.issues) : ''}`).toBe(true);
    }
  });

  test('ships no hero video', () => {
    expect(html).not.toContain('.mp4');
  });
});
