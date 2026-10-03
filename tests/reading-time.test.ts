import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { readingTime } from '../src/lib/reading-time';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

function stripFrontmatter(raw: string): string {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return raw;
  const end = lines.indexOf('---', 1);
  if (end === -1) return raw;
  return lines.slice(end + 1).join('\n');
}

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

  test('treats an unclosed code fence as code through end-of-input', () => {
    const withTrailingProse = readingTime('```ts\nconst x = 1;\n' + words(400));
    const codeOnly = readingTime('```ts\nconst x = 1;\n');
    // The 400 words after the unclosed fence must NOT be counted as prose.
    expect(withTrailingProse).toBe(codeOnly);
  });

  test('still strips a closed fence and counts prose that follows it', () => {
    const withClosedFence = readingTime('```ts\nconst x = 1;\n```\n\n' + words(400));
    const plain = readingTime(words(400));
    expect(withClosedFence).toBe(plain);
  });

  test('returns 1 when the input is entirely an unclosed fence', () => {
    expect(readingTime('```ts\n' + words(400))).toBe(1);
  });

  test('counts a hyphenated compound as one word', () => {
    const withHyphen = readingTime('schema-validated ' + words(199));
    expect(withHyphen).toBe(1);
    const oneMoreHyphenated = readingTime('schema-validated ' + words(200));
    expect(oneMoreHyphenated).toBe(2);
  });

  test('does not count an em-dash as a word', () => {
    // If the em-dash were counted as its own word, 200 words + 1 would
    // round up to 2 minutes instead of staying at 1.
    expect(readingTime(words(200) + ' — ')).toBe(1);
  });

  test('pins the body -> readingTime integration for the published post', () => {
    const raw = readFileSync(
      path.join(__dirname, '../src/content/posts/why-schema-validated-llm-output.mdx'),
      'utf-8',
    );
    const body = stripFrontmatter(raw);
    expect(readingTime(body)).toBeGreaterThan(1);
  });
});
