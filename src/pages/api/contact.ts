import type { APIRoute } from 'astro';
import { parseContactSubmission, type ContactSubmission } from '../../lib/contact';

export const prerender = false;

// A native (no-JS) HTML form POST sends `Accept: text/html,...` because the
// browser is navigating; the enhanced `fetch()` path in ContactForm.astro
// doesn't set that header. Used to decide between a body response (for the
// fetch path, which reads the response itself) and a redirect (for a plain
// navigation, which needs somewhere to land instead of a bare status page).
function wantsHtml(request: Request): boolean {
  return (request.headers.get('accept') ?? '').includes('text/html');
}

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

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
    if (wantsHtml(request)) return seeOther('/?error=1#contact');
    return new Response(parsed.error, { status: 400 });
  }

  // Resolved dynamically, and only once the submission is known-genuine and
  // valid: `cloudflare:workers` only exists inside the Workers runtime, so
  // deferring the import keeps the honeypot/validation paths (and their
  // unit tests) free of any dependency on that runtime.
  const { env } = await import('cloudflare:workers');
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    // The specific cause is only logged server-side — the response body
    // must not disclose whether secrets are configured to an arbitrary caller.
    console.error('Contact delivery is not configured: missing RESEND_API_KEY or CONTACT_TO_EMAIL.');
    if (wantsHtml(request)) return seeOther('/?error=1#contact');
    return new Response('Could not send your message. Please email me instead.', { status: 500 });
  }

  const response = await deliver(parsed.value, env);
  if (!response.ok) {
    if (wantsHtml(request)) return seeOther('/?error=1#contact');
    return new Response('Could not deliver the message.', { status: 502 });
  }

  if (wantsHtml(request)) return seeOther('/?sent=1#contact');
  return new Response(null, { status: 204 });
};
