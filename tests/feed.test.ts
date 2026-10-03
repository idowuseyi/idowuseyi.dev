import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const FEED = 'dist/client/rss.xml';
const built = existsSync(FEED);
const xml = built ? readFileSync(FEED, 'utf8') : '';

describe.skipIf(!built)('rss feed (requires `npm run build` first)', () => {
  test('is a valid-looking RSS 2.0 document', () => {
    expect(xml).toContain('<rss');
    expect(xml).toContain('version="2.0"');
    expect(xml).toContain('<channel>');
  });

  test('declares the canonical site', () => {
    expect(xml).toContain('https://idowuseyi.dev');
  });

  test('contains an item per non-draft post', () => {
    const items = xml.match(/<item>/g) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  test('a native post links to this site', () => {
    expect(xml).toContain('https://idowuseyi.dev/writing/why-schema-validated-llm-output/');
  });

  test('an external post links to its publisher, not here', () => {
    expect(xml).toContain('https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo');
    expect(xml).not.toContain('idowuseyi.dev/writing/understanding-api-like-a-pro');
  });

  test('every item has a pubDate', () => {
    const items = (xml.match(/<item>/g) ?? []).length;
    const dates = (xml.match(/<pubDate>/g) ?? []).length;
    expect(dates).toBe(items);
  });

  test('excludes drafts', () => {
    expect(xml).not.toContain('draft');
  });
});

test('the feed file exists after a build', () => {
  expect(built, `${FEED} missing — run \`npm run build\` first`).toBe(true);
});
