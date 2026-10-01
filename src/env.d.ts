/// <reference types="astro/client" />

/**
 * Minimal binding surface this Worker actually reads. `RESEND_API_KEY` and
 * `CONTACT_TO_EMAIL` are secrets set post-deploy with
 * `npx wrangler secret put <NAME>` (see README.md) — they are never
 * declared in wrangler.jsonc, so `wrangler types` has nothing to generate
 * them from. This interface is hand-written instead of generated.
 */
interface Env {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
}

/**
 * Why this isn't `Astro.locals.runtime.env` (the first, more obvious typed
 * approach): the installed @astrojs/cloudflare (14.3.3) has removed that
 * accessor. `createLocals()` in
 * node_modules/@astrojs/cloudflare/dist/utils/cf-helpers.js defines
 * `locals.runtime` as a getter-only object whose `env` property
 * unconditionally throws:
 *
 *   get env() {
 *     throw new Error(
 *       `Astro.locals.runtime.env has been removed in Astro v6. Use
 *       'import { env } from "cloudflare:workers"' instead.`
 *     );
 *   }
 *
 * So typing `locals.runtime.env` would only produce a type that compiles and
 * crashes every request at runtime — not a usable fix. The adapter's own
 * `fetch.js` uses the `cloudflare:workers` import internally, so the handler
 * does the same, typed against the `Env` interface above rather than `any`.
 * `@cloudflare/workers-types` / `wrangler types` aren't installed in this
 * project (running `wrangler types` would add ~16k lines of unrelated
 * runtime typings for two string secrets), so the module is declared
 * ambiently here instead.
 *
 * This declaration intentionally lives in a plain ambient script file (no
 * top-level `import`/`export`, so no `export {}`) rather than inside a
 * `declare global { ... }` block in a module file: under the TypeScript 7.0.2
 * compiler this project pins, an `export {}` + `declare global` file fails to
 * make a sibling `declare module 'cloudflare:workers'` resolvable for
 * importers elsewhere (verified empirically — `tsc` reports TS2307 on the
 * import even though the ambient module is declared), while the same
 * declaration in a non-module ambient file resolves correctly.
 */
declare module 'cloudflare:workers' {
  export const env: Env;
}
