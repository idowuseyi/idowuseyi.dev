export interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  message: string;
  intent: 'hiring' | 'project';
}

export type ParseResult = { ok: true; value: ContactSubmission } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 5000;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseContactSubmission(form: Record<string, unknown>): ParseResult {
  const name = text(form.name);
  const email = text(form.email);
  const company = text(form.company);
  const message = text(form.message);
  const intent = text(form.intent);

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'A valid email is required.' };
  if (!message) return { ok: false, error: 'Message is required.' };
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: 'Message is too long.' };
  }
  if (intent !== 'hiring' && intent !== 'project') {
    return { ok: false, error: 'Unknown intent.' };
  }

  return { ok: true, value: { name, email, company, message, intent } };
}
