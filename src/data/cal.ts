/**
 * Cal.com booking link, as "<user>/<event-slug>".
 *
 * `BookCall.astro` renders the booking dialog and intercepts
 * `[data-cta="book"]` clicks only when this is non-empty. While it is empty,
 * each anchor's own href takes over and visitors land on the working contact
 * form instead of a 404 inside a modal — so booking degrades to the form
 * rather than breaking. The header's href is `/#contact`, so from a blog page
 * that degradation is a navigation to the homepage form, not a same-page
 * scroll.
 *
 * Verified live 2026-10-01: https://cal.com/oluwaseyi-idowu/intro-call
 */
export const CAL_LINK = 'oluwaseyi-idowu/intro-call';
