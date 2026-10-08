import { describe, expect, test } from 'vitest';
import { groupByTagSlug, tagSlug } from '../src/lib/tags';

function post(tags: string[]) {
  return { data: { tags } };
}

describe('tagSlug', () => {
  test('lowercases and hyphenates', () => {
    expect(tagSlug('AI Systems')).toBe('ai-systems');
  });

  test('collapses non-alphanumeric runs to a single hyphen', () => {
    expect(tagSlug('CI/CD')).toBe('ci-cd');
  });
});

describe('groupByTagSlug', () => {
  test('groups posts under their tag slug', () => {
    const posts = [post(['AI Systems']), post(['AI Systems', 'Rust'])];
    const bySlug = groupByTagSlug(posts);

    expect(bySlug.get('ai-systems')?.posts).toHaveLength(2);
    expect(bySlug.get('rust')?.posts).toHaveLength(1);
  });

  test('merges posts under one tag when the labels match exactly', () => {
    const posts = [post(['Rust']), post(['Rust']), post(['Rust'])];
    const bySlug = groupByTagSlug(posts);

    expect(bySlug.size).toBe(1);
    expect(bySlug.get('rust')).toEqual({ label: 'Rust', posts });
  });

  test('throws, naming both labels and the shared slug, when two differently-spelled tags collide', () => {
    const posts = [post(['AI Systems']), post(['AI-Systems'])];

    expect(() => groupByTagSlug(posts)).toThrowError(
      /"AI Systems".*"AI-Systems".*"ai-systems"/,
    );
  });

  test('does not throw for an unrelated tag sharing no slug', () => {
    const posts = [post(['AI Systems']), post(['Rust'])];
    expect(() => groupByTagSlug(posts)).not.toThrow();
  });
});
