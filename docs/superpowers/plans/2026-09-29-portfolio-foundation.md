# Portfolio Foundation & Conversion Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-file `index.html` with an Astro site that lands the AI-systems positioning, presents three verifiable case studies, and converts visitors into booked calls or CV downloads.

**Architecture:** Astro 7 static site with the Cloudflare adapter, deployed to the existing Worker. Content (case studies, experience) lives in typed content collections and data modules, never in markup. Zero JavaScript ships by default; the only client scripts are a progressively-enhanced contact form and a lazily-injected Cal.com embed, both gated behind user interaction. Components are unit-tested with Vitest through Astro's Container API, and the performance budget is asserted in CI.

**Tech Stack:** Astro 7.3.x · @astrojs/cloudflare 14.3.x · @astrojs/mdx 8.0.x · @astrojs/sitemap · Vitest 5.0.x · Wrangler 4.143.x · Node 24 · vanilla CSS custom properties · Fontsource (Geist / Geist Mono)

**Spec:** `docs/superpowers/specs/2026-09-29-portfolio-redesign-design.md`

**Covers spec phases 1–2.** Phases 3 (blog), 4 (RAG demo + analytics) and 5 (cutover) are separate plans.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24**, package manager `npm`. Commands run from the repo root.
- **Astro 7.3.5** or later. Content config lives at `src/content.config.ts` (NOT `src/content/config.ts`). Loaders come from `astro/loaders`; zod comes from `astro/zod`; entries render via `render(entry)` imported from `astro:content` (NOT `entry.render()`).
- **Dark theme only.** No light-mode styles, no theme toggle, no `prefers-color-scheme` branches.
- **Accent `#4ADE80` is reserved exclusively** for calls to action, live/availability
  indicators and diagram highlights. It must never be used for body text, borders, or
  decoration. **One declared exception:** the accessibility focus ring, which consumes
  accent through the dedicated `--focus` token (`--focus: var(--accent)`) rather than
  referencing `--accent` directly. A focus indicator is a functional state signal, not
  decoration; routing it through its own token keeps the exception explicit in the code
  and lets focus colour diverge later without touching CTAs. Nothing other than
  `:focus-visible` may use `--focus`.
- **Tenure copy is exactly `3+ years`.** The string `5+ years` must not appear anywhere in `src/`. This is asserted by a test.
- **Every project must satisfy the evidence rule** (Task 3): a `liveUrl`, a `repoUrl`, or `evidence: 'writeup-only'` with a stated reason. The build fails otherwise.
- **Performance budget, asserted in CI:** LCP < 1.5s on simulated 3G, < 30KB blocking JS on the homepage, Lighthouse >= 95 in all four categories.
- **No hero video.** `assets/video.mp4` is deleted in Task 1 and must not be reintroduced.
- **All motion respects `prefers-reduced-motion: reduce`** by disabling entirely, not by shortening.
- **Canonical domain is `idowuseyi.dev`.**
- **Never commit secrets.** `RESEND_API_KEY` and `CONTACT_TO_EMAIL` are Wrangler secrets, referenced only via `Astro.locals.runtime.env`.

### Deliberate refinements to the spec

The spec's implementation sketch bends in three places on contact with Astro 7. Each is intentional:

| Spec said | Plan does | Why |
|---|---|---|
| `functions/api/contact.ts` | `src/pages/api/contact.ts` with `export const prerender = false` | Pages-style `functions/` is not how the Astro Cloudflare adapter routes. This is the adapter-idiomatic location. |
| `islands/ContactForm.tsx` (React) | Plain Astro component with an inline `<script>` | A React runtime is ~45KB against a 30KB budget, for a four-field form. Vanilla keeps the budget and works without JS. React is not installed at all in this plan. |
| Mermaid rendered at build time | Mermaid compiled at **author** time via `npm run diagrams`, SVGs committed | Build-time rendering drags Puppeteer into CI. Author-time compilation gives identical zero-JS output with a fast, dependency-light CI. |

---

## File Structure

| Path | Responsibility |
|---|---|
| `astro.config.mjs` | Integrations, adapter, site URL |
| `vitest.config.ts` | Test config via Astro's `getViteConfig` |
| `wrangler.jsonc` | Worker name, compatibility, assets |
| `src/styles/tokens.css` | The entire design system: colour, type, spacing, motion tokens |
| `src/layouts/BaseLayout.astro` | HTML shell, fonts, meta, global styles |
| `src/schemas/project.ts` | Zod schema for case studies, including the evidence rule. Pure, unit-testable |
| `src/content.config.ts` | Wires the schema to the `projects` collection |
| `src/data/profile.ts` | Name, headline, pitch, competencies, proof metrics, CTA labels |
| `src/data/experience.ts` | The eight roles for the timeline |
| `src/components/Cta.astro` | The dual-CTA pair. One definition, used in three placements |
| `src/components/Hero.astro` | Above-the-fold block |
| `src/components/ProofStrip.astro` | Metrics + credentials row |
| `src/components/MetricRow.astro` | Three-metric display used inside case studies |
| `src/components/Diagram.astro` | Inlines a committed SVG, themed by CSS tokens |
| `src/components/CaseStudy.astro` | One case study's full presentation |
| `src/components/Timeline.astro` | Condensed experience list |
| `src/components/ContactForm.astro` | Form markup + progressive-enhancement script |
| `src/components/BookCall.astro` | Dialog + lazy Cal.com injection |
| `src/lib/contact.ts` | `parseContactSubmission` — pure validation, unit-testable |
| `src/pages/api/contact.ts` | Worker endpoint; delegates to `src/lib/contact.ts` |
| `src/pages/index.astro` | Assembles the homepage in the spec's section order |
| `src/diagrams/*.mmd` + `*.svg` | Mermaid sources and their committed compiled output |
| `src/content/projects/*.mdx` | The three case studies |
| `tests/*.test.ts` | Vitest suites, one per unit |
| `.github/workflows/ci.yml` | Build, test, link check, Lighthouse budget |

---

## Task 1: Scaffold the Astro + Cloudflare toolchain

Establishes the build, the test harness and CI. Deliverable: a deployable site that builds green and has a passing component test.

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` (modify), `src/components/Brand.astro`, `src/pages/index.astro`, `.github/workflows/ci.yml`
- Modify: `wrangler.jsonc`
- Delete: `assets/video.mp4`, `index.html`
- Test: `tests/brand.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm run build`, `npm test`, and `npm run dev`. Every later task depends on the Vitest + Container API harness established here.

- [ ] **Step 1: Initialise the package and install dependencies**

```bash
cd /home/dokimazo-tech/dev247/personal/seyi.dev
npm init -y
npm pkg set name="idowuseyi-dev" private=true type="module"
npm pkg delete main scripts.test
npm install astro@^7.3.5 @astrojs/cloudflare@^14.3.3 @astrojs/mdx@^8.0.2 @astrojs/sitemap @fontsource-variable/geist @fontsource-variable/geist-mono
npm install -D vitest@^5.0.2 wrangler@^4.143.1 typescript
```

- [ ] **Step 2: Write the failing test**

Create `tests/brand.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Brand from '../src/components/Brand.astro';

