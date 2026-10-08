import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import PostCard from '../src/components/PostCard.astro';
import TagList from '../src/components/TagList.astro';
import { tagSlug } from '../src/lib/tags';

function entry(data: Record<string, unknown>) {
  return {
    id: 'a-post',
    collection: 'posts' as const,
    data,
    body: 'body text',
    rendered: { html: '<p>body text</p>', metadata: {} },
    filePath: 'src/content/posts/a-post.mdx',
  } as never;
}

const nativeData = {
  kind: 'native',
  title: 'A Native Post',
  description: 'Written here.',
  pubDate: new Date('2026-10-01'),
  tags: ['AI Systems'],
  draft: false,
};

const externalData = {
  kind: 'external',
  title: 'An External Post',
  description: 'Published elsewhere.',
  pubDate: new Date('2024-05-01'),
  tags: ['APIs'],
  draft: false,
  platform: 'Dev.to',
  url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo',
};

describe('tagSlug', () => {
  test('lowercases and hyphenates', () => {
    expect(tagSlug('AI Systems')).toBe('ai-systems');
  });
  test('handles slashes', () => {
    expect(tagSlug('CI/CD')).toBe('ci-cd');
  });
  test('collapses repeated separators', () => {
    expect(tagSlug('AI  /  Systems')).toBe('ai-systems');
  });
});

describe('PostCard', () => {
  test('a native post links to its own page', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    expect(html).toContain('href="/writing/a-post/"');
    expect(html).toContain('A Native Post');
  });

  test('a native post shows no platform badge', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    expect(html).not.toContain('post-card__badge');
  });

  test('an external post links out to the publisher', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toContain('href="https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo"');
    expect(html).not.toContain('href="/writing/a-post/"');
  });

  test('an external post is badged with its platform', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toContain('Dev.to');
    expect(html).toMatch(/post-card__badge/);
  });

  test('an external link carries rel noopener', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toMatch(/rel="[^"]*noopener/);
  });

  test('a native post shows a reading time, an external one does not', async () => {
    const c = await AstroContainer.create();
    const nativeHtml = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    const externalHtml = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(nativeHtml).toContain('minute read');
    expect(externalHtml).not.toContain('minute read');
  });
});

describe('TagList', () => {
  test('renders a pill per tag, linked by default', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(TagList, { props: { tags: ['AI Systems', 'Zod'] } });
    expect(html).toContain('href="/writing/tags/ai-systems/"');
    expect(html).toContain('href="/writing/tags/zod/"');
  });

  test('renders plain text when linked is false', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(TagList, { props: { tags: ['Zod'], linked: false } });
    expect(html).toContain('Zod');
    expect(html).not.toContain('href="/writing/tags/zod/"');
  });
});
