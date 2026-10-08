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

**Pre-launch requirement: register the domain.** `idowuseyi.dev` is the
canonical domain throughout this project (`astro.config.mjs`, the canonical and
og:url tags, the sitemap) but is **not yet registered**. Buy it, connect it to
Cloudflare, and point it at this Worker before launch. Until then the site is
reachable only on its `workers.dev` URL, and the canonical tags point nowhere.

**Pre-launch requirement: verify the Resend SENDING domain.**
`src/pages/api/contact.ts` sends `from: 'idowuseyi.dev <noreply@idowuseyi.dev>'`,
so `idowuseyi.dev` must appear under **Domains** in Resend with status
**Verified** — SPF and DKIM records added to Cloudflare DNS and confirmed.

Resend's inbound **receiving** feature is a different thing and does **not**
satisfy this. Receiving lets Resend accept mail *at* the domain; sending
verification proves ownership so Resend may send *as* the domain. The contact
form only sends.

Set those DNS records to **DNS only (grey cloud)** in Cloudflare — proxying
breaks mail records. Unverified, Resend returns 403 on every send, every
submission fails, and the site looks correctly configured.

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

## Cloudflare Workers Builds

The Workers Builds integration **must run `npm run build` before its deploy
command.** Set it in the dashboard under the Worker's Settings → Build →
"Build command"; an empty build command fails every time with:

    ✘ [ERROR] Missing entry-point to Worker script or to assets directory

That error is misleading. The entry point is not missing from the config — it
is generated. `wrangler.jsonc` in this repo carries no `main` and no `assets`
on purpose, because `astro build` (through `@astrojs/cloudflare`) writes:

  - `dist/server/wrangler.json` — the complete config, with `main: entry.mjs`
    and `assets.directory: ../client`
  - `.wrangler/deploy/config.json` — a redirect pointing wrangler at it

`.wrangler/` is gitignored, so neither file reaches the build container. With
no build step, wrangler falls back to the bare `wrangler.jsonc` and finds
nothing to deploy. Reproduce locally by moving `dist/` aside and running
`npx wrangler versions upload --dry-run`.

`versions upload` is the preview path used for pull requests. The production
branch should deploy with `npx wrangler deploy`.

## Regenerating a diagram

Diagrams under `src/diagrams/` (e.g. `ko-os.svg`) are authored as Mermaid
source (`.mmd`) and compiled to a themed, static SVG that's committed to the
repo. `Diagram.astro` inlines that committed SVG at build time via Vite's
`import.meta.glob` (so no filesystem path is resolved at render time) —
regenerating the SVG itself is **not** part of the normal install or build.

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

**One open npm audit finding, assessed and accepted.** `npm audit` reports
`http-cache-semantics` (high) four times — once directly and three more as it
propagates up through `astro` to `@astrojs/cloudflare` and `@astrojs/mdx`. It is
a single advisory, not four problems.

The advisory is cross-user cached-response disclosure via `max-stale` handling.
Exploiting it needs a shared HTTP cache serving multiple users; Astro uses the
package at build time and it is not part of the deployed Worker, so there is no
such cache in this project's path. **No patched release exists** — nothing above
`4.2.0` is published except two betas — and every fix npm offers is a
semver-major bump that would move `astro` to a different major.

Re-check when a patched `http-cache-semantics` ships, or when Astro bumps its
own dependency.

`@lhci/cli` is deliberately NOT a devDependency for the same reason: its
Lighthouse/Puppeteer tree carried 14 further high-severity advisories with no
patched release. None were exploitable here — `extract-zip` symlink traversal
needs a malicious archive and it only ever extracts Chrome from Google,
`basic-ftp` needs a malicious FTP server it never contacts — but keeping them in
the lockfile made `npm audit` unreadable, which is how a genuine future
vulnerability gets missed. CI fetches the tool with `npx --yes` instead.


**Medium links are not link-checked.** `medium.com` serves a Cloudflare bot
challenge to automated requests, so every Medium URL returns 403 to
`linkinator` regardless of whether the article exists. Verified: the two
Medium posts in `src/content/posts/` both 403 to curl while the Dev.to post
returns 200, so this is a blanket block rather than a dead link. `medium.com`
is therefore in the CI link-check skip list. Those URLs need a manual
browser check if one is ever in doubt.


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

**`linkinator` skips `idowuseyi.dev` until the domain goes live.** The built
output's canonical/og/sitemap links all point at `https://idowuseyi.dev/`,
but the DNS cutover to that domain is a later plan item, so the domain isn't
live yet and every such link would otherwise fail the CI link check for a
reason that isn't a defect in the build. `.github/workflows/ci.yml` passes
`idowuseyi.dev` to linkinator's `--skip` list (alongside `linkedin.com`,
skipped for unrelated rate-limiting reasons) specifically to paper over this.
**Fix at cutover:** remove `idowuseyi.dev` from that `--skip` list once the
domain resolves, so the link check starts actually verifying those links
again.