test('brand renders the canonical domain', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Brand);
  expect(html).toContain('idowuseyi.dev');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/brand.test.ts`
Expected: FAIL — cannot resolve `../src/components/Brand.astro`, and no `vitest.config.ts` exists to teach Vitest about `.astro` files.

- [ ] **Step 4: Write the configuration and the component**

Create `vitest.config.ts`:

```ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://idowuseyi.dev',
  adapter: cloudflare(),
  integrations: [mdx(), sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Create `src/components/Brand.astro`:

```astro
---
const domain = 'idowuseyi.dev';
---
<a class="brand" href="/" aria-label={`${domain} home`}>{domain}</a>

<style>
  .brand {
    font-family: var(--font-mono, monospace);
    font-size: 0.9rem;
    color: var(--text, #EDEEF0);
    text-decoration: none;
    letter-spacing: -0.01em;
  }
</style>
```

Create `src/pages/index.astro`:

```astro
---
import Brand from '../components/Brand.astro';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Oluwaseyi Idowu — AI Systems Engineer</title>
  </head>
  <body>
    <Brand />
  </body>
</html>
```

Add scripts:

```bash
npm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.preview="wrangler dev" scripts.test="astro sync && vitest run" scripts.deploy="astro build && wrangler deploy"
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/brand.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Replace the legacy site and confirm the build**

```bash
git rm -q index.html assets/video.mp4
rmdir assets 2>/dev/null || true
git mv Resume.pdf public/resume.pdf 2>/dev/null || { mkdir -p public && git mv Resume.pdf public/resume.pdf; }
npm run build
```

Expected: build completes, `dist/` is produced. The legacy site remains recoverable on `main` and in history.

- [ ] **Step 7: Update wrangler.jsonc and verify the adapter agrees with it**

The Cloudflare adapter generates the Worker entry and expects to own the
`main` and `assets` wiring. Keep this file minimal and let the adapter fill in
the rest rather than hand-writing output paths:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "oluwaseyi",
  "compatibility_date": "2026-06-02",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true }
}
```

Verify the build output and this config actually line up before moving on:

```bash
npm run build
npx wrangler deploy --dry-run
```

Expected: the dry run resolves a Worker entry and an assets directory without
error. If it reports a missing entry point, add the `main` and `assets` keys
exactly as the adapter's build output reports them — do not guess the path.

- [ ] **Step 8: Add the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
    branches: [redesign/v2, main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 9: Update .gitignore and commit**

```bash
printf '\n# build output\ndist\n.astro\nnode_modules\n' >> .gitignore
git add -A
git commit -m "feat: scaffold Astro 7 + Cloudflare toolchain, retire legacy page

Replaces the single-file index.html with an Astro project wired to the
Cloudflare adapter, MDX and sitemap integrations, plus a Vitest harness
using Astro's Container API. Deletes the 4.6MB hero video, which alone
exceeded the LCP budget."
```

---

## Task 2: Design tokens and base layout

Encodes the design system as CSS custom properties and asserts it with a test, so a later task cannot quietly drift the palette.

**Files:**
- Create: `src/styles/tokens.css`, `src/layouts/BaseLayout.astro`, `src/lib/contrast.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: the Vitest harness from Task 1.
- Produces:
  - `src/styles/tokens.css` exposing `--base --surface --border --text --muted --accent --focus --font-sans --font-mono --step--1 --step-0 --step-1 --step-2 --step-3 --space-s --space-m --space-l --space-xl --radius --motion-fast --motion-base`
  - `BaseLayout.astro` with props `{ title: string; description: string; canonicalPath?: string }` and a default slot.
  - `src/lib/contrast.ts` exporting `contrastRatio(hexA: string, hexB: string): number`

- [ ] **Step 1: Write the failing test**

Create `tests/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { contrastRatio } from '../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} is not defined`);
  return match[1].trim();
}

describe('design tokens', () => {
  test('defines the exact spec palette', () => {
    expect(token('base')).toBe('#08090A');
    expect(token('surface')).toBe('#101113');
    expect(token('border')).toBe('#1E2023');
    expect(token('text')).toBe('#EDEEF0');
    expect(token('muted')).toBe('#8A8F98');
    expect(token('accent')).toBe('#4ADE80');
  });

  test('body text on base meets WCAG AAA', () => {
    expect(contrastRatio(token('text'), token('base'))).toBeGreaterThanOrEqual(7);
  });

  test('muted text on base meets WCAG AA', () => {
    expect(contrastRatio(token('muted'), token('base'))).toBeGreaterThanOrEqual(4.5);
  });

  test('base text on an accent button meets WCAG AA', () => {
    expect(contrastRatio(token('base'), token('accent'))).toBeGreaterThanOrEqual(4.5);
  });

  test('declares no light-mode branch', () => {
    expect(css).not.toContain('prefers-color-scheme');
  });

  test('disables motion under prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — cannot resolve `../src/lib/contrast`.

- [ ] **Step 3: Write the contrast helper**

Create `src/lib/contrast.ts`:

```ts
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Write the tokens**

Create `src/styles/tokens.css`:

```css
:root {
  /* colour — accent is reserved for actions and live signals only */
  --base: #08090A;
  --surface: #101113;
  --border: #1E2023;
  --text: #EDEEF0;
  --muted: #8A8F98;
  --accent: #4ADE80;

  /* Declared exception to the accent-reservation rule: the a11y focus ring.
     Only :focus-visible may consume this token. */
  --focus: var(--accent);

  /* type */
  --font-sans: 'Geist Variable', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, monospace;
  --step--1: clamp(0.78rem, 0.76rem + 0.1vw, 0.83rem);
  --step-0: clamp(0.95rem, 0.92rem + 0.15vw, 1.05rem);
  --step-1: clamp(1.2rem, 1.1rem + 0.5vw, 1.45rem);
  --step-2: clamp(1.6rem, 1.4rem + 1vw, 2.2rem);
  --step-3: clamp(2.4rem, 1.9rem + 2.6vw, 4rem);

  /* space */
  --space-s: 0.5rem;
  --space-m: 1rem;
  --space-l: 2rem;
  --space-xl: clamp(4rem, 8vw, 7rem);
  --radius: 8px;

  /* motion */
  --motion-fast: 140ms;
  --motion-base: 300ms;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--base);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--step-0);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

.wrap {
  width: min(100% - 2.5rem, 1080px);
  margin-inline: auto;
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity var(--motion-base) var(--ease), transform var(--motion-base) var(--ease);
}

.reveal.is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  .reveal { opacity: 1; transform: none; }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/tokens.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 6: Write the base layout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '../styles/tokens.css';

interface Props {
  title: string;
  description: string;
  canonicalPath?: string;
}

const { title, description, canonicalPath = '/' } = Astro.props;
const canonical = new URL(canonicalPath, Astro.site ?? 'https://idowuseyi.dev');
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical.href} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical.href} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#08090A" />
  </head>
  <body>
    <slot />
    <script>
      const nodes = document.querySelectorAll('.reveal');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !('IntersectionObserver' in window)) {
        nodes.forEach((n) => n.classList.add('is-visible'));
      } else {
        const io = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }, { rootMargin: '0px 0px -10% 0px' });
        nodes.forEach((n) => io.observe(n));
      }
    </script>
  </body>
</html>
```

- [ ] **Step 7: Commit**

```bash
git add src/styles/tokens.css src/layouts/BaseLayout.astro src/lib/contrast.ts tests/tokens.test.ts
git commit -m "feat: design tokens and base layout, asserted by contrast tests

