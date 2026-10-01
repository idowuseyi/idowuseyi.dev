import { describe, expect, test, vi } from 'vitest';
import { parseContactSubmission } from '../src/lib/contact';
import { POST } from '../src/pages/api/contact';

const valid = {
  name: 'Ada Recruiter',
  email: 'ada@example.com',
  company: 'Example Corp',
  message: 'We have a staff AI infrastructure role and would like to talk.',
  intent: 'hiring',
};

describe('contact submission parsing', () => {
  test('accepts a well-formed submission', () => {
    const result = parseContactSubmission(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe('ada@example.com');
  });

  test('rejects a malformed email', () => {
    const result = parseContactSubmission({ ...valid, email: 'ada-at-example' });
    expect(result.ok).toBe(false);
  });

  test('rejects an empty message', () => {
    const result = parseContactSubmission({ ...valid, message: '   ' });
    expect(result.ok).toBe(false);
  });

  test('rejects an unknown intent', () => {
    const result = parseContactSubmission({ ...valid, intent: 'spam' });
    expect(result.ok).toBe(false);
  });

  test('defaults company to an empty string when omitted', () => {
    const { company, ...withoutCompany } = valid;
    const result = parseContactSubmission(withoutCompany);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.company).toBe('');
  });

  test('trims surrounding whitespace', () => {
    const result = parseContactSubmission({ ...valid, name: '  Ada Recruiter  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Ada Recruiter');
  });

  test('caps message length to stop payload abuse', () => {
    const result = parseContactSubmission({ ...valid, message: 'x'.repeat(5001) });
    expect(result.ok).toBe(false);
  });
});

function formRequest(fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields);
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

describe('POST /api/contact honeypot', () => {
  test('accepts silently without attempting delivery when the trap field is filled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const request = formRequest({ ...valid, website: 'http://spam.example' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(202);
    // The honeypot branch returns before the module ever reaches the Resend
    // call (or the `cloudflare:workers` env import that precedes it), so a
    // real bot submission never attempts delivery.
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  test('still runs normal validation when the trap field is empty', async () => {
    const request = formRequest({ ...valid, website: '', email: 'not-an-email' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });
});
