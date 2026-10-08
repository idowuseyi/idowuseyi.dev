import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { load as loadYaml } from 'js-yaml';
import { beforeAll, describe, expect, test } from 'vitest';
import Index from '../src/pages/index.astro';
import { postSchema } from '../src/schemas/post';
import { projectSchema } from '../src/schemas/project';

let html = '';

const projectsDir = path.resolve(__dirname, '../src/content/projects');
const postsDir = path.resolve(__dirname, '../src/content/posts');

function frontmatterOf(dir: string, filename: string): Record<string, unknown> {
  const raw = readFileSync(path.join(dir, filename), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${filename} has no frontmatter block.`);
  return loadYaml(match[1]) as Record<string, unknown>;
}

// `getCollection('projects')` returns an empty array under Vitest — Task 5
// established that the content layer's data store isn't populated in this
// environment (see tests/case-study.test.ts). Reading the .mdx files from
// disk and validating their frontmatter directly against `projectSchema`
// (the same schema the real content loader uses) is unit-testable, as
// tests/project-schema.test.ts already proves, and actually pins both "three
// case studies" and "every one satisfies the evidence rule" instead of
// vacuously passing over an empty collection.
function readProjectFrontmatter(filename: string): unknown {
  return frontmatterOf(projectsDir, filename);
}

// Posts are read the same way and for the same reason — `getCollection('posts')`
// is empty here too, so the Writing section's selection rule is only
// observable against the built page.
function readPostFrontmatter(filename: string): { title: string; pubDate: Date; draft: boolean } {
  const data = frontmatterOf(postsDir, filename);
  const parsed = postSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${filename}: ${JSON.stringify(parsed.error.issues)}`);
  }
  return { title: parsed.data.title, pubDate: parsed.data.pubDate, draft: parsed.data.draft };
}

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Index);
});

describe('homepage', () => {
  test('presents sections in the spec order', () => {
    const order = ['hero', 'work', 'cta-break', 'experience', 'writing', 'contact'];
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
    expect(html).not.toContain('<video');
  });

  test('the built homepage actually renders the three case studies', () => {
    const distIndex = path.resolve(__dirname, '../dist/client/index.html');
    if (!existsSync(distIndex)) {
      // In CI the build runs before the tests, so an absent dist is a real
      // failure. Warning and returning here used to make this assertion pass
      // vacuously on every CI run, because `npm test` preceded `npm run build`.
      expect(
        process.env.CI,
        'dist/client/index.html missing — run `npm run build` first',
      ).toBeFalsy();
      return;
    }
    const builtHtml = readFileSync(distIndex, 'utf8');

    const caseOccurrences = builtHtml.match(/class="case reveal"/g) ?? [];
    expect(caseOccurrences.length).toBe(3);

    const files = readdirSync(projectsDir).filter((f) => f.endsWith('.mdx'));
    for (const file of files) {
      const frontmatter = readProjectFrontmatter(file) as { title: string };
      // Astro escapes `&` to `&amp;` when rendering text content, so compare
      // against the HTML-escaped form of the title rather than the raw
      // frontmatter string.
      const escapedTitle = frontmatter.title.replace(/&/g, '&amp;');
      expect(builtHtml).toContain(escapedTitle);
    }
  });

  test('presents the writing section between experience and contact', () => {
    const experience = html.indexOf('id="experience"');
    const writing = html.indexOf('id="writing"');
    const contact = html.indexOf('id="contact"');
    expect(writing).toBeGreaterThan(experience);
    expect(contact).toBeGreaterThan(writing);
  });

  test('links to the writing index', () => {
    expect(html).toContain('href="/writing/"');
  });

  test('advertises the feed', () => {
    expect(html).toContain('type="application/rss+xml"');
  });

  test('the built homepage actually renders the three most recent posts', () => {
    // The container render above cannot check this: `getCollection('posts')`
    // is empty under Vitest, so the section renders with no cards at all. Only
    // the built page shows which posts were selected, which is also the only
    // place the "three most recent, drafts excluded" rule is observable.
    const distIndex = path.resolve(__dirname, '../dist/client/index.html');
    if (!existsSync(distIndex)) {
      expect(
        process.env.CI,
        'dist/client/index.html missing — run `npm run build` first',
      ).toBeFalsy();
      return;
    }
    const builtHtml = readFileSync(distIndex, 'utf8');

    const cards = builtHtml.match(/class="post-card reveal"/g) ?? [];
    expect(cards.length).toBe(3);

    // Expected set comes from the post files on disk, not a hard-coded list,
    // so publishing a newer post that the section fails to pick up fails here.
    const posts = readdirSync(postsDir)
      .filter((f) => f.endsWith('.mdx'))
      .map((file) => readPostFrontmatter(file))
      .filter((p) => !p.draft)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    expect(posts.length).toBeGreaterThan(3);

    const escape = (title: string) => title.replace(/&/g, '&amp;');
    for (const post of posts.slice(0, 3)) {
      expect(builtHtml, `expected the homepage to feature "${post.title}"`).toContain(
        escape(post.title),
      );
    }
    for (const post of posts.slice(3)) {
      expect(builtHtml, `"${post.title}" is older than the newest three`).not.toContain(
        escape(post.title),
      );
    }
  });
});