Encodes the Systems Dossier palette, type scale and motion rules as CSS
custom properties. Tests pin the exact hex values, assert WCAG AAA body
contrast, and fail the build if a light-mode branch is introduced."
```

---

## Task 3: Content schema and the evidence rule

The spec's central guarantee: no project can ship that a recruiter cannot verify. Implemented as a schema so violations fail the build.

**Files:**
- Create: `src/schemas/project.ts`, `src/content.config.ts`
- Test: `tests/project-schema.test.ts`

**Interfaces:**
- Consumes: the Vitest harness from Task 1.
- Produces:
  - `src/schemas/project.ts` exporting `projectSchema` (a Zod schema) and the type `Project`.
  - Frontmatter contract for `src/content/projects/*.mdx`:
    `title: string`, `kicker: string`, `role: string`, `order: number`, `blurb: string`, `tags: string[]` (>= 1), `metrics: { value: string; label: string }[]` (1–3), `diagram?: string`, plus the evidence fields below.
  - Evidence variants: `evidence: 'linked'` with at least one of `liveUrl` / `repoUrl`; or `evidence: 'writeup-only'` with `evidenceNote` of at least 20 characters **after trimming**.
  - `liveUrl` and `repoUrl` accept **http/https only** — a `javascript:` or `ftp:` URI is URL-shaped but not recruiter-verifiable, so it must fail validation.
  - Both branches are `.strict()`: an unrecognised frontmatter key is a validation error naming the key, so a typo such as `livUrl` fails loudly instead of being silently stripped. Verified against a real Astro build — the glob loader injects no extra keys. **Case studies in Task 5 must therefore carry only the fields named above.**
  - Collection name is `projects`, queried with `getCollection('projects')`.

- [ ] **Step 1: Write the failing test**

Create `tests/project-schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { projectSchema } from '../src/schemas/project';

const base = {
  title: 'RAG & Semantic Search',
  kicker: 'AI / Retrieval',
  role: 'Software Engineer — HNG / Telex',
  order: 2,
  blurb: 'Retrieval over thousands of documents with optimised context windows.',
  tags: ['Rust', 'ChromaDB'],
  metrics: [{ value: '1k+', label: 'Documents indexed' }],
};

describe('evidence rule', () => {
  test('accepts a project with only a live URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', liveUrl: 'https://demo.idowuseyi.dev',
    });
    expect(result.success).toBe(true);
  });

  test('accepts a project with only a repo URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', repoUrl: 'https://github.com/idowuseyi/rag',
    });
    expect(result.success).toBe(true);
  });

  test('rejects a linked project carrying neither URL', () => {
    const result = projectSchema.safeParse({ ...base, evidence: 'linked' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/liveUrl or repoUrl/);
    }
  });

  test('accepts writeup-only when a reason is given', () => {
    const result = projectSchema.safeParse({
      ...base,
      evidence: 'writeup-only',
      evidenceNote: 'Proprietary: KO Content Studios internal platform.',
    });
    expect(result.success).toBe(true);
  });

  test('rejects writeup-only with no reason', () => {
    const result = projectSchema.safeParse({ ...base, evidence: 'writeup-only' });
    expect(result.success).toBe(false);
  });

  test('rejects writeup-only with a token reason', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'writeup-only', evidenceNote: 'private',
    });
    expect(result.success).toBe(false);
  });

  test('rejects a malformed URL', () => {
    const result = projectSchema.safeParse({
      ...base, evidence: 'linked', repoUrl: 'github.com/idowuseyi/rag',
    });
    expect(result.success).toBe(false);
  });

  test('rejects more than three metrics', () => {
    const result = projectSchema.safeParse({
      ...base,
      evidence: 'linked',
      repoUrl: 'https://github.com/idowuseyi/rag',
      metrics: [
        { value: '1', label: 'a' }, { value: '2', label: 'b' },
        { value: '3', label: 'c' }, { value: '4', label: 'd' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/project-schema.test.ts`
Expected: FAIL — cannot resolve `../src/schemas/project`.

- [ ] **Step 3: Write the schema**

Create `src/schemas/project.ts`:

```ts
import { z } from 'astro/zod';

const metric = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const common = {
  title: z.string().min(1),
  kicker: z.string().min(1),
  role: z.string().min(1),
  order: z.number().int().positive(),
  blurb: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  metrics: z.array(metric).min(1).max(3),
  diagram: z.string().optional(),
};

// Only http/https are accepted evidence links: a `javascript:` or `ftp:` URI
// may be shaped like a URL but is not something a recruiter can click through
// to verify, so those schemes must fail validation, not just malformed
// strings. Zod 4's built-in `protocol` constraint on `.url()` handles this.
const evidenceUrl = z.string().url({ protocol: /^https?$/ });

const linked = z
  .object({
    ...common,
    evidence: z.literal('linked'),
    liveUrl: evidenceUrl.optional(),
    repoUrl: evidenceUrl.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.liveUrl || data.repoUrl), {
    message: 'A linked project must define liveUrl or repoUrl.',
    path: ['evidence'],
  });

const writeupOnly = z
  .object({
    ...common,
    evidence: z.literal('writeup-only'),
    // .min(20) alone counts raw characters, so a string of spaces would pass.
    // Trim first so the length check reflects actual justification content.
    evidenceNote: z
      .string()
      .trim()
      .min(20, 'A writeup-only project must explain why it has no public link.'),
  })
  .strict();

// A discriminated union keyed on `evidence` gives far better diagnostics than a
// plain union: Zod unions report every branch's failure, which is unreadable
// when these errors surface as build failures a human has to read. Zod (as
// re-exported by astro/zod) accepts a refined object schema as a
// discriminatedUnion branch here, so the `linked` branch's evidence-URL check
// still runs.
export const projectSchema = z.discriminatedUnion('evidence', [linked, writeupOnly]);

export type Project = z.infer<typeof projectSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/project-schema.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Wire the schema into a content collection**

Create `src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './schemas/project';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: projectSchema,
});

export const collections = { projects };
```

- [ ] **Step 6: Commit**

```bash
git add src/schemas/project.ts src/content.config.ts tests/project-schema.test.ts
git commit -m "feat: project content schema enforcing the evidence rule

Every case study must carry a live URL, a repo URL, or an explicit
writeup-only declaration with a stated reason. Anything else fails the
build, which is what stops the current site's core defect recurring."
```

---

## Task 4: Hero, CTA pair and proof strip

The eight seconds. Tests pin the factual corrections so they cannot regress.

**Files:**
- Create: `src/data/profile.ts`, `src/components/Cta.astro`, `src/components/ProofStrip.astro`, `src/components/Hero.astro`
- Test: `tests/hero.test.ts`

**Interfaces:**
- Consumes: `BaseLayout` and tokens from Task 2.
- Produces:
  - `src/data/profile.ts` exporting `profile` with shape `{ name: string; domain: string; availability: string; headline: string; subhead: string; pitch: string; competencies: string[]; proofMetrics: string[]; credentials: string[]; email: string; cvPath: string; github: string; linkedin: string }`
  - `Cta.astro` with props `{ placement: string; align?: 'start' | 'center' }`, rendering a `Book a 20-min call` anchor to `#book` and a `Download CV` anchor to `/resume.pdf`, each carrying `data-cta` and `data-placement` attributes used by Plan 3's analytics.
  - `Hero.astro` and `ProofStrip.astro` take no props.

- [ ] **Step 1: Write the failing test**

Create `tests/hero.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import Hero from '../src/components/Hero.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Hero);
});

describe('hero', () => {
  test('leads with the AI systems positioning', () => {
    expect(html).toContain('AI systems engineer');
    expect(html).toContain('I build the infrastructure agents run on');
  });

  test('states availability before skill', () => {
    expect(html).toMatch(/AVAILABLE FOR SENIOR \/ STAFF ROLES/i);
  });

  test('claims 3+ years and never 5+', () => {
    expect(html).toContain('3+ years');
    expect(html).not.toContain('5+ years');
  });

  test('carries the backend keyword surface', () => {
    for (const keyword of ['Rust', 'TypeScript', 'PostgreSQL', 'Redis', 'Axum', 'NestJS']) {
      expect(html).toContain(keyword);
    }
  });

  test('offers both CTAs at their two commitment levels', () => {
    expect(html).toContain('Book a 20-min call');
    expect(html).toContain('Download CV');
  });

  test('links the CV to a stable ungated path', () => {
    expect(html).toContain('href="/resume.pdf"');
    expect(html).toContain('download');
  });

  test('tags CTAs with a placement for analytics', () => {
    expect(html).toContain('data-placement="hero"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/hero.test.ts`
Expected: FAIL — cannot resolve `../src/components/Hero.astro`.

- [ ] **Step 3: Write the profile data**

Create `src/data/profile.ts`:

```ts
export const profile = {
  name: 'Oluwaseyi Idowu',
  domain: 'idowuseyi.dev',
  availability: 'Available for senior / staff roles',
  headline: 'AI systems engineer.',
  subhead: 'I build the infrastructure agents run on.',
  pitch:
    'Rust and TypeScript backends for LLM systems — multi-provider routing, retrieval-augmented search, and schema-validated structured output. 3+ years shipping production systems in health-tech, fintech and developer tooling.',
  competencies: [
    'Rust', 'TypeScript', 'Python', 'PostgreSQL', 'Redis',
    'Axum', 'NestJS', 'Distributed Systems', 'LLM Infrastructure',
  ],
  proofMetrics: ['1k+ docs indexed', '10k+ daily users', '99.9% reliability'],
  credentials: ['2× HNG Finalist', 'ALX Certified Backend Engineer'],
  email: 'dev@cerfic.com',
  cvPath: '/resume.pdf',
  github: 'https://github.com/idowuseyi',
  linkedin: 'https://www.linkedin.com/in/oluwaseyi-idowu-sunday',
} as const;
```

- [ ] **Step 4: Write the CTA pair**

Create `src/components/Cta.astro`:

```astro
---
import { profile } from '../data/profile';

interface Props {
  placement: string;
  align?: 'start' | 'center';
}

const { placement, align = 'start' } = Astro.props;
---
<div class="ctas" data-align={align}>
  <a class="cta cta--primary" href="#contact" data-cta="book" data-placement={placement}>
    Book a 20-min call
  </a>
  <a
    class="cta cta--secondary"
    href={profile.cvPath}
    download
    data-cta="cv"
    data-placement={placement}
  >
    Download CV <span aria-hidden="true">↓</span>
  </a>
</div>

<style>
  .ctas { display: flex; flex-wrap: wrap; gap: var(--space-m); }
  .ctas[data-align='center'] { justify-content: center; }

  .cta {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem 1.3rem;
    border-radius: var(--radius);
    font-size: var(--step--1);
    font-weight: 500;
    text-decoration: none;
    transition: transform var(--motion-fast) var(--ease),
                background-color var(--motion-fast) var(--ease);
  }

  .cta:hover { transform: translateY(-1px); }

  .cta--primary { background: var(--accent); color: var(--base); }
  /* Derived from --accent so it tracks the token rather than going stale. */
  .cta--primary:hover { background: color-mix(in srgb, var(--accent) 82%, white); }

  .cta--secondary {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .cta--secondary:hover { background: var(--surface); }
</style>
```

- [ ] **Step 5: Write the proof strip**

Create `src/components/ProofStrip.astro`:

```astro
---
import { profile } from '../data/profile';
---
<div class="proof">
  <ul class="proof__row mono">
    {profile.proofMetrics.map((metric) => <li>{metric}</li>)}
  </ul>
  <ul class="proof__row proof__row--muted mono">
    {profile.credentials.map((credential) => <li>{credential}</li>)}
  </ul>
</div>

<style>
  .proof {
    border-block: 1px solid var(--border);
    padding-block: var(--space-m);
    display: grid;
    gap: var(--space-s);
  }
  .proof__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-m) var(--space-l);
    list-style: none;
    font-size: var(--step--1);
  }
  .proof__row--muted { color: var(--muted); }
