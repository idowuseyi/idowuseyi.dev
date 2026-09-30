import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import Cta from '../src/components/Cta.astro';
import Hero from '../src/components/Hero.astro';
import { profile } from '../src/data/profile';

let html = '';
let ctaHtml = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Hero);
  ctaHtml = await container.renderToString(Cta, { props: { placement: 'test' } });
});

describe('hero', () => {
  test('leads with the AI systems positioning', () => {
    expect(html).toContain('AI systems engineer');
    expect(html).toContain('I build the infrastructure agents run on');
  });

  test('states availability before skill', () => {
    expect(html).toMatch(/AVAILABLE FOR SENIOR \/ STAFF ROLES/i);

    const availabilityIndex = html.toLowerCase().indexOf(profile.availability.toLowerCase());
    const pitchIndex = html.indexOf(profile.pitch);
    // Search past the pitch itself: the pitch text mentions "Rust" inline, so an
    // unbounded indexOf would match that mention instead of the competency list entry.
    const firstCompetencyIndex = html.indexOf(profile.competencies[0], pitchIndex + profile.pitch.length);

    expect(availabilityIndex).toBeGreaterThan(-1);
    expect(pitchIndex).toBeGreaterThan(-1);
    expect(firstCompetencyIndex).toBeGreaterThan(-1);
    expect(availabilityIndex).toBeLessThan(pitchIndex);
    expect(pitchIndex).toBeLessThan(firstCompetencyIndex);
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

  test('hides the decorative availability dot from assistive technology', () => {
    expect(html).toMatch(/<span class="hero__dot" aria-hidden="true"[^>]*><\/span>/);
  });
});

describe('cta', () => {
  test('hides the decorative CV download arrow while keeping discernible link text', () => {
    expect(ctaHtml).toContain('Book a 20-min call');
    expect(ctaHtml).toContain('Download CV');
    expect(ctaHtml).toMatch(/<span aria-hidden="true"[^>]*>↓<\/span>/);
  });
});
