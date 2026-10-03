import { describe, expect, test } from 'vitest';
import { postSchema } from '../src/schemas/post';

const base = {
  title: 'Understanding API Like a Pro',
  description: 'REST principles, auth strategies and patterns for robust integrations.',
  pubDate: '2024-06-01',
  tags: ['APIs', 'Architecture'],
};

describe('post schema', () => {
  test('accepts a native post', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
  });

  test('coerces pubDate to a Date', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pubDate).toBeInstanceOf(Date);
  });

  test('defaults draft to false', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.draft).toBe(false);
  });

  test('accepts an external post with platform and url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', platform: 'Dev.to',
      url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo',
    });
    expect(r.success).toBe(true);
  });

  test('rejects an external post missing its url', () => {
    const r = postSchema.safeParse({ ...base, kind: 'external', platform: 'Dev.to' });
    expect(r.success).toBe(false);
  });

  test('rejects an external post missing its platform', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', url: 'https://dev.to/x',
    });
    expect(r.success).toBe(false);
  });

  test('rejects a non-http external url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', platform: 'Dev.to', url: 'javascript:alert(1)',
    });
    expect(r.success).toBe(false);
  });

  test('rejects a native post that carries a url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'native', url: 'https://example.com',
    });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown kind', () => {
    const r = postSchema.safeParse({ ...base, kind: 'syndicated' });
    expect(r.success).toBe(false);
  });

  test('rejects an empty tag list', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', tags: [] });
    expect(r.success).toBe(false);
  });

  test('rejects an unrecognised frontmatter key', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', publishedOn: '2024-01-01' });
    expect(r.success).toBe(false);
  });

  test('rejects a blank description', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', description: '   ' });
    expect(r.success).toBe(false);
  });
});
