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

  test('finds every page type the site is meant to build', () => {
    // Named routes rather than a count: a count both passes on the wrong set
    // and breaks whenever a post or tag is added.
    for (const route of ['/', '/writing/', '/thanks/', '/contact-error/', '/404.html']) {
      expect(pages.map((p) => p.route), `missing ${route}`).toContain(route);
    }
    const posts = pages.filter(
      (p) => p.route.startsWith('/writing/') && !p.route.startsWith('/writing/tags/') && p.route !== '/writing/',
    );
    expect(posts.length, 'no post pages built').toBeGreaterThan(0);
    expect(
      pages.filter((p) => p.route.startsWith('/writing/tags/')).length,
      'no tag pages built',
    ).toBeGreaterThan(0);
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
    let navsSeen = 0;
    for (const page of pages) {
      const header = page.html.match(/<nav class="header__nav[^>]*>([\s\S]*?)<\/nav>/);
      if (!header) continue;
      navsSeen += 1;
      for (const [, href] of header[1].matchAll(/href="([^"]+)"/g)) {
        if (href.startsWith('#')) offenders.push(`${page.route} -> ${href}`);
      }
    }
    expect(navsSeen, 'matched no header nav at all — the selector has drifted').toBeGreaterThan(0);
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
  test('every page type that should carry the header does', () => {
    // The dialog/header pairing was asserted, but not that these pages have a
    // header in the first place — removing <SiteHeader /> from any of them
    // failed nothing.
    for (const route of ['/', '/writing/', '/404.html']) {
      const page = pages.find((p) => p.route === route);
      expect(page, `no ${route} in the build`).toBeDefined();
      expect(page!.html, `${route} has no site header`).toContain('class="header"');
    }
    const tagPages = pages.filter((p) => p.route.startsWith('/writing/tags/'));
    expect(tagPages.length).toBeGreaterThan(0);
    for (const t of tagPages) {
      expect(t.html, `${t.route} has no site header`).toContain('class="header"');
    }
  });

  test('every built tag page is linked from somewhere in the site', () => {
    // Eight of eleven tag pages were orphans: built, deployed, noindex and
    // reachable by nothing, because only native posts render tag links and
    // most tags belonged to external posts alone.
    const tagRoutes = pages
      .filter((p) => p.route.startsWith('/writing/tags/') && p.route.endsWith('/'))
      .map((p) => p.route);
    expect(tagRoutes.length).toBeGreaterThan(0);

    const orphans = tagRoutes.filter(
      (route) => !pages.some((p) => p.route !== route && p.html.includes(`href="${route}"`)),
    );
    expect(orphans, 'these tag pages are reachable by nothing').toEqual([]);
  });

  test('every page declares exactly one absolute canonical on the live host', () => {
    for (const page of pages) {
      const links = page.html.match(/<link rel="canonical" href="([^"]+)"/g) ?? [];
      expect(links.length, `${page.route} has ${links.length} canonical links`).toBe(1);
      const href = links[0].match(/href="([^"]+)"/)![1];
      expect(href, `${page.route} canonical is not absolute on the live host`).toMatch(
        /^https:\/\/idowuseyi\.dev\//,
      );
    }
  });

  test('the sitemap lists the indexable pages and nothing noindex', () => {
    const sitemapFile = path.join(DIST, 'sitemap-0.xml');
    expect(existsSync(sitemapFile), 'no sitemap-0.xml in the build').toBe(true);
    const sitemap = readFileSync(sitemapFile, 'utf8');

    for (const page of pages) {
      if (page.route.endsWith('.html') && page.route !== '/404.html') continue;
      const url = `https://idowuseyi.dev${page.route}`;
      const listed = sitemap.includes(`<loc>${url}</loc>`);
      const noindex = page.html.includes('name="robots" content="noindex');

      if (noindex) {
        expect(listed, `${page.route} is noindex yet listed in the sitemap`).toBe(false);
      } else if (page.route !== '/404.html') {
        expect(listed, `${page.route} is indexable but missing from the sitemap`).toBe(true);
      }
    }
  });

  test('tag pages and the status pages are noindex', () => {
    const shouldBeNoindex = pages.filter(
      (p) =>
        p.route.startsWith('/writing/tags/') ||
        p.route === '/thanks/' ||
        p.route === '/contact-error/',
    );
    expect(shouldBeNoindex.length).toBeGreaterThan(0);
    for (const page of shouldBeNoindex) {
      expect(page.html, `${page.route} is missing noindex`).toContain('content="noindex');
    }
  });

  test('every page has one main landmark, and the skip link resolves to it', () => {
    for (const page of pages) {
      const mains = (page.html.match(/<main[\s>]/g) ?? []).length;
      expect(mains, `${page.route} has ${mains} <main> landmarks`).toBe(1);

      const skip = page.html.match(/class="skip-link" href="#([^"]+)"/);
      if (!skip) continue; // status pages render no header, so no skip link
      expect(page.html, `${page.route} skip link points at #${skip[1]}, which is not there`)
        .toContain(`id="${skip[1]}"`);
    }
  });

  test('every page carries a footer with a contentinfo landmark', () => {
    for (const page of pages) {
      expect(page.html, `${page.route} has no footer`).toContain('<footer class="footer"');
    }
  });

  test('no page renders content that only JavaScript can reveal', () => {
    // The .reveal hide is gated on `scripting: enabled`; an unconditional rule
    // emptied /writing/ and the tag pages for a visitor with JS off.
    const css = readdirSync(path.join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(path.join(DIST, '_astro', f), 'utf8'))
      .join('');
    expect(css, 'no .reveal rule found at all — the selector has drifted').toMatch(/\.reveal\{/);
    const hidingRules = css.match(/\.reveal\{[^}]*opacity:0[^}]*\}/g) ?? [];
    expect(hidingRules.length, 'expected the reveal hide to exist').toBeGreaterThan(0);
    for (const rule of hidingRules) {
      const at = css.indexOf(rule);
      const preceding = css.slice(0, at);
      const lastMedia = preceding.lastIndexOf('@media');
      const query = preceding.slice(lastMedia, preceding.indexOf('{', lastMedia));
      expect(query, 'the reveal hide is not gated on scripting').toContain('scripting');
    }
  });
});
