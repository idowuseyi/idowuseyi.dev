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
