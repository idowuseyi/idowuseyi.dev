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

// Every failure exit (validation, missing config, delivery failure, or a
// caught throw) routes through here, so the HTML-accepting/fetch split only
// has to be gotten right in one place instead of at every call site.
function errorResponse(request: Request, status: number, body: string): Response {
  if (wantsHtml(request)) return seeOther('/contact-error');
  return new Response(body, { status });
}

// Mirror of errorResponse for the single success exit.
function successResponse(request: Request): Response {
  if (wantsHtml(request)) return seeOther('/thanks');
  return new Response(null, { status: 204 });
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
      // Requires idowuseyi.dev to be a VERIFIED SENDING domain in Resend
      // (SPF + DKIM in Cloudflare DNS, set to DNS-only). Resend's inbound
      // "receiving" feature is separate and does not satisfy this.
      // Unverified, every send returns 403. reply_to below is the submitter,
      // so replies route to them rather than to this address.
      from: 'idowuseyi.dev <noreply@idowuseyi.dev>',
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `[${intent}] ${name}${company ? ` — ${company}` : ''}`,
      text: `${name} <${email}>${company ? `\nCompany: ${company}` : ''}\nIntent: ${intent}\n\n${message}`,
    }),
  });
}

export const POST: APIRoute = async ({ request }) => {
  let form: Record<string, FormDataEntryValue>;
  try {
    form = Object.fromEntries(await request.formData());
  } catch (err) {
    // A malformed body (bad multipart boundary, truncated upload, etc.)
    // throws out of formData() before any validation runs. Must not escape
    // to Astro's generic 500 — a no-JS visitor needs the same /contact-error
    // landing every other failure path gives them.
    console.error('Contact submission body could not be read:', err);
    return errorResponse(request, 400, 'Could not read your submission. Please try again.');
  }

  // Honeypot: real visitors never fill a hidden field. Accept silently so
  // bots can't distinguish rejection from success, and return before ever
  // touching the Workers runtime env or the Resend call below.
  if (typeof form._hp === 'string' && form._hp.trim() !== '') {
    return new Response(null, { status: 202 });
  }

  const parsed = parseContactSubmission(form);
  if (!parsed.ok) {
    return errorResponse(request, 400, parsed.error);
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
    return errorResponse(request, 500, 'Could not send your message. Please email me instead.');
  }

  let response: Response;
  try {
    response = await deliver(parsed.value, env);
  } catch (err) {
    // A network failure (DNS, TLS, an outright Resend outage) throws out of
    // fetch() rather than resolving with a non-ok status. Must not escape to
    // Astro's generic 500 either, and must not be mistaken for success —
    // route it through the same failure path as a non-ok Resend response.
    console.error('Contact delivery request failed:', err);
    return errorResponse(request, 502, 'Could not deliver the message.');
  }

  if (!response.ok) {
    return errorResponse(request, 502, 'Could not deliver the message.');
  }

  return successResponse(request);
};
