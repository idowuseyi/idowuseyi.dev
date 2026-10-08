import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../src/lib/contrast';

describe('contrastRatio', () => {
  test('6-digit hex: white on black is 21', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
  });

  test('3-digit shorthand hex expands correctly (the bug)', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 2);
  });

  test('is case-insensitive', () => {
    const upper = contrastRatio('#EDEEF0', '#000000');
    const lower = contrastRatio('#edeef0', '#000000');
    expect(upper).toBeCloseTo(lower, 10);
  });

  test('accepts a missing leading #', () => {
    const withHash = contrastRatio('#EDEEF0', '#000000');
    const withoutHash = contrastRatio('EDEEF0', '000000');
    expect(withoutHash).toBeCloseTo(withHash, 10);
  });

  test('throws TypeError on wrong-length hex', () => {
    expect(() => contrastRatio('#12345', '#000')).toThrow(TypeError);
  });

  test('throws TypeError on non-hex characters', () => {
    expect(() => contrastRatio('#gggggg', '#000')).toThrow(TypeError);
  });

  test('throws TypeError on empty string', () => {
    expect(() => contrastRatio('', '#000')).toThrow(TypeError);
  });

  test('never returns NaN', () => {
    expect(Number.isNaN(contrastRatio('#fff', '#000'))).toBe(false);
  });

  test('is symmetric', () => {
    const a = contrastRatio('#EDEEF0', '#08090A');
    const b = contrastRatio('#08090A', '#EDEEF0');
    expect(a).toBe(b);
  });
});
