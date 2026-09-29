import { describe, expect, test } from 'vitest';
import { projectSchema } from '../src/schemas/project';

const base = {
  title: 'RAG & Semantic Search',
  kicker: 'AI / Retrieval',
  role: 'Software Engineer — HNG / Telex',
  order: 2,
  blurb: 'Retrieval over thousands of documents with optimised context windows.',
  tags: ['Rust', 'ChromaDB'],
  metrics: [{ value: '1k+', label: 'Documents indexed' }],
};

describe('evidence rule', () => {
  test('accepts a project with only a live URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', liveUrl: 'https://demo.idowuseyi.dev',
    });
    expect(result.success).toBe(true);
  });

  test('accepts a project with only a repo URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', repoUrl: 'https://github.com/idowuseyi/rag',
    });
    expect(result.success).toBe(true);
  });

  test('rejects a linked project carrying neither URL', () => {
    const result = projectSchema.safeParse({ ...base, evidence: 'linked' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/liveUrl or repoUrl/);
    }
  });

  test('accepts writeup-only when a reason is given', () => {
    const result = projectSchema.safeParse({
      ...base,
      evidence: 'writeup-only',
      evidenceNote: 'Proprietary: KO Content Studios internal platform.',
    });
    expect(result.success).toBe(true);
  });

  test('rejects writeup-only with no reason', () => {
    const result = projectSchema.safeParse({ ...base, evidence: 'writeup-only' });
    expect(result.success).toBe(false);
  });

  test('rejects writeup-only with a token reason', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'writeup-only', evidenceNote: 'private',
    });
    expect(result.success).toBe(false);
  });

  test('rejects a malformed URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', repoUrl: 'github.com/idowuseyi/rag',
    });
    expect(result.success).toBe(false);
  });

  test('rejects more than three metrics', () => {
    const result = projectSchema.safeParse({
      ...base,
      evidence: 'linked',
      repoUrl: 'https://github.com/idowuseyi/rag',
      metrics: [
        { value: '1', label: 'a' }, { value: '2', label: 'b' },
        { value: '3', label: 'c' }, { value: '4', label: 'd' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
