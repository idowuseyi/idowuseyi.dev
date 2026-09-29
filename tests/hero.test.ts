import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import Hero from '../src/components/Hero.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Hero);
});

describe('hero', () => {
  test('leads with the AI systems positioning', () => {
    expect(html).toContain('AI systems engineer');
    expect(html).toContain('I build the infrastructure agents run on');
  });

  test('states availability before skill', () => {
    expect(html).toMatch(/AVAILABLE FOR SENIOR \/ STAFF ROLES/i);
  });

  test('claims 3+ years and never 5+', () => {
    expect(html).toContain('3+ years');
    expect(html).not.toContain('5+ years');
  });

  test('carries the backend keyword surface', () => {
    for (const keyword of ['Rust', 'TypeScript', 'PostgreSQL', 'Redis', 'Axum', 'NestJS']) {
      expect(html).toContain(keyword);
    }
  });

  test('offers both CTAs at their two commitment levels', () => {
    expect(html).toContain('Book a 20-min call');
    expect(html).toContain('Download CV');
  });

  test('links the CV to a stable ungated path', () => {
    expect(html).toContain('href="/resume.pdf"');
    expect(html).toContain('download');
  });

  test('tags CTAs with a placement for analytics', () => {
    expect(html).toContain('data-placement="hero"');
  });
});
