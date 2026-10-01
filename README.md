# idowuseyi.dev

Oluwaseyi Idowu's portfolio site. Astro, static output, deployed to Cloudflare.

## Commands

```
npm run dev       # local dev server
npm run build     # astro build (static output to dist/)
npm test          # astro sync && vitest run
npm run preview   # wrangler dev, previewing the built output
npm run deploy    # astro build && wrangler deploy
```

## Configuration

`src/pages/api/contact.ts` (`POST /api/contact`) is this project's first
on-demand route (`export const prerender = false`), so the build now emits a
Worker, not purely static assets. It delivers submissions through
[Resend](https://resend.com) and needs two secrets, set **after the first
deploy** (a Worker has to exist before `wrangler secret put` can target it):

```
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_TO_EMAIL
```

- `RESEND_API_KEY` — a Resend API key with permission to send email.
- `CONTACT_TO_EMAIL` — the inbox that receives contact-form submissions.

Never commit real values for these; `wrangler secret put` prompts for the
value interactively and stores it only in the Cloudflare account's secret
store.

**Pre-launch requirement: edge rate limiting on `/api/contact`.** The only
abuse control in the Worker today is a honeypot field, which a scripted
attacker bypasses trivially. `/api/contact` is a public, unauthenticated POST
endpoint that triggers outbound email on every valid submission, so without
a rate limit it is exposed to inbox spam and to exhausting the Resend
account's sending quota. Before the site goes live, configure a Cloudflare
WAF rate-limiting rule on `/api/contact` (Security > WAF > Rate limiting
rules in the dashboard, or the equivalent `wrangler`/Terraform resource).
This control belongs at the edge rather than in the Worker: an in-Worker
in-memory limiter doesn't work across isolates, and a KV- or
Turnstile-backed limiter needs remote provisioning that isn't available in
this environment. Edge rate limiting also blocks abuse before a Worker
invocation is ever billed, which an in-Worker check cannot do.

Call booking (`src/components/BookCall.astro`) is feature-flagged on
`CAL_LINK` in `src/data/cal.ts`, currently `''` because the Cal.com account
doesn't exist yet. While it's empty, the "Book a 20-min call" CTA falls
through to its `href="#contact"` and scrolls to the contact form instead of
opening a dialog. Setting `CAL_LINK` to the real slug (e.g. `'idowuseyi/20min'`)
is the only change needed to activate the booking dialog.

## Regenerating a diagram

Diagrams under `src/diagrams/` (e.g. `ko-os.svg`) are authored as Mermaid
source (`.mmd`) and compiled to a themed, static SVG that's committed to the
repo. `Diagram.astro` just reads and inlines that committed SVG at build
time — regenerating it is **not** part of the normal install or build.

```
npm run diagrams
```

This fetches `@mermaid-js/mermaid-cli` (and, transitively, a Chromium binary
via Puppeteer) on demand with `npx` the first time it's run, renders
`ko-os.mmd` to `ko-os.svg`, then runs `scripts/theme-diagram.mjs` to retarget
mermaid's hardcoded colours onto this project's design tokens
(`src/styles/tokens.css`). Deliberately not a `devDependency`: `npm ci`
should never need to download a browser, since the compiled SVG is already
committed and CI never invokes this script.

## Known gaps

**Type checking is not gated in CI.** The plan's intent was `astro check`,
but that cannot run under this project's pinned TypeScript (`^7.0.2`) —
confirmed empirically, not assumed. Plain `tsc --noEmit` does run, but
currently reports 7 errors that are tooling artifacts rather than real
defects: 6 are `TS2307: Cannot find module '*.astro'` because `tsc` cannot
parse Astro components at all, and 1 is `getViteConfig`'s return type not
declaring Vitest's `test` key (see `vitest.config.ts`). A gate that cannot
see the component code it claims to check would be false confidence, so it
has been left out of CI rather than added as a check that always "passes"
without verifying anything. **Fix:** align the TypeScript version with one
`astro check` supports, then wire `astro check` (not bare `tsc`) into CI.

**`Diagram.astro` fails inside the real Cloudflare build pipeline.**
`Diagram.astro` resolves the SVG it inlines with
`fileURLToPath(new URL(`../diagrams/${name}.svg`, import.meta.url))`. That
resolution works under Vitest/Node (every existing test using the component
passes) and was never exercised against a real `astro build` before Task 8,
because no page imported `CaseStudy` (and therefore `Diagram`) until the
homepage was assembled. Once `index.astro` renders the case studies,
`npm run build` fails while prerendering `/`:

```
Error: Failed to prerender https://idowuseyi.dev/: Invalid URL string.
```

Root cause, confirmed with a temporary debug probe inside the Cloudflare
adapter's prerender environment: `import.meta.url` is `undefined` in that
environment (it runs component frontmatter inside workerd via the adapter's
own preview/prerender server, not plain Node), so
`new URL(relative, undefined)` throws before `readFileSync` ever runs. The
failure reproduces with a trivial placeholder SVG and with `<Diagram>` used
directly on a page with no MDX/content-collection involvement at all, so it
is specific to that path-resolution strategy, not to the diagram's content
or to MDX. This blocks `npm run build`, and therefore blocks the link check
and Lighthouse budget steps in CI, until it's fixed. **Fix (not applied
here — `Diagram.astro` is out of scope for the task that found this):**
resolve the SVG without depending on `import.meta.url` inside that
environment — for example, import each diagram's SVG as a Vite `?raw`
asset at the top of the module instead of reading it from disk by a
runtime-computed path.
