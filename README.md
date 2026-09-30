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
