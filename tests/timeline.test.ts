import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import Timeline from '../src/components/Timeline.astro';
import { experience } from '../src/data/experience';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Timeline);
});

describe('experience timeline', () => {
  test('retains every employer from the previous site', () => {
    for (const org of ['Theraptly', 'HNG', 'Jethro', 'Sparkly', 'PayRent', 'Fitzzy', 'Techivate', 'OpenReplay']) {
      expect(html).toContain(org);
    }
  });

  test('preserves the Techivate scale metric that left the case studies', () => {
    expect(html).toContain('10k+');
  });

  test('lists eight roles', () => {
    expect(experience).toHaveLength(8);
  });

  test('is ordered most recent first', () => {
    expect(experience[0].period).toContain('2025');
    expect(experience[experience.length - 1].period).toBe('2023');
  });

  test('never claims 5+ years', () => {
    expect(html).not.toContain('5+ years');
  });
});
