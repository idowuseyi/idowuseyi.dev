import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { parseContactSubmission } from '../src/lib/contact';
import { POST } from '../src/pages/api/contact';

// `cloudflare:workers` only exists inside the Workers runtime (see the
// comment in src/pages/api/contact.ts and src/env.d.ts), so there is nothing
// on disk for Vitest to resolve. `vi.mock` with a factory doesn't need the
// specifier to resolve to a real module — it registers the mock directly —
// so this makes the module mockable under plain Node/Vitest without a real
// Workers runtime (e.g. `vitest-pool-workers`). `mockEnv` is a single mutable
// object so individual tests can tweak its properties (to simulate missing
// secrets) and have the already-imported module observe the change, since
// every `await import('cloudflare:workers')` call resolves to the same
// mocked module instance.
const mockEnv: { RESEND_API_KEY?: string; CONTACT_TO_EMAIL?: string } = {
  RESEND_API_KEY: 'test-resend-key',
  CONTACT_TO_EMAIL: 'ops@example.com',
};

vi.mock('cloudflare:workers', () => ({ env: mockEnv }));

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

  test('rejects a missing name', () => {
    const { name, ...withoutName } = valid;
    const result = parseContactSubmission(withoutName);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Name is required.');
  });

  test('rejects a name made only of whitespace', () => {
    const result = parseContactSubmission({ ...valid, name: '   ' });
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

  test('caps name length', () => {
    const result = parseContactSubmission({ ...valid, name: 'x'.repeat(201) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Name is too long.');
  });

  test('caps company length', () => {
    const result = parseContactSubmission({ ...valid, company: 'x'.repeat(201) });
    expect(result.ok).toBe(false);
  });

  test('caps email length', () => {
    const longEmail = `${'x'.repeat(315)}@example.com`; // > 320 chars total, still matches EMAIL regex
    const result = parseContactSubmission({ ...valid, email: longEmail });
    expect(result.ok).toBe(false);
  });
});

function formRequest(fields: Record<string, string>, headers: Record<string, string> = {}): Request {
  const body = new URLSearchParams(fields);
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: body.toString(),
  });
}

describe('POST /api/contact honeypot', () => {
  test('accepts silently without attempting delivery when the trap field is filled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const request = formRequest({ ...valid, _hp: 'http://spam.example' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(202);
    // The honeypot branch returns before the module ever reaches the Resend
    // call (or the `cloudflare:workers` env import that precedes it), so a
    // real bot submission never attempts delivery.
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  test('still runs normal validation when the trap field is empty', async () => {
    const request = formRequest({ ...valid, _hp: '', email: 'not-an-email' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/contact delivery', () => {
  beforeEach(() => {
    mockEnv.RESEND_API_KEY = 'test-resend-key';
    mockEnv.CONTACT_TO_EMAIL = 'ops@example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns 500 and never calls fetch when secrets are missing', async () => {
    mockEnv.RESEND_API_KEY = undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = formRequest({ ...valid, _hp: '' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(500);
    // The body must not disclose *why* delivery failed — only the operator's
    // console gets the real reason.
    const body = await response.text();
    expect(body).toBe('Could not send your message. Please email me instead.');
    expect(body.toLowerCase()).not.toContain('config');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('returns 502 when Resend responds with a non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad request', { status: 422 }));

    const request = formRequest({ ...valid, _hp: '' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(502);
  });

  test('returns 204 when Resend accepts the message (fetch/non-HTML request)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    const request = formRequest({ ...valid, _hp: '' }, { accept: '*/*' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(204);
  });

  test('builds the Resend request correctly: URL, auth header, to/reply_to/subject/text', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    const request = formRequest({ ...valid, _hp: '' }, { accept: '*/*' });
    await POST({ request } as Parameters<typeof POST>[0]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.resend.com/emails');

    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${mockEnv.RESEND_API_KEY}`);

    const payload = JSON.parse(init.body as string);
    expect(payload.to).toEqual([mockEnv.CONTACT_TO_EMAIL]);
    expect(payload.reply_to).toBe(valid.email);
    expect(payload.subject).toContain(valid.name);
    expect(payload.text).toContain(valid.name);
    expect(payload.text).toContain(valid.message);
  });

  test('redirects a no-JS (HTML-accepting) request to /thanks on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    const request = formRequest(
      { ...valid, _hp: '' },
      { accept: 'text/html,application/xhtml+xml' },
    );
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/thanks');
  });

  test('redirects a no-JS (HTML-accepting) request to /contact-error on validation failure', async () => {
    const request = formRequest(
      { ...valid, _hp: '', email: 'not-an-email' },
      { accept: 'text/html,application/xhtml+xml' },
    );
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/contact-error');
  });

  test('redirects a no-JS (HTML-accepting) request to /contact-error when secrets are missing', async () => {
    mockEnv.RESEND_API_KEY = undefined;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = formRequest(
      { ...valid, _hp: '' },
      { accept: 'text/html,application/xhtml+xml' },
    );
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/contact-error');
  });

  test('returns a generic error (never a bare 500) and logs the cause when request.formData() throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = {
      formData: () => Promise.reject(new Error('malformed multipart body')),
      headers: new Headers({ accept: '*/*' }),
    } as unknown as Request;

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    // A thrown body-parse error must never resolve to success, and must
    // never reach the Resend call.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('redirects an HTML-accepting request to /contact-error when request.formData() throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = {
      formData: () => Promise.reject(new Error('malformed multipart body')),
      headers: new Headers({ accept: 'text/html,application/xhtml+xml' }),
    } as unknown as Request;

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/contact-error');
  });

  test('returns 502 and logs the cause when the outbound delivery fetch throws, never reporting success', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unreachable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = formRequest({ ...valid, _hp: '' }, { accept: '*/*' });
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(502);
    expect(errorSpy).toHaveBeenCalled();
  });

  test('redirects an HTML-accepting request to /contact-error when the outbound delivery fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unreachable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = formRequest(
      { ...valid, _hp: '' },
      { accept: 'text/html,application/xhtml+xml' },
    );
    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/contact-error');
  });
});
