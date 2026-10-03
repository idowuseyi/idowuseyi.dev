import { describe, expect, test } from 'vitest';
import { readingTime } from '../src/lib/reading-time';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('readingTime', () => {
  test('returns at least one minute for very short text', () => {
    expect(readingTime('a few words only')).toBe(1);
  });

  test('returns 1 for 200 words at 200wpm', () => {
    expect(readingTime(words(200))).toBe(1);
  });

  test('rounds up a partial minute', () => {
    expect(readingTime(words(201))).toBe(2);
  });

  test('scales linearly', () => {
    expect(readingTime(words(1000))).toBe(5);
  });

  test('ignores markdown punctuation and code fences', () => {
    const plain = readingTime(words(400));
    const marked = readingTime('# Heading\n\n```ts\nconst x = 1;\n```\n\n' + words(400));
    expect(Math.abs(marked - plain)).toBeLessThanOrEqual(1);
  });

  test('returns 1 for empty input rather than 0 or NaN', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('   ')).toBe(1);
  });
});
