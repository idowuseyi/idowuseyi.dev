import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import MetricRow from '../src/components/MetricRow.astro';

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
