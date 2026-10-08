import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import BaseLayout from '../src/layouts/BaseLayout.astro';

const base = { title: 'Test page', description: 'Test description.' };

async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(BaseLayout, { props: { ...base, ...props } });
}

describe('json-ld injection', () => {
  // Pins the `<` escaping in BaseLayout.astro. `set:html` is unescaped by
  // design, so a literal `</script>` inside a stringified object would close
  // the element early and spill the rest of the JSON into the document.
  test('escapes `<` so a hostile headline cannot close the script element', async () => {
    const html = await render({
      jsonLd: { '@type': 'BlogPosting', headline: 'Breaking out </script><img src=x>' },
    });
    expect(html).not.toContain('</script><img src=x>');
    expect(html).toContain('\\u003c/script');
  });

  test('the escaped payload is still valid JSON that round-trips', async () => {
    const html = await render({
      jsonLd: { '@type': 'BlogPosting', headline: 'A < B and </script>' },
    });
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match, 'no ld+json block rendered').not.toBeNull();
    const parsed = JSON.parse(match![1]) as { headline: string };
    expect(parsed.headline).toBe('A < B and </script>');
  });

  test('renders no ld+json block when no jsonLd prop is passed', async () => {
    const html = await render({});
    expect(html).not.toContain('application/ld+json');
  });
});

describe('open graph', () => {
  test('defaults og:type to website', async () => {
    const html = await render({});
    expect(html).toContain('<meta property="og:type" content="website">');
  });

  test('honours an article og:type for post pages', async () => {
    const html = await render({ ogType: 'article' });
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).not.toContain('content="website"');
  });

  test('gives the social image absolute URLs and alt text on both cards', async () => {
    const html = await render({});
    expect(html).toContain('<meta property="og:image" content="https://idowuseyi.dev/og.png">');
    expect(html).toMatch(/<meta property="og:image:alt" content="[^"]+">/);
    expect(html).toMatch(/<meta name="twitter:image:alt" content="[^"]+">/);
  });

  test('advertises the feed on every page', async () => {
    const html = await render({});
    expect(html).toContain('type="application/rss+xml"');
    expect(html).toContain('href="/rss.xml"');
  });
});

describe('indexing', () => {
  test('omits the robots meta by default', async () => {
    const html = await render({});
    expect(html).not.toContain('noindex');
  });

  test('emits noindex, follow when asked', async () => {
    const html = await render({ noindex: true });
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
  });
});
