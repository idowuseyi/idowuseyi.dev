import type { APIRoute } from 'astro';
import { parseContactSubmission, type ContactSubmission } from '../../lib/contact';

export const prerender = false;

async function deliver(submission: ContactSubmission, env: Env): Promise<Response> {
  const { name, email, company, message, intent } = submission;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'idowuseyi.dev <noreply@idowuseyi.dev>',
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `[${intent}] ${name}${company ? ` — ${company}` : ''}`,
      text: `${name} <${email}>${company ? `\nCompany: ${company}` : ''}\nIntent: ${intent}\n\n${message}`,
    }),
  });
}

export const POST: APIRoute = async ({ request }) => {
  const form = Object.fromEntries(await request.formData());

  // Honeypot: real visitors never fill a hidden field. Accept silently so
  // bots can't distinguish rejection from success, and return before ever
  // touching the Workers runtime env or the Resend call below.
  if (typeof form.website === 'string' && form.website.trim() !== '') {
    return new Response(null, { status: 202 });
  }

  const parsed = parseContactSubmission(form);
  if (!parsed.ok) {
    return new Response(parsed.error, { status: 400 });
  }

  // Resolved dynamically, and only once the submission is known-genuine and
  // valid: `cloudflare:workers` only exists inside the Workers runtime, so
  // deferring the import keeps the honeypot/validation paths (and their
  // unit tests) free of any dependency on that runtime.
  const { env } = await import('cloudflare:workers');
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    return new Response('Contact delivery is not configured.', { status: 500 });
  }

  const response = await deliver(parsed.value, env);
  if (!response.ok) {
    return new Response('Could not deliver the message.', { status: 502 });
  }

  return new Response(null, { status: 204 });
};
