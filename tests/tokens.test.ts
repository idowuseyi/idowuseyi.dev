import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} is not defined`);
  return match[1].trim();
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