</style>
```

- [ ] **Step 6: Write the hero**

Create `src/components/Hero.astro`:

```astro
---
import Cta from './Cta.astro';
import { profile } from '../data/profile';
---
<section class="hero">
  <div class="wrap hero__inner">
    <p class="hero__pill mono">
      <span class="hero__dot" aria-hidden="true"></span>{profile.availability}
    </p>

    <h1 class="hero__title">
      {profile.headline}<br /><span class="hero__sub">{profile.subhead}</span>
    </h1>

    <p class="hero__pitch">{profile.pitch}</p>

    <Cta placement="hero" />

    <ul class="hero__competencies mono">
      {profile.competencies.map((item) => <li>{item}</li>)}
    </ul>
  </div>
</section>

<style>
  .hero { padding-block: clamp(4rem, 12vh, 8rem) var(--space-xl); }
  .hero__inner { display: grid; gap: var(--space-l); }

  .hero__pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
    padding: 0.35rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 100px;
    font-size: var(--step--1);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  .hero__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    /* Derived from --accent so it tracks the token rather than going stale. */
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .hero__title {
    font-size: var(--step-3);
    font-weight: 600;
    line-height: 1.05;
    letter-spacing: -0.03em;
    max-width: 18ch;
  }

  .hero__sub { color: var(--muted); }

  .hero__pitch {
    max-width: 62ch;
    color: var(--muted);
    font-size: var(--step-1);
    line-height: 1.55;
  }

  .hero__competencies {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    list-style: none;
    font-size: var(--step--1);
    color: var(--muted);
  }

  .hero__competencies li {
    padding: 0.3rem 0.65rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
</style>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/hero.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 8: Commit**

```bash
git add src/data/profile.ts src/components/Cta.astro src/components/ProofStrip.astro src/components/Hero.astro tests/hero.test.ts
git commit -m "feat: hero, dual CTA and proof strip

Leads with AI systems positioning while keeping the full backend keyword
surface in the body. Tests pin the 3+ years correction and both CTAs so
neither can regress."
```

---

## Task 5: Case study presentation and the three entries

**Files:**
- Create: `src/components/MetricRow.astro`, `src/components/Diagram.astro`, `src/components/CaseStudy.astro`, `src/diagrams/ko-os.mmd`, `src/content/projects/ko-os.mdx`, `src/content/projects/rag-search.mdx`, `src/content/projects/rust-services.mdx`
- Modify: `package.json` (add the `diagrams` script)
- Test: `tests/case-study.test.ts`

**Interfaces:**
- Consumes: `projectSchema` and the `projects` collection from Task 3; tokens from Task 2.
- Produces:
  - `MetricRow.astro` props: `{ metrics: { value: string; label: string }[] }`
  - `Diagram.astro` props: `{ name: string; caption: string }` — inlines `src/diagrams/<name>.svg`
  - `CaseStudy.astro` props: `{ project: CollectionEntry<'projects'> }`, rendering the entry body via `render(project)`

- [ ] **Step 1: Verify the three repositories are public and match their case studies**

These URLs were confirmed against the live GitHub account before this plan was
dispatched. Re-verify they still resolve and are public, then use them verbatim:

| Case study | Repository | Actual stack |
|---|---|---|
| KO OS | `https://github.com/idowuseyi/koos` | Next.js 16, React 19, TypeScript, Drizzle + PostgreSQL, Vercel AI SDK |
| RAG service | `https://github.com/idowuseyi/nest-rag-service` | **NestJS + TypeScript + ChromaDB + Docker** |
| Rust services | `https://github.com/idowuseyi/google-auth-paystack-plus` | Rust, Google OAuth, Paystack |

```bash
for r in koos nest-rag-service google-auth-paystack-plus; do
  gh repo view "idowuseyi/$r" --json isPrivate,url --jq '.url + " private=" + (.isPrivate|tostring)'
done
```

Expected: three public URLs.

**Do not describe the RAG service as Rust.** It is NestJS. An earlier draft of
this plan carried that error, inherited from an ambiguous sentence on the old
site that ran the Rust work and the RAG work together. The Rust evidence is
`google-auth-paystack-plus`; the RAG evidence is `nest-rag-service`.

- [ ] **Step 2: Write the failing test**

Create `tests/case-study.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import MetricRow from '../src/components/MetricRow.astro';

describe('metric row', () => {
  test('renders each metric value and label', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(MetricRow, {
      props: {
        metrics: [
          { value: '1k+', label: 'Documents indexed' },
          { value: '99.9%', label: 'Transaction reliability' },
        ],
      },
    });
    expect(html).toContain('1k+');
    expect(html).toContain('Documents indexed');
    expect(html).toContain('99.9%');
    expect(html).toContain('Transaction reliability');
  });

  test('sets metric values in the mono face so they read as measured', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(MetricRow, {
      props: { metrics: [{ value: '10k+', label: 'Daily users' }] },
    });
    expect(html).toMatch(/class="[^"]*mono[^"]*"[^>]*>\s*10k\+/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/case-study.test.ts`
Expected: FAIL — cannot resolve `../src/components/MetricRow.astro`.

- [ ] **Step 4: Write the presentation components**

Create `src/components/MetricRow.astro`:

```astro
---
interface Props {
  metrics: { value: string; label: string }[];
}
const { metrics } = Astro.props;
---
<dl class="metrics">
  {metrics.map((metric) => (
    <div class="metrics__item">
      <dt class="metrics__value mono">{metric.value}</dt>
      <dd class="metrics__label">{metric.label}</dd>
    </div>
  ))}
</dl>

<style>
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-m);
    border-block: 1px solid var(--border);
    padding-block: var(--space-m);
  }
  .metrics__value {
    font-size: var(--step-2);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .metrics__label {
    color: var(--muted);
    font-size: var(--step--1);
  }
</style>
```

Create `src/components/Diagram.astro`:

```astro
---
import { readFileSync } from 'node:fs';

interface Props {
  name: string;
  caption: string;
}

const { name, caption } = Astro.props;
const svg = readFileSync(`src/diagrams/${name}.svg`, 'utf8');
---
<figure class="diagram">
  <div class="diagram__canvas" set:html={svg} />
  <figcaption class="diagram__caption mono">{caption}</figcaption>
</figure>

<style>
  .diagram {
    margin-block: var(--space-l);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-l);
  }
  .diagram__canvas :global(svg) {
    width: 100%;
    height: auto;
    max-width: 100%;
  }
  .diagram__caption {
    margin-top: var(--space-m);
    color: var(--muted);
    font-size: var(--step--1);
  }
</style>
```

Create `src/components/CaseStudy.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { render } from 'astro:content';
import MetricRow from './MetricRow.astro';

interface Props {
  project: CollectionEntry<'projects'>;
}

const { project } = Astro.props;
const { Content } = await render(project);
const data = project.data;
---
<article class="case reveal">
  <header class="case__head">
    <p class="case__kicker mono">{data.kicker}</p>
    <h3 class="case__title">{data.title}</h3>
    <p class="case__role mono">{data.role}</p>
    <p class="case__blurb">{data.blurb}</p>
  </header>

  <MetricRow metrics={data.metrics} />

  <div class="case__body">
    <Content />
  </div>

  <ul class="case__tags mono">
    {data.tags.map((tag) => <li>{tag}</li>)}
  </ul>

  <div class="case__evidence">
    {data.evidence === 'linked' && data.liveUrl && (
      <a class="case__link case__link--live" href={data.liveUrl}>
        <span class="case__dot" aria-hidden="true"></span>Live demo
      </a>
    )}
    {data.evidence === 'linked' && data.repoUrl && (
      <a class="case__link" href={data.repoUrl}>Source code</a>
    )}
    {data.evidence === 'writeup-only' && (
      <p class="case__note">{data.evidenceNote}</p>
    )}
  </div>
</article>

<style>
  .case {
    padding-block: var(--space-xl);
    border-top: 1px solid var(--border);
    display: grid;
    gap: var(--space-l);
  }
  .case__head { display: grid; gap: var(--space-s); }
  .case__kicker {
    color: var(--muted);
    font-size: var(--step--1);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .case__title {
    font-size: var(--step-2);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .case__role { color: var(--muted); font-size: var(--step--1); }
  .case__blurb { max-width: 68ch; color: var(--muted); }
  .case__body { max-width: 68ch; display: grid; gap: var(--space-m); }
  .case__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    list-style: none;
    font-size: var(--step--1);
    color: var(--muted);
  }
  .case__tags li {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .case__evidence { display: flex; flex-wrap: wrap; gap: var(--space-m); align-items: center; }
  .case__link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: var(--step--1);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
    padding-bottom: 2px;
  }
  /* Accent is reserved for live indicators: only the live-demo link gets it. */
  .case__link:hover { border-color: var(--text); }
  .case__link--live:hover { border-color: var(--accent); }
  .case__link--live { color: var(--accent); }
  .case__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .case__note { color: var(--muted); font-size: var(--step--1); max-width: 56ch; }
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/case-study.test.ts`
Expected: PASS — 2 tests passed.

- [ ] **Step 6: Add the diagram pipeline and compile the KO OS diagram**

The Mermaid toolchain pulls Puppeteer, which downloads a Chromium binary on
install. The SVG is a **committed build artifact**, so the tool that produces it
is a dependency of *editing the diagram*, not of the project — keeping it out of
`devDependencies` is what makes the plan's "CI needs no browser" claim true.
Fetch it on demand instead:

```bash
npm pkg set scripts.diagrams="npx --yes @mermaid-js/mermaid-cli@^12.0.0 -i src/diagrams/ko-os.mmd -o src/diagrams/ko-os.svg -b transparent -t dark && node scripts/theme-diagram.mjs"
```

Raw `mmdc` output hardcodes its own colours, so it will not recolour with the
design system. `scripts/theme-diagram.mjs` rewrites the generated style block and
`defs` to consume `var(--text)`, `var(--surface)`, `var(--border)`, `var(--muted)`
and `currentColor`, with one `var(--accent)` highlight on the validation node.
Committing that script is what makes regeneration reproducible.

Create `src/diagrams/ko-os.mmd`. This mirrors the actual `src/lib/ai/` layer in
the repository — provider config, a provider-agnostic client, extracted prompts,
and Zod-validated structured output — not an aspirational architecture:

```
flowchart LR
  REQ[Feature request] --> PC[provider-config.ts]
  PC -->|selected model| CL[provider.ts<br/>Vercel AI SDK client]
  PR[prompts/strategy.ts<br/>prompts/calendar.ts<br/>prompts/chat.ts] --> CL
  CL --> G[Google]
  CL --> O[OpenAI]
  CL --> A[Anthropic]
  CL --> Z[Z.ai / OpenAI-compatible]
  G --> SV
  O --> SV
  A --> SV
  Z --> SV
  SV[strategy-schema.ts<br/>calendar-schema.ts<br/>Zod validation] -->|typed, or rejected| APP[Application]
  SV -.covered by.-> T[(21 unit test suites)]
```

Compile it:

```bash
npm run diagrams
```

Expected: `src/diagrams/ko-os.svg` is created. Commit the SVG — CI never runs Mermaid.

- [ ] **Step 7: Write the three case studies**

Create `src/content/projects/ko-os.mdx`:

```mdx
---
title: KO OS — provider-agnostic LLM platform
kicker: AI Systems
role: CTO & Engineer — KO Content Studios
order: 1
blurb: An AI content platform whose model layer is provider-agnostic and whose every LLM response is validated against a typed schema before it reaches the application.
tags: ['TypeScript', 'Next.js', 'Vercel AI SDK', 'Drizzle', 'PostgreSQL', 'Zod']
metrics:
  - { value: '4+', label: 'LLM providers routed' }
  - { value: '21', label: 'Unit test suites' }
  - { value: 'Typed', label: 'Structured output' }
diagram: ko-os
evidence: linked
repoUrl: 'https://github.com/idowuseyi/koos'
---

import Diagram from '../../components/Diagram.astro';

The hard problem was not calling a model. It was making model choice a
configuration concern rather than a code concern, and then refusing to let
unvalidated model output into the application.

<Diagram name="ko-os" caption="The src/lib/ai layer: provider config selects a model, extracted prompts feed a provider-agnostic client, and every response is validated against a Zod schema before the application sees it." />

**Provider-agnostic by construction.** `provider-config.ts` resolves which model
answers a request; `provider.ts` wraps the Vercel AI SDK so the call site never
names a vendor. Swapping Google for Anthropic is a config change, not a refactor.

**Prompts are modules, not string literals.** `prompts/strategy.ts`,
`prompts/calendar.ts` and `prompts/chat.ts` sit apart from the code that calls
them, so a prompt change is reviewable in a diff like any other change.

**Structured output is enforced, not hoped for.** Content strategy and calendar
responses are parsed through Zod schemas that have their own test suites. A
malformed generation fails at the boundary instead of propagating a plausible
but wrong object into the database.
```

Create `src/content/projects/rag-search.mdx`:

```mdx
---
title: RAG & semantic search service
kicker: Retrieval
role: Backend Engineer
order: 2
blurb: A document ingestion and semantic search service — chunking with overlap, vector storage in ChromaDB, and a documented API.
tags: ['NestJS', 'TypeScript', 'ChromaDB', 'Embeddings', 'Docker', 'Swagger']
metrics:
  - { value: '500', label: 'Words per chunk' }
  - { value: '50', label: 'Word overlap' }
  - { value: '3', label: 'Ingest formats' }
evidence: linked
repoUrl: 'https://github.com/idowuseyi/nest-rag-service'
---

Retrieval quality is decided at ingestion, not at query time. Chunk on the wrong
boundary and the right answer is split across two vectors that each look
mediocre.

This service ingests PDF, DOCX and TXT, extracts text, then chunks on words —
500 per chunk with a 50-word overlap — so context surviving a boundary is
retrievable from either side of it. Embeddings are stored in ChromaDB for
vector search.

Built on NestJS and containerised with Docker, with the API documented in
Swagger so it can be exercised directly rather than read about.
```

Create `src/content/projects/rust-services.mdx`:

```mdx
---
title: Rust authentication & payment service
kicker: Backend Systems
role: Software Engineer
order: 3
blurb: Google OAuth and Paystack payment handling implemented in Rust, where a replayed webhook means a double charge.
tags: ['Rust', 'OAuth 2.0', 'Paystack', 'Webhooks', 'PostgreSQL']
metrics:
  - { value: 'Rust', label: 'End to end' }
  - { value: 'OAuth', label: 'Google sign-in' }
  - { value: 'Verified', label: 'Payment webhooks' }
evidence: linked
repoUrl: 'https://github.com/idowuseyi/google-auth-paystack-plus'
---

Payment webhooks are where correctness stops being negotiable. A replayed
message is a double charge, and a provider that retries on timeout will send
one eventually.

This service handles the Google OAuth exchange and Paystack payment flow in
Rust, verifying webhook authenticity before any handler runs and treating
delivery as at-least-once rather than exactly-once.

Rust is the deliberate choice here rather than the interesting one: the
compiler refusing to let an unhandled error path through is worth more in a
payment handler than anywhere else in a system.
```

- [ ] **Step 8: Verify the content validates**

Run: `npm run build`
Expected: build succeeds. If a case study violates the evidence rule, Astro reports the Zod message and the build fails — that is the rule working.

- [ ] **Step 9: Commit**

```bash
git add src/components/MetricRow.astro src/components/Diagram.astro src/components/CaseStudy.astro src/diagrams src/content/projects tests/case-study.test.ts package.json package-lock.json
git commit -m "feat: case study components, diagram pipeline and three entries

Mermaid compiles at author time into committed SVGs and the generated colours
are rewritten to design tokens, so diagrams cost zero runtime JavaScript, need
no browser in CI, and recolour with the theme. All three case studies ship as
evidence: linked against public repositories."
```

---

## Task 6: Experience timeline

Absorbs the fourth case study and the standalone Leadership section from the old site, keeping their credibility without spending the reader's decision budget.

**Files:**
- Create: `src/data/experience.ts`, `src/components/Timeline.astro`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Consumes: tokens from Task 2.
- Produces: `src/data/experience.ts` exporting `experience: { period: string; title: string; org: string; summary: string }[]`, ordered most recent first. `Timeline.astro` takes no props.

- [ ] **Step 1: Write the failing test**

Create `tests/timeline.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import Timeline from '../src/components/Timeline.astro';
import { experience } from '../src/data/experience';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Timeline);
});

describe('experience timeline', () => {
  test('retains every employer from the previous site', () => {
    for (const org of ['Theraptly', 'HNG', 'Jethro', 'Sparkly', 'PayRent', 'Fitzzy', 'Techivate', 'OpenReplay']) {
      expect(html).toContain(org);
    }
  });

  test('preserves the Techivate scale metric that left the case studies', () => {
    expect(html).toContain('10k+');
  });

  test('lists eight roles', () => {
    expect(experience).toHaveLength(8);
  });

  test('is ordered most recent first', () => {
    expect(experience[0].period).toContain('2025');
    expect(experience[experience.length - 1].period).toBe('2023');
  });

  test('never claims 5+ years', () => {
    expect(html).not.toContain('5+ years');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — cannot resolve `../src/components/Timeline.astro`.

- [ ] **Step 3: Write the experience data**

Create `src/data/experience.ts`:

```ts
export const experience = [
  {
    period: '2025 — Present',
    title: 'Lead Fullstack Engineer',
    org: 'Theraptly — Health-Tech Platform',
    summary:
      'Lead engineering for a HIPAA-compliant platform and secure document processing system. Custom middleware for PII detection, threat analysis and malicious payload filtering. 50% faster release cycles, 60% fewer unauthorized attempts.',
  },
  {
    period: '2025',
    title: 'Software Engineer — 2× Finalist',
    org: 'HNG Open Source Engineering (Cohort 11 & 13)',
    summary:
      'Contributed to Telex, a real-time communication platform. Built high-concurrency Rust microservices, RAG infrastructure, a cross-platform Tauri 2 desktop app, and AI agents with the Mastra framework. Architected a modular NestJS boilerplate adopted by 50+ developers.',
  },
  {
    period: '2025',
    title: 'Fullstack Engineer (Contract)',
    org: 'PayRent — Real-Estate Platform',
    summary:
      'Built a real-estate investment and rent management platform — cross-platform mobile app and backend API for tenants, landlords and property managers, with role-based access and real-time chat.',
  },
  {
    period: '2024 — Present',
    title: 'Backend Engineer',
    org: 'Sparkly — Community Platform',
    summary:
      'Multi-platform community management with automated onboarding, banking-grade 2FA (TOTP), and global payments via Stripe and Flutterwave with cryptographic webhook verification. 50% engagement increase, 40% reduced DB load.',
  },
  {
    period: '2024 — 2025',
    title: 'Frontend Engineer',
    org: 'Jethro Ltd — Fintech Products',
    summary:
      'Led frontend for PayCollect and DocStream — payment collection workflows and document processing pipelines with role-based views, JWT auth and real-time analytics.',
  },
  {
    period: '2023 — 2024',
    title: 'Backend Engineer / CTO',
    org: 'Fitzzy Systems Limited',
    summary:
      'Led backend architecture and team delivery. Redesigned systems for 50% improved responsiveness. Introduced Docker and Kubernetes, standardizing deployment across production. Ran code reviews, mentoring and knowledge-sharing.',
  },
  {
    period: '2023',
    title: 'Backend Engineer',
    org: 'Techivate Ltd — Secure E-Commerce',
    summary:
      'Secure e-commerce platform for military and security agencies. Session management, XSS mitigation and integrated payment flows serving 10k+ daily users on AWS with Redis session caching. 30% checkout improvement, 50% latency reduction.',
  },
  {
    period: '2023',
    title: 'Technical Writer',
    org: 'OpenReplay — Open-Source Developer Tool',
    summary:
      'Developer-focused technical content and implementation tutorials covering frontend architecture, APIs and modern JavaScript ecosystems. Also published with Mastra.ai, Medium and Dev.to.',
  },
] as const;
```

- [ ] **Step 4: Write the timeline component**

Create `src/components/Timeline.astro`:

```astro
---
import { experience } from '../data/experience';
---
<section class="timeline" id="experience">
  <div class="wrap">
    <h2 class="timeline__title">Experience</h2>
    <p class="timeline__lede">A track record of increasing scope.</p>

    <ol class="timeline__list">
      {experience.map((role) => (
        <li class="timeline__item reveal">
          <details>
            <summary>
              <span class="timeline__period mono">{role.period}</span>
              <span class="timeline__role">{role.title}</span>
              <span class="timeline__org">{role.org}</span>
            </summary>
            <p class="timeline__summary">{role.summary}</p>
          </details>
        </li>
      ))}
    </ol>
  </div>
</section>

<style>
  .timeline { padding-block: var(--space-xl); }
  .timeline__title {
    font-size: var(--step-2);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .timeline__lede { color: var(--muted); margin-top: var(--space-s); }
  .timeline__list { list-style: none; margin-top: var(--space-l); }

  .timeline__item { border-top: 1px solid var(--border); }
  .timeline__item:last-child { border-bottom: 1px solid var(--border); }

  summary {
    display: grid;
    grid-template-columns: 10rem 1fr;
    gap: var(--space-s) var(--space-m);
    padding-block: var(--space-m);
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover .timeline__role { color: var(--accent); }

  .timeline__period { color: var(--muted); font-size: var(--step--1); }
  .timeline__role { font-weight: 500; }
  .timeline__org {
    grid-column: 2;
    color: var(--muted);
    font-size: var(--step--1);
  }

  .timeline__summary {
    grid-column: 2;
    max-width: 68ch;
    color: var(--muted);
    font-size: var(--step--1);
    padding: 0 0 var(--space-m) 0;
  }

  @media (max-width: 640px) {
    summary { grid-template-columns: 1fr; }
    .timeline__org, .timeline__summary { grid-column: 1; }
  }
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/timeline.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/data/experience.ts src/components/Timeline.astro tests/timeline.test.ts
git commit -m "feat: condensed experience timeline

Absorbs the Techivate case study and the standalone Leadership section as
expandable timeline entries, preserving the 10k+ daily users metric while
freeing the reader's attention for the three lead case studies."
```

---

## Task 7: Contact form and call booking

Both doors from the spec: an inline Cal.com embed for the primary CTA, and a working form for visitors who would rather write.

**Files:**
- Create: `src/lib/contact.ts`, `src/pages/api/contact.ts`, `src/components/ContactForm.astro`, `src/components/BookCall.astro`
- Test: `tests/contact.test.ts`

**Interfaces:**
- Consumes: tokens from Task 2, `profile` from Task 4.
- Produces:
  - `src/lib/contact.ts` exporting `parseContactSubmission(form: Record<string, unknown>): { ok: true; value: ContactSubmission } | { ok: false; error: string }` where `ContactSubmission = { name: string; email: string; company: string; message: string; intent: 'hiring' | 'project' }`
  - `POST /api/contact` accepting `application/x-www-form-urlencoded`, returning 204 on success, 400 on validation failure, 202 on honeypot rejection.
  - `BookCall.astro` renders a `<dialog id="book-dialog">` opened by any `[data-cta="book"]` anchor. Those anchors href to `#contact` so that with JavaScript disabled the visitor still lands on the form; the script intercepts the click when available.

- [ ] **Step 1: Write the failing test**

Create `tests/contact.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { parseContactSubmission } from '../src/lib/contact';

const valid = {
  name: 'Ada Recruiter',
  email: 'ada@example.com',
  company: 'Example Corp',
  message: 'We have a staff AI infrastructure role and would like to talk.',
  intent: 'hiring',
};

describe('contact submission parsing', () => {
  test('accepts a well-formed submission', () => {
    const result = parseContactSubmission(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe('ada@example.com');
  });

  test('rejects a malformed email', () => {
    const result = parseContactSubmission({ ...valid, email: 'ada-at-example' });
    expect(result.ok).toBe(false);
  });

  test('rejects an empty message', () => {
    const result = parseContactSubmission({ ...valid, message: '   ' });
    expect(result.ok).toBe(false);
  });

  test('rejects an unknown intent', () => {
    const result = parseContactSubmission({ ...valid, intent: 'spam' });
    expect(result.ok).toBe(false);
  });

  test('defaults company to an empty string when omitted', () => {
    const { company, ...withoutCompany } = valid;
    const result = parseContactSubmission(withoutCompany);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.company).toBe('');
  });

  test('trims surrounding whitespace', () => {
    const result = parseContactSubmission({ ...valid, name: '  Ada Recruiter  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Ada Recruiter');
  });

  test('caps message length to stop payload abuse', () => {
    const result = parseContactSubmission({ ...valid, message: 'x'.repeat(5001) });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/contact.test.ts`
Expected: FAIL — cannot resolve `../src/lib/contact`.

- [ ] **Step 3: Write the validator**

Create `src/lib/contact.ts`:

```ts
export interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  message: string;
  intent: 'hiring' | 'project';
}

export type ParseResult =
  | { ok: true; value: ContactSubmission }
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 5000;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseContactSubmission(form: Record<string, unknown>): ParseResult {
  const name = text(form.name);
  const email = text(form.email);
  const company = text(form.company);
  const message = text(form.message);
  const intent = text(form.intent);

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'A valid email is required.' };
  if (!message) return { ok: false, error: 'Message is required.' };
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: 'Message is too long.' };
  }
  if (intent !== 'hiring' && intent !== 'project') {
    return { ok: false, error: 'Unknown intent.' };
  }

  return { ok: true, value: { name, email, company, message, intent } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/contact.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Write the API route**

Create `src/pages/api/contact.ts`:

```ts
import type { APIRoute } from 'astro';
import { parseContactSubmission } from '../../lib/contact';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const form = Object.fromEntries(await request.formData());

  // Honeypot: real users never fill a hidden field. Accept silently so bots
  // cannot distinguish rejection from success.
  if (typeof form.website === 'string' && form.website.trim() !== '') {
    return new Response(null, { status: 202 });
  }

  const parsed = parseContactSubmission(form);
  if (!parsed.ok) {
    return new Response(parsed.error, { status: 400 });
  }

  const env = (locals as any).runtime?.env ?? {};
  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return new Response('Contact delivery is not configured.', { status: 500 });
  }

  const { name, email, company, message, intent } = parsed.value;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'idowuseyi.dev <noreply@idowuseyi.dev>',
      to: [to],
      reply_to: email,
      subject: `[${intent}] ${name}${company ? ` — ${company}` : ''}`,
      text: `${name} <${email}>${company ? `\nCompany: ${company}` : ''}\nIntent: ${intent}\n\n${message}`,
    }),
  });

  if (!response.ok) {
    return new Response('Could not deliver the message.', { status: 502 });
  }

  return new Response(null, { status: 204 });
};
```

Register the secrets (values are entered interactively; never committed):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_TO_EMAIL
```

