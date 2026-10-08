import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

// Walks the built site and pins the invariants that broke once already: the
// header's section links pointed at ids that exist only on the homepage, the
// booking dialog was rendered only by index.astro so the header CTA was inert
// everywhere else, and post pages had no site header at all.

const DIST = path.resolve(__dirname, '../dist/client');
const built = existsSync(DIST);

function htmlPages(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) htmlPages(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

test('the build emitted pages to walk', () => {
  if (!built && !process.env.CI) return;
  expect(built, `${DIST} missing — run \`npm run build\` first`).toBe(true);
});

describe.skipIf(!built)('site navigation', () => {
  const pages = htmlPages(DIST).map((file) => ({
    route: '/' + path.relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/'),
    html: readFileSync(file, 'utf8'),
  }));

  test('finds every built page', () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  test('every page carrying the site header also carries the booking dialog', () => {
    const offenders = pages
      .filter((p) => p.html.includes('class="header"'))
      .filter((p) => !p.html.includes('id="book-dialog"'))
      .map((p) => p.route);
    expect(offenders, 'header CTA has no dialog to open on these routes').toEqual([]);
  });

  test('no header link points at a bare in-page anchor', () => {
    // `#work` and friends are sections of the homepage only. As bare hashes
    // they resolved to nothing on /writing/, the tag pages and 404.
    const offenders: string[] = [];
    for (const page of pages) {
      const header = page.html.match(/<nav class="header__nav[^>]*>([\s\S]*?)<\/nav>/);
      if (!header) continue;
      for (const [, href] of header[1].matchAll(/href="([^"]+)"/g)) {
        if (href.startsWith('#')) offenders.push(`${page.route} -> ${href}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every header link that does target an id resolves on the homepage', () => {
    const home = pages.find((p) => p.route === '/');
    expect(home, 'no homepage in the build').toBeDefined();
    const header = home!.html.match(/<nav class="header__nav[^>]*>([\s\S]*?)<\/nav>/);
    expect(header, 'homepage has no header nav').not.toBeNull();

    const hashes = [...header![1].matchAll(/href="\/#([^"]+)"/g)].map((m) => m[1]);
    expect(hashes.length).toBeGreaterThan(0);
    for (const id of hashes) {
      expect(home!.html, `homepage has no #${id} for the nav to reach`).toContain(`id="${id}"`);
    }
  });

  test('every post page offers a route back into the site', () => {
    const posts = pages.filter((p) => p.route.startsWith('/writing/') && !p.route.startsWith('/writing/tags/') && p.route !== '/writing/');
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.html, `${post.route} has no site header`).toContain('class="header"');
      expect(post.html, `${post.route} has no link home`).toContain('href="/"');
    }
  });

  test('no page renders the booking dialog twice', () => {
    for (const page of pages) {
      const count = (page.html.match(/id="book-dialog"/g) ?? []).length;
      expect(count, `${page.route} renders ${count} booking dialogs`).toBeLessThanOrEqual(1);
    }
  });
});
