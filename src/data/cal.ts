/**
 * Cal.com booking link, e.g. "idowuseyi/20min".
 *
 * Deliberately empty: as of this task, `cal.com/idowuseyi` and
 * `cal.com/idowuseyi/20min` both 404 — there is no Cal.com account yet.
 * `BookCall.astro` only renders the booking dialog and intercepts
 * `[data-cta="book"]` clicks when this is non-empty; while it's empty, the
 * anchor's own `href="#contact"` takes over and visitors land on the
 * working contact form instead of a 404 inside a modal.
 *
 * To activate booking once the Cal.com account exists, set this to the real
 * slug (e.g. 'idowuseyi/20min'). No other change is required.
 */
export const CAL_LINK = '';