- [ ] **Step 6: Write the contact form**

Create `src/components/ContactForm.astro`:

```astro
---
import { profile } from '../data/profile';
---
<form class="contact" method="post" action="/api/contact">
  <div class="contact__grid">
    <label class="field">
      <span class="field__label mono">Name</span>
      <input class="field__input" name="name" required autocomplete="name" />
    </label>
    <label class="field">
      <span class="field__label mono">Email</span>
      <input class="field__input" name="email" type="email" required autocomplete="email" />
    </label>
    <label class="field">
      <span class="field__label mono">Company</span>
      <input class="field__input" name="company" autocomplete="organization" />
    </label>
    <label class="field">
      <span class="field__label mono">Reason</span>
      <select class="field__input" name="intent">
        <option value="hiring">Hiring for a role</option>
        <option value="project">Starting a project</option>
      </select>
    </label>
  </div>

  <label class="field">
    <span class="field__label mono">Message</span>
    <textarea class="field__input" name="message" rows="5" required maxlength="5000"></textarea>
  </label>

  <input class="contact__trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

  <div class="contact__actions">
    <button class="contact__submit" type="submit">Send message</button>
    <p class="contact__status mono" role="status" aria-live="polite"></p>
  </div>

  <p class="contact__fallback mono">
    Or email <a href={`mailto:${profile.email}`}>{profile.email}</a>
  </p>
</form>

<style>
  .contact { display: grid; gap: var(--space-m); max-width: 60ch; }
  .contact__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-m);
  }
  .field { display: grid; gap: 0.35rem; }
  .field__label { color: var(--muted); font-size: var(--step--1); }
  .field__input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font: inherit;
    padding: 0.6rem 0.7rem;
  }
  .field__input:focus-visible { border-color: var(--accent); }
  .contact__trap { position: absolute; left: -9999px; width: 1px; height: 1px; }
  .contact__actions { display: flex; align-items: center; gap: var(--space-m); }
  .contact__submit {
    background: var(--accent);
    color: var(--base);
    border: 0;
    border-radius: var(--radius);
    font: inherit;
    font-weight: 500;
    padding: 0.7rem 1.3rem;
    cursor: pointer;
  }
  .contact__submit[disabled] { opacity: 0.6; cursor: progress; }
  .contact__status { font-size: var(--step--1); color: var(--muted); }
  .contact__fallback { font-size: var(--step--1); color: var(--muted); }
</style>

<script>
  const form = document.querySelector('.contact') as HTMLFormElement | null;
  if (form) {
    const status = form.querySelector('.contact__status') as HTMLElement;
    const submit = form.querySelector('.contact__submit') as HTMLButtonElement;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'Sending…';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
        });
        if (response.ok) {
          form.reset();
          status.textContent = 'Sent. I reply within two working days.';
        } else {
          status.textContent = (await response.text()) || 'Something went wrong.';
        }
      } catch {
        status.textContent = 'Network error — please email me instead.';
      } finally {
        submit.disabled = false;
      }
    });
  }
</script>
```

