import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { describe, expect, test } from 'vitest';
import { postSchema } from '../src/schemas/post';
import type { Post } from '../src/schemas/post';
import {
  channelCustomData,
  lastBuildDate,
  publishable,
  toFeedItem,
} from '../src/lib/feed';
import type { FeedEntry } from '../src/lib/feed';

// Two halves, following this repo's convention (see tests/case-study.test.ts):
// the feed's decisions are pure and tested here with synthetic entries, since
// `getCollection` returns empty under `vitest run`; the real wiring is then
// checked against the built artefact at the bottom.

function entry(id: string, data: Partial<Post> & Pick<Post, 'kind'>): FeedEntry {
  return {
    id,
    data: {
      title: `Title for ${id}`,
      description: `Description for ${id}`,
      pubDate: new Date('2026-01-01T00:00:00Z'),
      tags: ['Testing'],
      draft: false,
      ...data,
    } as Post,
  };
}

describe('feed selection', () => {
  test('drops drafts and keeps the rest newest-first', () => {
    const entries = [
      entry('older', { kind: 'native', pubDate: new Date('2024-01-01T00:00:00Z') }),
      entry('newest', { kind: 'native', pubDate: new Date('2026-06-01T00:00:00Z') }),
      entry('hidden', { kind: 'native', draft: true, pubDate: new Date('2026-12-01T00:00:00Z') }),
      entry('middle', { kind: 'native', pubDate: new Date('2025-03-01T00:00:00Z') }),
    ];
    expect(publishable(entries).map((e) => e.id)).toEqual(['newest', 'middle', 'older']);
  });

  test('a draft is excluded even when it is the newest post', () => {
    const entries = [entry('draft', { kind: 'native', draft: true })];
    expect(publishable(entries)).toHaveLength(0);
  });
});

describe('feed items', () => {
  test('a native post links to a path on this site', () => {
    const item = toFeedItem(entry('why-schema-validated-llm-output', { kind: 'native' }));
    expect(item.link).toBe('/writing/why-schema-validated-llm-output/');
  });

  test('an external post links to its publisher, not to a page here', () => {
    const item = toFeedItem(
      entry('understanding-api-like-a-pro', {
        kind: 'external',
        platform: 'dev.to',
        url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo',
      } as Partial<Post> & Pick<Post, 'kind'>),
    );
    expect(item.link).toBe('https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo');
    expect(item.link).not.toContain('idowuseyi.dev');
  });

  test('carries the post tags through as categories', () => {
    const item = toFeedItem(entry('tagged', { kind: 'native', tags: ['Rust', 'LLM'] }));
    expect(item.categories).toEqual(['Rust', 'LLM']);
  });
});

describe('channel metadata', () => {
  test('lastBuildDate is the newest publishable date, not the clock', () => {
    const entries = [
      entry('a', { kind: 'native', pubDate: new Date('2025-01-01T00:00:00Z') }),
      entry('b', { kind: 'native', pubDate: new Date('2026-02-02T00:00:00Z') }),
      entry('draft', { kind: 'native', draft: true, pubDate: new Date('2030-01-01T00:00:00Z') }),
    ];
    expect(lastBuildDate(entries).toISOString()).toBe('2026-02-02T00:00:00.000Z');
  });

  test('an empty collection yields epoch rather than throwing', () => {
    expect(lastBuildDate([]).getTime()).toBe(0);
  });

  test('declares language, an RFC-822 lastBuildDate and an atom self link', () => {
    const xml = channelCustomData(
      [entry('a', { kind: 'native', pubDate: new Date('2026-02-02T00:00:00Z') })],
      'https://idowuseyi.dev/rss.xml',
    );
    expect(xml).toContain('<language>en-gb</language>');
    expect(xml).toContain('<lastBuildDate>Mon, 02 Feb 2026 00:00:00 GMT</lastBuildDate>');
    expect(xml).toContain(
      '<atom:link href="https://idowuseyi.dev/rss.xml" rel="self" type="application/rss+xml"/>',
    );
  });
});

// The real post files on disk, parsed and validated with the same schema the
// content loader uses — the approach tests/homepage.test.ts established for
// projects, since `getCollection` is empty here. This gives the built-feed
// assertions an expected item count derived from content rather than a
// hard-coded floor that would still pass with a post missing.
const postsDir = path.resolve(__dirname, '../src/content/posts');

function readPostFrontmatter(filename: string): Post {
  const raw = readFileSync(path.join(postsDir, filename), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${filename} has no frontmatter block.`);
  return postSchema.parse(loadYaml(match[1]));
}

const POST_FILES = readdirSync(postsDir).filter((f) => f.endsWith('.mdx'));
const POSTS = POST_FILES.map(readPostFrontmatter);
const POST_COUNT = POSTS.filter((p) => !p.draft).length;

describe('posts on disk', () => {
  test('there is at least one post to syndicate', () => {
    expect(POST_COUNT).toBeGreaterThan(0);
  });

  test('every post file satisfies the post schema', () => {
    // readPostFrontmatter throws on an invalid file, so reaching here is the
    // assertion; the count guards against the directory being empty.
    expect(POSTS).toHaveLength(POST_FILES.length);
  });
});

// `npm run build` precedes `npm test` in CI, so a missing feed there is a real
// failure, not an unbuilt working copy. Locally it only means "not built yet".
const FEED = 'dist/client/rss.xml';
const built = existsSync(FEED);

test('the build emits the feed', () => {
  if (!built && !process.env.CI) {
    // Not in CI: nothing has been built, and that is not a defect.
    return;
  }
  expect(built, `${FEED} missing — run \`npm run build\` first`).toBe(true);
});

describe.skipIf(!built)('built feed', () => {
  const xml = built ? readFileSync(FEED, 'utf8') : '';

  test('is a valid-looking RSS 2.0 document in the atom namespace', () => {
    expect(xml).toContain('<rss');
    expect(xml).toContain('version="2.0"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<channel>');
  });

  test('points its self link and channel link at the canonical site', () => {
    expect(xml).toContain(
      '<atom:link href="https://idowuseyi.dev/rss.xml" rel="self" type="application/rss+xml"/>',
    );
    expect(xml).toContain('<link>https://idowuseyi.dev/</link>');
  });

  test('contains one item per post file on disk', () => {
    // Derived from the content directory rather than a hard-coded floor, so
    // adding a post without it reaching the feed fails here.
    const items = (xml.match(/<item>/g) ?? []).length;
    expect(items).toBe(POST_COUNT);
  });

  test('every item has a pubDate', () => {
    const items = (xml.match(/<item>/g) ?? []).length;
    const dates = (xml.match(/<pubDate>/g) ?? []).length;
    expect(dates).toBe(items);
  });

  test('links a native post here and an external post to its publisher', () => {
    expect(xml).toContain('https://idowuseyi.dev/writing/why-schema-validated-llm-output/');
    expect(xml).toContain('https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo');
    expect(xml).not.toContain('idowuseyi.dev/writing/understanding-api-like-a-pro');
  });

  test('leaves no bare ampersand or angle bracket inside a title', () => {
    for (const [, inner] of xml.matchAll(/<title>([\s\S]*?)<\/title>/g)) {
      expect(inner).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/);
      expect(inner).not.toMatch(/[<>]/);
    }
  });
});
