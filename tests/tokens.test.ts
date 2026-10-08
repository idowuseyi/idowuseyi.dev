import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} is not defined`);
  return match[1].trim();
}

// Recursively lists every file under `dir`.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// A `.css` file is entirely CSS; an `.astro` file's CSS lives only inside its
// `<style>` block(s) — markup and frontmatter can freely mention `--focus` in
// comments/strings without that being a real token consumer.
function cssRegionsOf(filePath: string, content: string): string[] {
  if (filePath.endsWith('.css')) return [content];
  if (!filePath.endsWith('.astro')) return [];
  const regions: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) regions.push(match[1]);
  return regions;
}

// Finds every `selector { ... }` rule in flat (non-nested-rule) CSS whose
// body contains `token`, returning each rule's selector text. Matching
// proceeds innermost-block-first, so even a rule nested inside `@media`
// still has its own selector captured correctly.
function selectorsConsuming(token: string, css: string): string[] {
  const selectors: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const [, selector, body] = match;
    if (body.includes(token)) selectors.push(selector.trim());
  }
  return selectors;
}

describe('design tokens', () => {
  test('defines the exact spec palette', () => {
    expect(token('base')).toBe('#08090A');
    expect(token('surface')).toBe('#101113');
    expect(token('border')).toBe('#1E2023');
    expect(token('text')).toBe('#EDEEF0');
    expect(token('muted')).toBe('#8A8F98');
    expect(token('accent')).toBe('#4ADE80');
  });

  test('body text on base meets WCAG AAA', () => {
    expect(contrastRatio(token('text'), token('base'))).toBeGreaterThanOrEqual(7);
  });

  test('muted text on base meets WCAG AA', () => {
    expect(contrastRatio(token('muted'), token('base'))).toBeGreaterThanOrEqual(4.5);
  });

  test('base text on an accent button meets WCAG AA', () => {
    expect(contrastRatio(token('base'), token('accent'))).toBeGreaterThanOrEqual(4.5);
  });

  test('declares no light-mode branch', () => {
    expect(css).not.toContain('prefers-color-scheme');
  });

  test('defines --focus as the declared exception, resolving to --accent', () => {
    expect(token('focus')).toBe('var(--accent)');
  });

  test(':focus-visible consumes --focus, not --accent directly', () => {
    const match = css.match(/:focus-visible\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const rule = match![1];
    expect(rule).toContain('var(--focus)');
    expect(rule).not.toContain('var(--accent)');
  });

  test('disables motion under prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});

describe('--focus exclusivity', () => {
  // `--accent` is reserved for CTAs, live/availability indicators and
  // diagram highlights. The a11y focus ring is the ONE declared exception
  // allowed to consume `--focus` (which itself resolves to `--accent`) — see
  // the comment above `--focus` in tokens.css. Nothing else may reference
  // `var(--focus)`, anywhere under src/.
  test('var(--focus) is consumed only inside :focus-visible rules', () => {
    const files = walk('src').filter((f) => f.endsWith('.css') || f.endsWith('.astro'));
    const offenders: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const region of cssRegionsOf(file, content)) {
        for (const selector of selectorsConsuming('var(--focus)', region)) {
          if (!selector.includes(':focus-visible')) offenders.push(`${file}: ${selector}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // Not load-bearing for the rule itself (the test above is), but pins the
  // known-good count so a silent third consumer slipping in alongside a
  // legitimate :focus-visible rule doesn't go unnoticed.
  test('has exactly two consumers today: tokens.css and ContactForm.astro', () => {
    const files = walk('src').filter((f) => f.endsWith('.css') || f.endsWith('.astro'));
    let count = 0;
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      count += (content.match(/var\(--focus\)/g) ?? []).length;
    }
    expect(count).toBe(2);
  });
});