- [ ] **Step 7: Write the booking dialog**

Create `src/components/BookCall.astro`:

```astro
---
const calLink = 'idowuseyi/20min';
---
<dialog class="book" id="book-dialog" aria-label="Book a 20 minute call">
  <button class="book__close" type="button" aria-label="Close">×</button>
  <div class="book__slot" data-cal-link={calLink}></div>
</dialog>

<style>
  .book {
    width: min(100% - 2rem, 900px);
    max-height: 90vh;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    overflow: hidden;
  }
  .book::backdrop { background: rgb(0 0 0 / 0.7); }
  .book__close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
  }
  .book__slot { min-height: 70vh; }
</style>

<script>
  const dialog = document.getElementById('book-dialog') as HTMLDialogElement | null;
  if (dialog) {
    let loaded = false;

    // The Cal embed is only fetched once the visitor actually asks to book,
    // so it costs nothing against the homepage JavaScript budget.
    function loadEmbed() {
      if (loaded) return;
      loaded = true;
      const slot = dialog!.querySelector('.book__slot') as HTMLElement;
      const frame = document.createElement('iframe');
      frame.src = `https://cal.com/${slot.dataset.calLink}?embed=true&theme=dark`;
      frame.title = 'Book a 20 minute call';
      frame.loading = 'lazy';
      frame.style.cssText = 'width:100%;height:70vh;border:0;';
      slot.appendChild(frame);
    }

    document.querySelectorAll('[data-cta="book"]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        loadEmbed();
        dialog.showModal();
      });
    });

    dialog.querySelector('.book__close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
</script>
```

Confirm the Cal.com event exists at `cal.com/idowuseyi/20min`, or change `calLink` to the real slug.

- [ ] **Step 8: Commit**

```bash
git add src/lib/contact.ts src/pages/api/contact.ts src/components/ContactForm.astro src/components/BookCall.astro tests/contact.test.ts
git commit -m "feat: contact form and lazily-loaded call booking

Validation is a pure function so it is unit-tested without a Workers
runtime. The form works without JavaScript and enhances when available.
The Cal embed is fetched only on click, so it costs nothing against the
homepage budget."
```

---

## Task 8: Homepage assembly and enforced performance budget

**Files:**
- Create: `src/components/SiteHeader.astro`, `src/components/Contact.astro`, `lighthouserc.json`
- Modify: `src/pages/index.astro`, `.github/workflows/ci.yml`, `package.json`
- Test: `tests/homepage.test.ts`

**Interfaces:**
- Consumes: every component from Tasks 2 and 4–7.
- Produces: the assembled homepage in the spec's section order.

- [ ] **Step 1: Write the failing test**

Create `tests/homepage.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection } from 'astro:content';
import { beforeAll, describe, expect, test } from 'vitest';
import Index from '../src/pages/index.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Index);
});

