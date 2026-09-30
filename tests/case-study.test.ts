import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { describe, expect, test } from 'vitest';
import CaseStudy from '../src/components/CaseStudy.astro';
import MetricRow from '../src/components/MetricRow.astro';

// `render(project)` inside CaseStudy.astro pulls its Content component from
// `entry.rendered.html`, not from the real filesystem-backed content store —
// `getCollection('projects')` returns empty in this Vitest environment, since
// the content layer's data store isn't populated under `vitest run`. So a
// minimal object shaped like a CollectionEntry<'projects'>, carrying its own
// pre-rendered `rendered.html`, is exactly what the astro:content `render()`
// runtime needs and is enough to exercise every branch CaseStudy.astro
// actually renders conditionally on.
function makeEntry(data: CollectionEntry<'projects'>['data'], id = 'test-entry') {
  return {
    id,
    collection: 'projects',
    filePath: `src/content/projects/${id}.mdx`,
    data,
    rendered: {
      html: '<p>synthetic body</p>',
      metadata: { headings: [], frontmatter: {}, imagePaths: [] },
    },
  } as unknown as CollectionEntry<'projects'>;
}

const baseData = {
  title: 'Test Project',
  kicker: 'Test kicker',
  role: 'Test role',
  order: 1,
  blurb: 'Test blurb.',
  tags: ['Rust', 'TypeScript', 'PostgreSQL'],
  metrics: [{ value: '1k+', label: 'Documents indexed' }],
};

describe('metric row', () => {
  test('renders each metric value and label', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(MetricRow, {
      props: {
        metrics: [
          { value: '1k+', label: 'Documents indexed' },
          { value: '99.9%', label: 'Transaction reliability' },
        ],
      },
    });
    expect(html).toContain('1k+');
    expect(html).toContain('Documents indexed');
    expect(html).toContain('99.9%');
    expect(html).toContain('Transaction reliability');
  });

  test('sets metric values in the mono face so they read as measured', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(MetricRow, {
      props: { metrics: [{ value: '10k+', label: 'Daily users' }] },
    });
    expect(html).toMatch(/class="[^"]*mono[^"]*"[^>]*>\s*10k\+/);
  });
});

describe('case study evidence branches', () => {
  test('a linked entry with liveUrl renders a Live demo link pointing at that URL', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudy, {
      props: {
        project: makeEntry({
          ...baseData,
          evidence: 'linked',
          liveUrl: 'https://demo.example.com',
        }),
      },
    });
    expect(html).toContain('Live demo');
    expect(html).toMatch(/<a[^>]*href="https:\/\/demo\.example\.com"[^>]*>[\s\S]*?Live demo/);
  });

  test('a linked entry with only repoUrl renders Source code and no Live demo link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudy, {
      props: {
        project: makeEntry({
          ...baseData,
          evidence: 'linked',
          repoUrl: 'https://github.com/idowuseyi/test-repo',
        }),
      },
    });
    expect(html).toContain('Source code');
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/idowuseyi\/test-repo"[^>]*>Source code/);
    expect(html).not.toContain('Live demo');
    expect(html).not.toContain('case__link--live');
  });

  test('a writeup-only entry renders its evidenceNote and neither link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudy, {
      props: {
        project: makeEntry({
          ...baseData,
          evidence: 'writeup-only',
          evidenceNote: 'Proprietary: internal platform with no public link.',
        }),
      },
    });
    expect(html).toContain('Proprietary: internal platform with no public link.');
    expect(html).not.toContain('Live demo');
    expect(html).not.toContain('Source code');
  });

  test('renders every tag in the tag list', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CaseStudy, {
      props: {
        project: makeEntry({
          ...baseData,
          tags: ['Rust', 'Axum', 'PostgreSQL', 'Redis'],
          evidence: 'linked',
          liveUrl: 'https://demo.example.com',
        }),
      },
    });
    for (const tag of ['Rust', 'Axum', 'PostgreSQL', 'Redis']) {
      expect(html).toMatch(new RegExp(`<li[^>]*>${tag}</li>`));
    }
  });
});