describe('homepage', () => {
  test('presents sections in the spec order', () => {
    const order = ['hero', 'work', 'cta-break', 'experience', 'contact'];
    const positions = order.map((id) => html.indexOf(`id="${id}"`));
    expect(positions.every((p) => p !== -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  test('repeats the CTA at all three placements', () => {
    for (const placement of ['hero', 'break', 'contact']) {
      expect(html).toContain(`data-placement="${placement}"`);
    }
  });

  test('features exactly three case studies', async () => {
    const projects = await getCollection('projects');
    expect(projects).toHaveLength(3);
  });

  test('every project satisfies the evidence rule', async () => {
    const projects = await getCollection('projects');
    for (const project of projects) {
      const data = project.data;
      const verifiable =
        (data.evidence === 'linked' && (data.liveUrl || data.repoUrl)) ||
        (data.evidence === 'writeup-only' && data.evidenceNote.length >= 20);
      expect(verifiable).toBeTruthy();
    }
  });

  test('ships no hero video', () => {
    expect(html).not.toContain('.mp4');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/homepage.test.ts`
Expected: FAIL — the homepage from Task 1 is a placeholder containing only `Brand`.

- [ ] **Step 3: Write the header and contact section**

Create `src/components/SiteHeader.astro`:

```astro
---
import Brand from './Brand.astro';
---
<header class="header">
  <div class="wrap header__inner">
    <Brand />
    <nav class="header__nav mono">
      <a href="#work">Work</a>
      <a href="#experience">Experience</a>
      <a href="#contact">Contact</a>
      <a class="header__cta" href="#contact" data-cta="book" data-placement="header">Book a call</a>
    </nav>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--base) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }
  .header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-block: 0.8rem;
  }
  .header__nav {
    display: flex;
    align-items: center;
    gap: var(--space-m);
    font-size: var(--step--1);
  }
  .header__nav a { color: var(--muted); text-decoration: none; }
  .header__nav a:hover { color: var(--text); }
  .header__cta {
    color: var(--base) !important;
    background: var(--accent);
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
  }
  @media (max-width: 560px) {
    .header__nav a:not(.header__cta) { display: none; }
  }
</style>
```

Create `src/components/Contact.astro`:

```astro
---
import Cta from './Cta.astro';
import ContactForm from './ContactForm.astro';
import { profile } from '../data/profile';
---
<section class="contact-section" id="contact">
  <div class="wrap">
    <h2 class="contact-section__title">Get in touch</h2>
    <p class="contact-section__lede">
      Open to senior and staff engineering roles. Contract and fractional work considered.
    </p>

    <Cta placement="contact" />

    <div class="contact-section__form">
      <ContactForm />
    </div>

    <p class="contact-section__links mono">
      <a href={profile.github}>GitHub</a>
      <a href={profile.linkedin}>LinkedIn</a>
    </p>
  </div>
</section>

<style>
  .contact-section { padding-block: var(--space-xl); border-top: 1px solid var(--border); }
  .contact-section__title { font-size: var(--step-2); font-weight: 600; letter-spacing: -0.02em; }
  .contact-section__lede { color: var(--muted); margin-block: var(--space-s) var(--space-l); }
  .contact-section__form { margin-top: var(--space-xl); }
  .contact-section__links {
    display: flex;
    gap: var(--space-m);
    margin-top: var(--space-l);
    font-size: var(--step--1);
  }
  .contact-section__links a { color: var(--muted); }
</style>
```

- [ ] **Step 4: Assemble the homepage**

Replace `src/pages/index.astro` entirely:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteHeader from '../components/SiteHeader.astro';
import Hero from '../components/Hero.astro';
import ProofStrip from '../components/ProofStrip.astro';
import CaseStudy from '../components/CaseStudy.astro';
import Cta from '../components/Cta.astro';
import Timeline from '../components/Timeline.astro';
import Contact from '../components/Contact.astro';
import BookCall from '../components/BookCall.astro';
import { profile } from '../data/profile';

const projects = (await getCollection('projects')).sort(
  (a, b) => a.data.order - b.data.order,
);
---
<BaseLayout
  title="Oluwaseyi Idowu — AI Systems Engineer"
  description="Rust and TypeScript backends for LLM systems — multi-provider routing, retrieval-augmented search and schema-validated structured output."
>
  <SiteHeader />

  <main id="hero">
    <Hero />

    <div class="wrap"><ProofStrip /></div>

    <section class="work" id="work">
      <div class="wrap">
        <h2 class="work__title">Selected work</h2>
        <p class="work__lede">Three systems, each with its evidence attached.</p>
        {projects.map((project) => <CaseStudy project={project} />)}
      </div>
    </section>

    <section class="cta-break" id="cta-break">
      <div class="wrap cta-break__inner">
        <p class="cta-break__line">Hiring for AI infrastructure or backend systems?</p>
        <Cta placement="break" align="center" />
      </div>
    </section>

    <Timeline />
    <Contact />
  </main>

  <footer class="footer">
    <div class="wrap mono">© 2026 {profile.name}</div>
  </footer>

  <BookCall />
</BaseLayout>

<style>
  .work { padding-block: var(--space-xl); }
  .work__title { font-size: var(--step-2); font-weight: 600; letter-spacing: -0.02em; }
  .work__lede { color: var(--muted); margin-top: var(--space-s); }

  .cta-break {
    padding-block: var(--space-xl);
    border-block: 1px solid var(--border);
    background: var(--surface);
  }
  .cta-break__inner { display: grid; gap: var(--space-l); justify-items: center; text-align: center; }
  .cta-break__line { font-size: var(--step-1); }

  .footer {
    padding-block: var(--space-l);
    color: var(--muted);
    font-size: var(--step--1);
  }
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/homepage.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 6: Add the performance budget to CI**

```bash
npm install -D @lhci/cli
```

Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 3,
      "settings": { "preset": "desktop" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "total-byte-weight": ["error", { "maxNumericValue": 900000 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 30720 }],
        "unused-javascript": "off"
      }
    }
  }
}
```

Replace `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
    branches: [redesign/v2, main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Unit tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Check every outbound link resolves
        run: npx --yes linkinator ./dist --recurse --silent --skip "linkedin.com"
      - name: Performance budget
        run: npx lhci autorun
```

- [ ] **Step 7: Run the full verification locally**

```bash
npm test && npm run build && npx lhci autorun
```

Expected: all suites pass; Lighthouse reports performance, accessibility, best-practices and SEO at 0.95 or above, LCP under 1500ms, and script weight under 30KB.

If the script budget fails, the cause will be an embed loading eagerly — confirm the Cal iframe is still created only inside the click handler.

- [ ] **Step 8: Commit and deploy a preview**

```bash
git add src/components/SiteHeader.astro src/components/Contact.astro src/pages/index.astro lighthouserc.json .github/workflows/ci.yml tests/homepage.test.ts package.json package-lock.json
git commit -m "feat: assemble the homepage and enforce the performance budget

Sections follow the spec's conversion order with the CTA repeated at three
placements. CI now fails on a Lighthouse regression, a broken outbound link,
or more than 30KB of script on the homepage."
npx wrangler deploy
```

Expected: the Worker deploys and the preview URL serves the new site.

---

## Verification checklist

Before this plan is considered complete:

- [ ] `npm test` passes — all suites
- [ ] `npm run build` succeeds with no schema violations
- [ ] `npx lhci autorun` meets every assertion
- [ ] `grep -r "5+ years" src/` returns nothing
- [ ] `grep -rn "Rust" src/content/projects/rag-search.mdx` returns nothing — the RAG service is NestJS
- [ ] All three project `repoUrl` values resolve to public repositories
- [ ] Every case study shows either a working link or a stated reason
- [ ] The contact form delivers a real email end to end
- [ ] The Cal.com dialog opens and loads only on click
- [ ] `assets/video.mp4` no longer exists in the working tree
- [ ] The site renders correctly at 360px width with no horizontal scroll
- [ ] With `prefers-reduced-motion: reduce` set, no transitions run and all content is visible

---

## What this plan does not cover

Deliberately deferred to later plans, each of which produces working software on its own:

| Plan | Scope |
|---|---|
| **Plan 2 — Blog** | Posts collection, `/writing` index and post pages, RSS, tags, reading time, Shiki, generated OG images, `BlogPosting` JSON-LD, external-post badging, syndication canonicals, and the **View Transitions API** (spec §5) — which has nothing to transition between until multi-page routes exist, plus the homepage Writing section |
| **Plan 3 — RAG demo & analytics** | Workers AI + Vectorize endpoint, rate limiting and cost ceiling, the demo island, PostHog funnel instrumentation, `liveUrl` added to case study 2 |
| **Plan 4 — Cutover** | DNS to `idowuseyi.dev`, redirects, `llms.txt`, `Person` JSON-LD, 60-second walkthrough video, archiving the legacy site |

**Content status:** all three case studies now ship with verified public
repositories (`koos`, `nest-rag-service`, `google-auth-paystack-plus`) and
bodies written from what those repositories actually contain. Spec risk 1 is
resolved for this plan. Remaining content work, deferred to later plans: a
proper README with tests and CI on `google-auth-paystack-plus` (blueprint's
documentation ask), and the 60-second walkthrough video (Plan 4).
