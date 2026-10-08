# Portfolio Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give idowuseyi.dev a native technical blog that keeps SEO equity on the domain, surfaces existing external writing, and costs nothing against the performance budget.

**Architecture:** A second content collection (`posts`) alongside the existing `projects`, with a discriminated union separating **native** posts (authored here, body rendered, canonical self) from **external** posts (published elsewhere, link-out only, badged). Everything renders at build time: Shiki highlights code during the build, reading time is computed from the body, and RSS and tag pages are generated routes. The only new dependency is `@astrojs/rss`.

**Tech Stack:** Astro 7.3.x content collections · MDX · Shiki (already bundled with Astro) · `@astrojs/rss` · Astro View Transitions (`astro:transitions`, built in) · vanilla CSS tokens

**Spec:** `docs/superpowers/specs/2026-09-29-portfolio-redesign-design.md` §8 (Blog strategy), §11 (SEO and machine readers)

**Builds on:** Plan 1, complete on branch `redesign/v2` — 85 tests across 9 files, Lighthouse 1.00 across all four categories, LCP ~326ms, 70KB page weight.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24**, package manager `npm`, commands from the repo root.
- **Astro 7.3.5+.** Content config lives at `src/content.config.ts` (NOT `src/content/config.ts`). Loaders come from `astro/loaders`; zod from `astro/zod`; entries render via `render(entry)` imported from `astro:content`.
- **Dark theme only** — no light-mode styles, no theme toggle, no `prefers-color-scheme` branches.
- **Accent `#4ADE80` is reserved** for calls to action, live/availability indicators and diagram highlights. The accessibility focus ring is the ONE declared exception and consumes the dedicated `--focus` token; nothing other than `:focus-visible` may use `--focus`.
- **No hardcoded colour literals in component styles.** Consume the tokens in `src/styles/tokens.css`; derive accent-adjacent values with `color-mix(in srgb, var(--accent) N%, …)`.
- **Tenure copy is exactly `3+ years`.** The string `5+ years` must not appear in `src/`.
- **Performance budget, enforced in CI:** LCP < 1.5s, Lighthouse >= 0.95 in all four categories, < 30KB blocking JS on the homepage, `total-byte-weight` < 150,000 bytes. **Do NOT loosen a threshold to make a build pass** — diagnose and report instead.
- **All motion respects `prefers-reduced-motion: reduce`** by disabling entirely, handled globally in `tokens.css`. No per-component media queries.
- Canonical domain `idowuseyi.dev`. Contact address `hello@idowuseyi.dev`.
- **No new runtime dependencies beyond `@astrojs/rss`.** React is deliberately NOT installed — do not install it or any client framework. Shiki already ships with Astro; configure it, do not add it.
- **`prerender = false` stays on `src/pages/api/contact.ts` only.** Every page in this plan must be prerendered — that is what holds the LCP budget.
- `astro.config.mjs` gates the Cloudflare adapter behind `process.env.VITEST` to avoid a @cloudflare/vite-plugin vs Vitest server collision. **Leave that line alone.**
- `src/env.d.ts` must NOT gain a top-level `export` — its ambient `declare module 'cloudflare:workers'` stops resolving under the project's pinned TypeScript 7.0.2 if that file becomes a module.
- **Never commit secrets.**

### Deliberate deviations from the spec

| Spec says | This plan does | Why |
|---|---|---|
| Per-post OG images generated at build with Satori | **One static OG image** at `public/og.png`, used site-wide | Satori + `@resvg/resvg-js` is two dependencies, one native, plus embedded font buffers — to generate images for a blog with zero native posts. The actual problem is that `twitter:card` had no image at all. Revisit per-post generation at ~5 native posts. |
| — | Reading time computed inline in `src/lib/reading-time.ts` | The `reading-time` package is ~5 lines of logic. A dependency is not worth it. |

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/schemas/post.ts` | Zod schema for posts: the native/external discriminated union. Pure, unit-testable, mirrors `src/schemas/project.ts` |
| `src/content.config.ts` (modify) | Adds the `posts` collection beside the existing `projects` |
| `src/content/posts/*.mdx` | The posts themselves — three external seeds plus one native |
| `src/lib/reading-time.ts` | `readingTime(text)` → minutes. Pure, unit-testable |
| `src/layouts/PostLayout.astro` | One post's page shell: title, meta, prose container, JSON-LD |
| `src/components/PostCard.astro` | One post in a list, with the external badge |
| `src/components/TagList.astro` | Tag pills, linking to tag pages |
| `src/pages/writing/index.astro` | The writing index |
| `src/pages/writing/[...slug].astro` | A native post's page (external posts have no page) |
| `src/pages/writing/tags/[tag].astro` | Posts filtered by tag |
| `src/pages/rss.xml.ts` | The feed |
| `src/styles/prose.css` | Long-form reading styles, scoped to `.prose` |
| `public/og.png` | The static social preview image |
| `src/layouts/BaseLayout.astro` (modify) | `og:image`, `twitter:card`, optional JSON-LD slot, `<ClientRouter />` |
| `src/components/Writing.astro` | The homepage's latest-three-posts section |
| `src/pages/index.astro` (modify) | Mounts `Writing` between Experience and Contact |
| `astro.config.mjs` (modify) | Shiki theme config |
| `tests/post-schema.test.ts` | The native/external union and its rejections |
| `tests/reading-time.test.ts` | Reading-time maths |
| `tests/writing.test.ts` | Index, post page, tag page, card rendering |
| `tests/feed.test.ts` | RSS correctness against the built output |

---

## Task 1: Posts schema, collection and the external seeds

The blog's core invariant: a post is either authored here (body, self-canonical) or published elsewhere (link-out, badged). Making those two shapes distinct in the type system is what stops an external post rendering an empty page, or a native post silently losing its canonical.

**Files:**
- Create: `src/schemas/post.ts`, `src/content/posts/mastra-domain-expiry-agent.mdx`, `src/content/posts/ransomware-quick-tip.mdx`, `src/content/posts/understanding-api-like-a-pro.mdx`
- Modify: `src/content.config.ts`
- Test: `tests/post-schema.test.ts`

**Interfaces:**
- Consumes: nothing from this plan. Mirrors the pattern in `src/schemas/project.ts`.
- Produces:
  - `src/schemas/post.ts` exporting `postSchema` and type `Post`.
  - Frontmatter contract, shared by both variants: `title: string`, `description: string`, `pubDate: Date` (coerced), `tags: string[]` (min 1), `draft: boolean` (defaults false).
  - `kind: 'native'` — nothing further; the MDX body is the article and the canonical is the page itself.
  - `kind: 'external'` — `platform: string` and `url: string` (http/https only). The body is used as a short standfirst, not the article.
  - Collection name is `posts`, queried with `getCollection('posts')`.

- [ ] **Step 1: Write the failing test**

Create `tests/post-schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { postSchema } from '../src/schemas/post';

const base = {
  title: 'Understanding API Like a Pro',
  description: 'REST principles, auth strategies and patterns for robust integrations.',
  pubDate: '2024-06-01',
  tags: ['APIs', 'Architecture'],
};

describe('post schema', () => {
  test('accepts a native post', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
  });

  test('coerces pubDate to a Date', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pubDate).toBeInstanceOf(Date);
  });

  test('defaults draft to false', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.draft).toBe(false);
  });

  test('accepts an external post with platform and url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', platform: 'Dev.to',
      url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo',
    });
    expect(r.success).toBe(true);
  });

  test('rejects an external post missing its url', () => {
    const r = postSchema.safeParse({ ...base, kind: 'external', platform: 'Dev.to' });
    expect(r.success).toBe(false);
  });

  test('rejects an external post missing its platform', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', url: 'https://dev.to/x',
    });
    expect(r.success).toBe(false);
  });

  test('rejects a non-http external url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'external', platform: 'Dev.to', url: 'javascript:alert(1)',
    });
    expect(r.success).toBe(false);
  });

  test('rejects a native post that carries a url', () => {
    const r = postSchema.safeParse({
      ...base, kind: 'native', url: 'https://example.com',
    });
    expect(r.success).toBe(false);
  });

  test('rejects an unknown kind', () => {
    const r = postSchema.safeParse({ ...base, kind: 'syndicated' });
    expect(r.success).toBe(false);
  });

  test('rejects an empty tag list', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', tags: [] });
    expect(r.success).toBe(false);
  });

  test('rejects an unrecognised frontmatter key', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', publishedOn: '2024-01-01' });
    expect(r.success).toBe(false);
  });

  test('rejects a blank description', () => {
    const r = postSchema.safeParse({ ...base, kind: 'native', description: '   ' });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/post-schema.test.ts`
Expected: FAIL — cannot resolve `../src/schemas/post`.

- [ ] **Step 3: Write the schema**

Create `src/schemas/post.ts`:

```ts
import { z } from 'astro/zod';

// Only http/https are acceptable: a `javascript:` or `ftp:` URI may be
// URL-shaped but is not a link a reader can follow to the article. Mirrors
// the evidence-URL rule in src/schemas/project.ts.
const articleUrl = z.string().url({ protocol: /^https?$/ });

const common = {
  title: z.string().min(1),
  description: z.string().trim().min(1),
  pubDate: z.coerce.date(),
  tags: z.array(z.string().min(1)).min(1),
  draft: z.boolean().default(false),
};

// Authored here. The MDX body IS the article, and the canonical URL is this
// site's own page for it.
const native = z
  .object({
    ...common,
    kind: z.literal('native'),
  })
  .strict();

// Published elsewhere. The body is a short standfirst for the card; the
// article itself lives at `url`, which keeps that publisher's canonical.
const external = z
  .object({
    ...common,
    kind: z.literal('external'),
    platform: z.string().min(1),
    url: articleUrl,
  })
  .strict();

// A discriminated union on `kind` gives readable build errors keyed to the
// variant, rather than a plain union's wall of every branch's failures.
export const postSchema = z.discriminatedUnion('kind', [native, external]);

export type Post = z.infer<typeof postSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/post-schema.test.ts`
Expected: PASS — 12 tests passed.

- [ ] **Step 5: Wire the collection**

Modify `src/content.config.ts` to add the `posts` collection beside `projects`. Keep the existing `projects` definition exactly as it is:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './schemas/project';
import { postSchema } from './schemas/post';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: projectSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts' }),
  schema: postSchema,
});

export const collections = { projects, posts };
```

- [ ] **Step 6: Add the three external seed posts**

These are already-published articles. Their bodies are standfirsts for the card, not the article.

Create `src/content/posts/mastra-domain-expiry-agent.mdx`:

```mdx
---
kind: external
title: 'Building an AI-Powered Domain Expiry Checker: A Mastra.ai Deep Dive'
description: Building an autonomous agent that tracks domain expiry and reports on it, published on the official Mastra.ai blog.
pubDate: 2025-11-05
platform: Mastra.ai
url: 'https://mastra.ai/blog'
tags: ['AI Agents', 'Mastra', 'TypeScript']
---

A technical walkthrough of an autonomous agent built on Mastra: tool definitions,
scheduled runs, and reporting on domain expiry without a human in the loop.
```

**Note on that URL:** it points at the Mastra blog index, not the article. If the
direct article URL can be found, use it — a link to an index makes a reader hunt
for the piece. If it cannot be found, leave the index URL and record the gap in
your report; do not invent a slug.

Create `src/content/posts/ransomware-quick-tip.mdx`:

```mdx
---
kind: external
title: 'How to Save Yourself from Ransomware: A Quick Tip'
description: Practical prevention and recovery guidance for ransomware, aimed at people who are not security specialists.
pubDate: 2024-08-01
platform: Medium
url: 'https://medium.com/@idowuseyi22/how-to-save-yourself-from-ransomware-ransomware-shield-a-quick-tip-8fa0d2eb1005'
tags: ['Security']
---

What actually reduces your exposure to ransomware, and what to do in the first
hour if it has already happened.
```

Create `src/content/posts/understanding-api-like-a-pro.mdx`:

```mdx
---
kind: external
title: Understanding API Like a Pro
description: A guide to API design and consumption — REST principles, authentication strategies, and patterns for robust integrations.
pubDate: 2024-05-01
platform: Dev.to
url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo'
tags: ['APIs', 'Architecture']
---

REST principles, authentication strategies, and the patterns that make an
integration survive the provider changing its mind.
```

- [ ] **Step 7: Verify the collection validates against a real build**

Run: `npm run build`
Expected: build succeeds. The three posts validate.

Then prove the schema is live in the real pipeline, not just in Vitest — add a stray key temporarily and confirm the build rejects it:

```bash
sed -i "s/^tags: \['Security'\]/tags: ['Security']\nauthor: 'Someone'/" src/content/posts/ransomware-quick-tip.mdx
npm run build 2>&1 | grep -i "unrecognized\|author" | head -3
git checkout -- src/content/posts/ransomware-quick-tip.mdx
npm run build
```
Expected: the first build FAILS naming `author`; after the revert it succeeds. Record both outputs in your report.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/post.ts src/content.config.ts src/content/posts tests/post-schema.test.ts
git commit -m "feat: posts collection separating native articles from external ones

A post is either authored here — body rendered, canonical self — or
published elsewhere, in which case it is a badged link-out that keeps the
publisher's canonical. Making those shapes distinct in the schema stops an
external post rendering an empty page or a native one losing its canonical."
```

---

## Task 2: Reading time, post pages and prose styles

**Files:**
- Create: `src/lib/reading-time.ts`, `src/styles/prose.css`, `src/layouts/PostLayout.astro`, `src/pages/writing/[...slug].astro`, `src/content/posts/why-schema-validated-llm-output.mdx`
- Modify: `astro.config.mjs` (Shiki theme)
- Test: `tests/reading-time.test.ts`

**Interfaces:**
- Consumes: `postSchema` and the `posts` collection from Task 1.
- Produces:
  - `src/lib/reading-time.ts` exporting `readingTime(text: string): number` — whole minutes, minimum 1.
  - `src/styles/prose.css` defining a `.prose` class for long-form content.
  - `PostLayout.astro` with props `{ title: string; description: string; pubDate: Date; tags: string[]; minutes: number; canonicalPath: string }` and a default slot for the body.
  - Route `/writing/<slug>/` for every **native, non-draft** post. External posts get no page.

- [ ] **Step 1: Write the failing test**

Create `tests/reading-time.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { readingTime } from '../src/lib/reading-time';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('readingTime', () => {
  test('returns at least one minute for very short text', () => {
    expect(readingTime('a few words only')).toBe(1);
  });

  test('returns 1 for 200 words at 200wpm', () => {
    expect(readingTime(words(200))).toBe(1);
  });

  test('rounds up a partial minute', () => {
    expect(readingTime(words(201))).toBe(2);
  });

  test('scales linearly', () => {
    expect(readingTime(words(1000))).toBe(5);
  });

  test('ignores markdown punctuation and code fences', () => {
    const plain = readingTime(words(400));
    const marked = readingTime('# Heading\n\n```ts\nconst x = 1;\n```\n\n' + words(400));
    expect(Math.abs(marked - plain)).toBeLessThanOrEqual(1);
  });

  test('returns 1 for empty input rather than 0 or NaN', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime('   ')).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/reading-time.test.ts`
Expected: FAIL — cannot resolve `../src/lib/reading-time`.

- [ ] **Step 3: Write the helper**

Create `src/lib/reading-time.ts`:

```ts
const WORDS_PER_MINUTE = 200;

/**
 * Whole minutes to read `text`, never less than 1.
 *
 * Deliberately not a dependency: the `reading-time` package is this much
 * logic. Code fences are stripped before counting because a long listing
 * is scanned, not read word by word, and counting it inflates the estimate.
 */
export function readingTime(text: string): number {
  const prose = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_~\[\]()|-]/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/reading-time.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Configure Shiki**

Shiki already ships with Astro — this is configuration, not a dependency. Add a `markdown` block to `astro.config.mjs`, leaving every existing option (including the `process.env.VITEST` adapter gate) untouched:

```js
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
```

Verify the theme name exists in the bundled Shiki before relying on it:
```bash
node -e "import('shiki').then(s=>console.log(s.bundledThemes['github-dark-default']?'ok':'MISSING'))"
```
If it reports MISSING, pick a bundled dark theme that exists, say which, and record the substitution in your report.

- [ ] **Step 6: Write the prose styles**

Create `src/styles/prose.css`:

```css
/* Long-form reading styles, scoped to .prose so they never leak into the
   marketing sections. Tokens only — no literals. */
.prose {
  max-width: 68ch;
  color: var(--text);
  font-size: var(--step-0);
  line-height: 1.75;
}

.prose > * + * { margin-top: var(--space-m); }

.prose h2,
.prose h3 {
  margin-top: var(--space-l);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.prose h2 { font-size: var(--step-1); }
.prose h3 { font-size: var(--step-0); color: var(--muted); }

.prose a {
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 3px;
}
.prose a:hover { text-decoration-color: var(--text); }

.prose strong { font-weight: 600; }

.prose ul,
.prose ol { padding-left: 1.25rem; }
.prose li + li { margin-top: var(--space-s); }

.prose blockquote {
  border-left: 2px solid var(--border);
  padding-left: var(--space-m);
  color: var(--muted);
}

.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.1em 0.35em;
}

/* Shiki emits <pre class="astro-code">; the inline-code treatment above must
   not double up inside it. */
.prose pre {
  background: var(--surface) !important;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-m);
  overflow-x: auto;
  font-size: var(--step--1);
  line-height: 1.6;
}

.prose pre code {
  background: none;
  border: 0;
  padding: 0;
  font-size: inherit;
}

.prose hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin-block: var(--space-l);
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius);
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--step--1);
}
.prose th,
.prose td {
  border: 1px solid var(--border);
  padding: 0.5rem 0.7rem;
  text-align: left;
}
.prose th { color: var(--muted); font-weight: 500; }
```

- [ ] **Step 7: Write the post layout**

Create `src/layouts/PostLayout.astro`:

```astro
---
import BaseLayout from './BaseLayout.astro';
import TagList from '../components/TagList.astro';
import '../styles/prose.css';

interface Props {
  title: string;
  description: string;
  pubDate: Date;
  tags: string[];
  minutes: number;
  canonicalPath: string;
}

const { title, description, pubDate, tags, minutes, canonicalPath } = Astro.props;
const iso = pubDate.toISOString();
const human = pubDate.toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
});
---
<BaseLayout title={`${title} — Oluwaseyi Idowu`} description={description} canonicalPath={canonicalPath}>
  <article class="post">
    <div class="wrap">
      <header class="post__head">
        <p class="post__meta mono">
          <time datetime={iso}>{human}</time> · {minutes} minute read
        </p>
        <h1 class="post__title">{title}</h1>
        <p class="post__standfirst">{description}</p>
        <TagList tags={tags} />
      </header>

      <div class="prose">
        <slot />
      </div>

      <footer class="post__foot">
        <a class="post__back" href="/writing/">← All writing</a>
      </footer>
    </div>
  </article>
</BaseLayout>

<style>
  .post { padding-block: var(--space-xl); }
  .post__head {
    display: grid;
    gap: var(--space-s);
    max-width: 68ch;
    padding-bottom: var(--space-l);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-l);
  }
  .post__meta { color: var(--muted); font-size: var(--step--1); }
  .post__title {
    font-size: var(--step-2);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .post__standfirst { color: var(--muted); font-size: var(--step-1); line-height: 1.5; }
  .post__foot {
    margin-top: var(--space-xl);
    padding-top: var(--space-l);
    border-top: 1px solid var(--border);
  }
  .post__back { color: var(--muted); font-size: var(--step--1); text-decoration: none; }
  .post__back:hover { color: var(--text); }
</style>
```

- [ ] **Step 8: Write the post route**

Create `src/pages/writing/[...slug].astro`. Only native, non-draft posts get a page — an external post's article lives on its publisher's site, so generating a page for it would create a thin duplicate competing with the original:

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';
import { readingTime } from '../../lib/reading-time';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('posts');
  return posts
    .filter((p) => p.data.kind === 'native' && !p.data.draft)
    .map((post) => ({ params: { slug: post.id }, props: { post } }));
};

const { post } = Astro.props;
const { Content } = await render(post);
const minutes = readingTime(post.body ?? '');
---
<PostLayout
  title={post.data.title}
  description={post.data.description}
  pubDate={post.data.pubDate}
  tags={post.data.tags}
  minutes={minutes}
  canonicalPath={`/writing/${post.id}/`}
>
  <Content />
</PostLayout>
```

- [ ] **Step 9: Write the first native post**

This gives the route something real to render and is genuine evidence for the AI-systems positioning. Create `src/content/posts/why-schema-validated-llm-output.mdx`:

```mdx
---
kind: native
title: Schema-Validated LLM Output Beats Prompt Discipline
description: Why constraining a model's output with a validated schema is more reliable than asking it nicely, and what that looks like in production.
pubDate: 2026-10-01
tags: ['AI Systems', 'TypeScript', 'Zod']
---

The usual first attempt at structured output from a language model is a
carefully worded prompt: *return only JSON, with these fields, no prose*. It
works often enough to feel solved, and then it does not.

## Prompts are requests, schemas are contracts

A prompt asks for a shape. Nothing enforces it. The model may add a prose
preamble, wrap the JSON in a code fence, rename a field, or return a plausible
object with a subtly wrong type — a number where a string was expected, a
single item where an array was. Each of those passes `JSON.parse` and fails
later, somewhere less obvious.

Validating at the boundary inverts this. The model's response is parsed
against a schema before anything downstream sees it, so a malformed
generation fails where it happened rather than three functions away.

## What this looks like

In the content platform I built, strategy and calendar generations are parsed
through Zod schemas that have their own test suites. The schema is the
contract; the prompt is an implementation detail that can change freely as
long as the output still satisfies it.

The practical consequences are worth stating plainly:

- **Failures are local.** A bad generation throws at the parse site, with the
  offending field named.
- **Prompts become refactorable.** Rewording a prompt is safe, because the
  schema still gates the result.
- **The schema is testable without a model.** You can assert that malformed
  shapes are rejected without spending a token.

## The part people skip

Validation is not retry logic. A schema tells you the output was wrong; it
does not get you a right one. Production needs both — parse, and on failure
retry with the validation error fed back in, bounded by an attempt limit so a
persistently confused model cannot spend your budget.

That combination is unglamorous and it is most of what makes model output safe
to build on.
```

- [ ] **Step 10: Verify the route builds and renders**

Run: `npm run build`
Expected: succeeds, and generates `dist/client/writing/why-schema-validated-llm-output/index.html`.

```bash
ls dist/client/writing/
grep -c "astro-code" dist/client/writing/why-schema-validated-llm-output/index.html
grep -o "minute read" dist/client/writing/why-schema-validated-llm-output/index.html | head -1
ls dist/client/writing/ | grep -c "ransomware\|understanding-api\|mastra" || echo "0 external pages — correct"
```
Expected: the native post has a directory; Shiki emitted at least one `astro-code` block; "minute read" is present; **no** directory exists for any external post.

- [ ] **Step 11: Commit**

```bash
git add src/lib/reading-time.ts src/styles/prose.css src/layouts/PostLayout.astro src/pages/writing src/content/posts/why-schema-validated-llm-output.mdx astro.config.mjs tests/reading-time.test.ts
git commit -m "feat: post pages, prose styles and build-time syntax highlighting

Native posts get a page at /writing/<slug>/; external posts deliberately do
not, since generating one would publish a thin duplicate competing with the
original. Shiki highlights at build time, so code blocks cost no runtime
JavaScript. Reading time is computed inline rather than taking a dependency."
```

---

## Task 3: The writing index, post cards and tag pages

**Files:**
- Create: `src/lib/tags.ts`, `src/components/TagList.astro`, `src/components/PostCard.astro`, `src/pages/writing/index.astro`, `src/pages/writing/tags/[tag].astro`
- Test: `tests/writing.test.ts`

**Interfaces:**
- Consumes: the `posts` collection (Task 1), `readingTime` (Task 2).
- Produces:
  - `TagList.astro` props `{ tags: string[]; linked?: boolean }` — renders tag pills; when `linked` is true (the default) each links to `/writing/tags/<slug>/`.
  - `PostCard.astro` props `{ post: CollectionEntry<'posts'> }` — one row in a list. A native post links to its own page; an external post links out to `url`, carries a platform badge and `rel="noopener"`.
  - `src/lib/tags.ts` exporting `tagSlug(tag: string): string` — lowercase, spaces and slashes to hyphens, so `'AI Systems'` → `'ai-systems'`.
  - Routes `/writing/` and `/writing/tags/<slug>/`.

- [ ] **Step 1: Write the failing test**

Create `tests/writing.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import PostCard from '../src/components/PostCard.astro';
import TagList from '../src/components/TagList.astro';
import { tagSlug } from '../src/lib/tags';

function entry(data: Record<string, unknown>) {
  return {
    id: 'a-post',
    collection: 'posts' as const,
    data,
    body: 'body text',
    rendered: { html: '<p>body text</p>', metadata: {} },
    filePath: 'src/content/posts/a-post.mdx',
  } as never;
}

const nativeData = {
  kind: 'native',
  title: 'A Native Post',
  description: 'Written here.',
  pubDate: new Date('2026-10-01'),
  tags: ['AI Systems'],
  draft: false,
};

const externalData = {
  kind: 'external',
  title: 'An External Post',
  description: 'Published elsewhere.',
  pubDate: new Date('2024-05-01'),
  tags: ['APIs'],
  draft: false,
  platform: 'Dev.to',
  url: 'https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo',
};

describe('tagSlug', () => {
  test('lowercases and hyphenates', () => {
    expect(tagSlug('AI Systems')).toBe('ai-systems');
  });
  test('handles slashes', () => {
    expect(tagSlug('CI/CD')).toBe('ci-cd');
  });
  test('collapses repeated separators', () => {
    expect(tagSlug('AI  /  Systems')).toBe('ai-systems');
  });
});

describe('PostCard', () => {
  test('a native post links to its own page', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    expect(html).toContain('href="/writing/a-post/"');
    expect(html).toContain('A Native Post');
  });

  test('a native post shows no platform badge', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    expect(html).not.toContain('post-card__badge');
  });

  test('an external post links out to the publisher', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toContain('href="https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo"');
    expect(html).not.toContain('href="/writing/a-post/"');
  });

  test('an external post is badged with its platform', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toContain('Dev.to');
    expect(html).toMatch(/post-card__badge/);
  });

  test('an external link carries rel noopener', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(html).toMatch(/rel="[^"]*noopener/);
  });

  test('a native post shows a reading time, an external one does not', async () => {
    const c = await AstroContainer.create();
    const nativeHtml = await c.renderToString(PostCard, { props: { post: entry(nativeData) } });
    const externalHtml = await c.renderToString(PostCard, { props: { post: entry(externalData) } });
    expect(nativeHtml).toContain('minute read');
    expect(externalHtml).not.toContain('minute read');
  });
});

describe('TagList', () => {
  test('renders a pill per tag, linked by default', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(TagList, { props: { tags: ['AI Systems', 'Zod'] } });
    expect(html).toContain('href="/writing/tags/ai-systems/"');
    expect(html).toContain('href="/writing/tags/zod/"');
  });

  test('renders plain text when linked is false', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(TagList, { props: { tags: ['Zod'], linked: false } });
    expect(html).toContain('Zod');
    expect(html).not.toContain('href="/writing/tags/zod/"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/writing.test.ts`
Expected: FAIL — cannot resolve `../src/components/PostCard.astro`.

- [ ] **Step 3: Write the tag slug helper**

Create `src/lib/tags.ts`:

```ts
/**
 * URL slug for a tag. `'AI Systems'` -> `'ai-systems'`, `'CI/CD'` -> `'ci-cd'`.
 * Used for both the generated tag routes and the links pointing at them, so
 * the two cannot drift.
 */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Write TagList**

Create `src/components/TagList.astro`:

```astro
---
import { tagSlug } from '../lib/tags';

interface Props {
  tags: string[];
  linked?: boolean;
}

const { tags, linked = true } = Astro.props;
---
<ul class="tags mono">
  {tags.map((tag) => (
    <li class="tags__item">
      {linked
        ? <a class="tags__link" href={`/writing/tags/${tagSlug(tag)}/`}>{tag}</a>
        : <span>{tag}</span>}
    </li>
  ))}
</ul>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    list-style: none;
    font-size: var(--step--1);
  }
  .tags__item {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--muted);
  }
  .tags__link { color: inherit; text-decoration: none; }
  .tags__item:hover { border-color: var(--text); }
  .tags__item:hover .tags__link { color: var(--text); }
</style>
```

- [ ] **Step 5: Write PostCard**

Create `src/components/PostCard.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { readingTime } from '../lib/reading-time';

interface Props {
  post: CollectionEntry<'posts'>;
}

const { post } = Astro.props;
const d = post.data;
const isExternal = d.kind === 'external';

// A native post links to its own page; an external one goes straight to the
// publisher, because this site has no page for it by design.
const href = isExternal ? d.url : `/writing/${post.id}/`;
const iso = d.pubDate.toISOString();
const human = d.pubDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const minutes = isExternal ? null : readingTime(post.body ?? '');
---
<article class="post-card reveal">
  <a
    class="post-card__link"
    href={href}
    {...isExternal ? { rel: 'noopener', target: '_blank' } : {}}
  >
    <p class="post-card__meta mono">
      <time datetime={iso}>{human}</time>
      {minutes !== null && <span> · {minutes} minute read</span>}
      {isExternal && <span class="post-card__badge">{d.platform} ↗</span>}
    </p>
    <h3 class="post-card__title">{d.title}</h3>
    <p class="post-card__desc">{d.description}</p>
  </a>
</article>

<style>
  .post-card { border-top: 1px solid var(--border); }
  .post-card:last-child { border-bottom: 1px solid var(--border); }
  .post-card__link {
    display: grid;
    gap: var(--space-s);
    padding-block: var(--space-m);
    text-decoration: none;
    color: inherit;
  }
  .post-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    align-items: center;
    color: var(--muted);
    font-size: var(--step--1);
  }
  .post-card__badge {
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 100px;
  }
  .post-card__title { font-size: var(--step-1); font-weight: 500; line-height: 1.3; }
  .post-card__link:hover .post-card__title { color: var(--accent); }
  .post-card__desc { color: var(--muted); font-size: var(--step--1); max-width: 68ch; }
</style>
```

**Note on the accent in `:hover`:** a post title hover IS a call to action — it is the clickable thing on the card — so this is a sanctioned accent use, unlike the job-title hover that was removed from `Timeline.astro`. If a reviewer disagrees, the fallback is `var(--text)`.

- [ ] **Step 6: Write the writing index**

Create `src/pages/writing/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteHeader from '../../components/SiteHeader.astro';
import PostCard from '../../components/PostCard.astro';

const posts = (await getCollection('posts'))
  .filter((p) => !p.data.draft)
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
---
<BaseLayout
  title="Writing — Oluwaseyi Idowu"
  description="Technical writing on AI systems, backend infrastructure and the things that break in production."
  canonicalPath="/writing/"
>
  <SiteHeader />
  <main class="writing">
    <div class="wrap">
      <h1 class="writing__title">Writing</h1>
      <p class="writing__lede">
        AI systems, backend infrastructure, and the things that break in production.
        Pieces published elsewhere are marked and link out.
      </p>
      <div class="writing__list">
        {posts.map((post) => <PostCard post={post} />)}
      </div>
      <p class="writing__feed mono"><a href="/rss.xml">RSS feed</a></p>
    </div>
  </main>
</BaseLayout>

<style>
  .writing { padding-block: var(--space-xl); }
  .writing__title { font-size: var(--step-2); font-weight: 600; letter-spacing: -0.02em; }
  .writing__lede { color: var(--muted); margin-top: var(--space-s); max-width: 68ch; }
  .writing__list { margin-top: var(--space-l); }
  .writing__feed { margin-top: var(--space-l); font-size: var(--step--1); }
  .writing__feed a { color: var(--muted); }
  .writing__feed a:hover { color: var(--text); }
</style>
```

- [ ] **Step 7: Write the tag route**

Create `src/pages/writing/tags/[tag].astro`:

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import SiteHeader from '../../../components/SiteHeader.astro';
import PostCard from '../../../components/PostCard.astro';
import { tagSlug } from '../../../lib/tags';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getCollection('posts')).filter((p) => !p.data.draft);
  const bySlug = new Map<string, { label: string; posts: typeof posts }>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const existing = bySlug.get(slug);
      if (existing) existing.posts.push(post);
      else bySlug.set(slug, { label: tag, posts: [post] });
    }
  }

  return [...bySlug.entries()].map(([slug, { label, posts: tagged }]) => ({
    params: { tag: slug },
    props: {
      label,
      posts: tagged.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()),
    },
  }));
};

const { label, posts } = Astro.props;
---
<BaseLayout
  title={`${label} — Writing — Oluwaseyi Idowu`}
  description={`Posts tagged ${label}.`}
  canonicalPath={`/writing/tags/${tagSlug(label)}/`}
  noindex={true}
>
  <SiteHeader />
  <main class="tagpage">
    <div class="wrap">
      <p class="tagpage__kicker mono"><a href="/writing/">Writing</a> / tag</p>
      <h1 class="tagpage__title">{label}</h1>
      <div class="tagpage__list">
        {posts.map((post) => <PostCard post={post} />)}
      </div>
    </div>
  </main>
</BaseLayout>

<style>
  .tagpage { padding-block: var(--space-xl); }
  .tagpage__kicker { color: var(--muted); font-size: var(--step--1); }
  .tagpage__kicker a { color: inherit; }
  .tagpage__title { font-size: var(--step-2); font-weight: 600; margin-top: var(--space-s); }
  .tagpage__list { margin-top: var(--space-l); }
</style>
```

**Why `noindex` on tag pages:** they are navigation, not content — each one duplicates descriptions already on `/writing/` and the posts themselves. Indexing them creates thin near-duplicate pages competing with the real ones. `BaseLayout` already accepts a `noindex` prop (added in Plan 1 for the status pages); Task 4 excludes these from the sitemap.

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/writing.test.ts`
Expected: PASS — 11 tests passed.

- [ ] **Step 9: Verify the routes build**

Run: `npm run build`
Then:
```bash
ls dist/client/writing/
ls dist/client/writing/tags/
grep -o 'href="https://dev.to[^"]*"' dist/client/writing/index.html | head -1
grep -c 'post-card__badge' dist/client/writing/index.html
grep -o 'name="robots" content="[^"]*"' dist/client/writing/tags/apis/index.html | head -1
```
Expected: `/writing/` exists; tag directories exist for every tag used; the Dev.to link appears on the index; three badges (one per external post); the tag page carries `noindex`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/tags.ts src/components/TagList.astro src/components/PostCard.astro src/pages/writing tests/writing.test.ts
git commit -m "feat: writing index, post cards and tag pages

External posts are badged and link straight to their publisher; native ones
link to their own page and show a reading time. Tag pages are generated from
the posts themselves and marked noindex, since they duplicate content that
already exists on the index and the posts."
```

---

## Task 4: RSS, social preview and machine-readable metadata

**Files:**
- Create: `src/pages/rss.xml.ts`, `public/og.png`
- Modify: `src/layouts/BaseLayout.astro`, `src/layouts/PostLayout.astro`, `astro.config.mjs`
- Test: `tests/feed.test.ts`

**Interfaces:**
- Consumes: the `posts` collection (Task 1), `PostLayout` (Task 2).
- Produces:
  - `/rss.xml` — every non-draft post, newest first. Native items point at this site; external items point at the publisher.
  - `BaseLayout` gains `og:image`, restores `twitter:card`, and accepts an optional `jsonLd` prop (an object serialised into a `application/ld+json` script).
  - `PostLayout` emits `BlogPosting` JSON-LD.
  - Sitemap excludes `/writing/tags/*`.

- [ ] **Step 1: Install the feed integration**

```bash
npm install @astrojs/rss@^4.0.19
```

This is the one new dependency in this plan.

- [ ] **Step 2: Write the failing test**

Create `tests/feed.test.ts`. It asserts against the **built** feed, because an RSS route is a generated artifact and rendering it through the Container API would not exercise the real route:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const FEED = 'dist/client/rss.xml';
const built = existsSync(FEED);
const xml = built ? readFileSync(FEED, 'utf8') : '';

describe.skipIf(!built)('rss feed (requires `npm run build` first)', () => {
  test('is a valid-looking RSS 2.0 document', () => {
    expect(xml).toContain('<rss');
    expect(xml).toContain('version="2.0"');
    expect(xml).toContain('<channel>');
  });

  test('declares the canonical site', () => {
    expect(xml).toContain('https://idowuseyi.dev');
  });

  test('contains an item per non-draft post', () => {
    const items = xml.match(/<item>/g) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  test('a native post links to this site', () => {
    expect(xml).toContain('https://idowuseyi.dev/writing/why-schema-validated-llm-output/');
  });

  test('an external post links to its publisher, not here', () => {
    expect(xml).toContain('https://dev.to/idowuseyi/understanding-api-like-a-pro-5cfo');
    expect(xml).not.toContain('idowuseyi.dev/writing/understanding-api-like-a-pro');
  });

  test('every item has a pubDate', () => {
    const items = (xml.match(/<item>/g) ?? []).length;
    const dates = (xml.match(/<pubDate>/g) ?? []).length;
    expect(dates).toBe(items);
  });

  test('excludes drafts', () => {
    expect(xml).not.toContain('draft');
  });
});

test('the feed file exists after a build', () => {
  expect(built, `${FEED} missing — run \`npm run build\` first`).toBe(true);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/feed.test.ts`
Expected: FAIL — the final assertion fails because `dist/client/rss.xml` does not exist; the suite body is skipped.

- [ ] **Step 4: Write the feed route**

Create `src/pages/rss.xml.ts`:

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'Oluwaseyi Idowu — Writing',
    description:
      'AI systems, backend infrastructure, and the things that break in production.',
    site: context.site ?? 'https://idowuseyi.dev',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      // An external post's canonical home is its publisher. Pointing the feed
      // item at a page this site does not have would be a dead link.
      link:
        post.data.kind === 'external'
          ? post.data.url
          : `/writing/${post.id}/`,
    })),
    customData: '<language>en-gb</language>',
  });
}
```

- [ ] **Step 5: Create the social preview image**

Create `public/og.png` — 1200×630, the site's own design language: `#08090A` ground, `#EDEEF0` text, one `#4ADE80` accent element. It should read at thumbnail size: the name "Oluwaseyi Idowu", the line "AI systems engineer", and `idowuseyi.dev`. Keep it under 100KB.

Generate it however is reliable in this environment — an SVG converted with a tool already available, or hand-authored. **Do not install a new dependency for this.** If no conversion tool is available, author `public/og.svg` instead and reference that (modern platforms accept SVG for `og:image`, though PNG has broader support — note which you shipped and why in your report).

- [ ] **Step 6: Add social and structured metadata to BaseLayout**

Modify `src/layouts/BaseLayout.astro`. Add a `jsonLd` prop to the existing `Props` interface, add the image meta tags, and restore `twitter:card` now that an image exists:

```astro
interface Props {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}
```

In `<head>`, after the existing Open Graph tags:

```astro
    <meta property="og:image" content={new URL('/og.png', Astro.site ?? 'https://idowuseyi.dev').href} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="alternate" type="application/rss+xml" title="Oluwaseyi Idowu — Writing" href="/rss.xml" />
    {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
```

Keep every existing tag, the `noscript` `.reveal` fallback, the favicon link and the reveal script exactly as they are.

- [ ] **Step 7: Emit BlogPosting JSON-LD from PostLayout**

Modify `src/layouts/PostLayout.astro`. Build the object in the frontmatter and pass it through:

```astro
const site = Astro.site?.href ?? 'https://idowuseyi.dev/';
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description,
  datePublished: iso,
  author: { '@type': 'Person', name: 'Oluwaseyi Idowu', url: site },
  publisher: { '@type': 'Person', name: 'Oluwaseyi Idowu', url: site },
  mainEntityOfPage: new URL(canonicalPath, site).href,
  keywords: tags.join(', '),
};
```

Then pass `jsonLd={jsonLd}` to `BaseLayout`.

- [ ] **Step 8: Exclude tag pages from the sitemap**

Modify the sitemap filter in `astro.config.mjs`. It currently excludes the two status pages; extend it to also exclude tag pages, which are `noindex`:

```js
    sitemap({
      filter: (page) =>
        !/\/(thanks|contact-error)\/?$/.test(page) && !/\/writing\/tags\//.test(page),
    }),
```

- [ ] **Step 9: Build, then run the feed test**

```bash
npm run build
npx vitest run tests/feed.test.ts
```
Expected: build succeeds; 8 tests pass.

Then verify the metadata landed:
```bash
grep -o 'property="og:image" content="[^"]*"' dist/client/index.html | head -1
grep -o 'name="twitter:card" content="[^"]*"' dist/client/index.html | head -1
grep -c 'application/ld+json' dist/client/writing/why-schema-validated-llm-output/index.html
grep -o '"@type":"BlogPosting"' dist/client/writing/why-schema-validated-llm-output/index.html | head -1
grep -c 'writing/tags' dist/client/sitemap-0.xml
grep -o 'type="application/rss+xml"' dist/client/index.html | head -1
```
Expected: `og:image` is an absolute URL; `twitter:card` is `summary_large_image`; the post page has exactly one JSON-LD block containing `BlogPosting`; the sitemap contains **zero** tag-page entries; the feed is advertised via `<link rel="alternate">`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/pages/rss.xml.ts public/og.* src/layouts/BaseLayout.astro src/layouts/PostLayout.astro astro.config.mjs tests/feed.test.ts
git commit -m "feat: RSS feed, social preview image and BlogPosting metadata

Feed items for external posts point at their publisher rather than at a page
this site does not have. Restores twitter:card now that an og:image exists —
it previously promised an image that was absent, which renders worse than no
card at all. Tag pages are excluded from the sitemap to match their noindex."
```

---

## Task 5: Homepage Writing section, View Transitions and CI

**Files:**
- Create: `src/components/Writing.astro`
- Modify: `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `tests/homepage.test.ts`, `lighthouserc.json`, `.github/workflows/ci.yml`
- Test: `tests/homepage.test.ts` (extend)

**Interfaces:**
- Consumes: the `posts` collection (Task 1), `PostCard` (Task 3).
- Produces: `Writing.astro` (no props) rendering the three most recent non-draft posts with a link to `/writing/`, mounted on the homepage between Experience and Contact with `id="writing"`.

- [ ] **Step 1: Write the failing test**

Extend `tests/homepage.test.ts`. Add these tests **inside the existing
`describe('homepage', ...)` block**, and leave every existing test unchanged.

They use the module-scoped `html` that the file's `beforeAll` populates. That
`beforeAll` currently sits outside the `describe`, so a top-level test would
also work — but placing them inside keeps them correct if anyone ever moves it.

```ts
test('presents the writing section between experience and contact', () => {
  const experience = html.indexOf('id="experience"');
  const writing = html.indexOf('id="writing"');
  const contact = html.indexOf('id="contact"');
  expect(writing).toBeGreaterThan(experience);
  expect(contact).toBeGreaterThan(writing);
});

test('links to the writing index', () => {
  expect(html).toContain('href="/writing/"');
});

test('advertises the feed', () => {
  expect(html).toContain('type="application/rss+xml"');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/homepage.test.ts`
Expected: FAIL — `id="writing"` is absent, so `writing` is `-1` and the ordering assertion fails.

- [ ] **Step 3: Write the Writing section**

Create `src/components/Writing.astro`:

```astro
---
import { getCollection } from 'astro:content';
import PostCard from './PostCard.astro';

const posts = (await getCollection('posts'))
  .filter((p) => !p.data.draft)
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
  .slice(0, 3);
---
<section class="writing-section" id="writing">
  <div class="wrap">
    <h2 class="writing-section__title">Writing</h2>
    <p class="writing-section__lede">
      Explaining the hard parts. Pieces published elsewhere are marked.
    </p>
    <div class="writing-section__list">
      {posts.map((post) => <PostCard post={post} />)}
    </div>
    <p class="writing-section__more mono"><a href="/writing/">All writing →</a></p>
  </div>
</section>

<style>
  .writing-section {
    padding-block: var(--space-xl);
    border-top: 1px solid var(--border);
  }
  .writing-section__title {
    font-size: var(--step-2);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .writing-section__lede { color: var(--muted); margin-top: var(--space-s); }
  .writing-section__list { margin-top: var(--space-l); }
  .writing-section__more { margin-top: var(--space-l); font-size: var(--step--1); }
  .writing-section__more a { color: var(--muted); text-decoration: none; }
  .writing-section__more a:hover { color: var(--text); }
</style>
```

- [ ] **Step 4: Mount it on the homepage**

Modify `src/pages/index.astro`: import `Writing` and place `<Writing />` between `<Timeline />` and `<Contact />`. Change nothing else.

- [ ] **Step 5: Add View Transitions**

The spec calls for the View Transitions API, which had nothing to transition between until this plan added routes.

First confirm the export name in the installed Astro — it was renamed from `ViewTransitions` to `ClientRouter`, and guessing wrong is a build error:

```bash
node -e "const fs=require('fs');const p='node_modules/astro/components/index.ts';console.log(fs.existsSync(p)?fs.readFileSync(p,'utf8'):'(check node_modules/astro/components/)')"
ls node_modules/astro/components/
```

Then add the confirmed component to `BaseLayout.astro`'s `<head>`:

```astro
import { ClientRouter } from 'astro:transitions';
```
```astro
    <ClientRouter />
```

Report which name you used and how you confirmed it.

**Budget check:** `ClientRouter` ships a client-side router (~5KB). The homepage budget is < 30KB blocking JS and currently sits at 1.5KB. Measure after building. **If adding it pushes the homepage over budget, do not loosen the threshold — report the real numbers and leave `ClientRouter` out**, noting that view transitions are a progressive enhancement the site does not depend on.

- [ ] **Step 6: Extend the Lighthouse run to the new pages**

`lighthouserc.json` currently collects only `/index.html`, because the `noindex` status pages correctly fail the SEO assertion. `/writing/` and the post page are indexable and should be gated. Add them:

```json
      "url": ["/index.html", "/writing/index.html", "/writing/why-schema-validated-llm-output/index.html"],
```

Leave every assertion threshold exactly as it is.

- [ ] **Step 7: Make the build-output tests run in CI**

`tests/feed.test.ts` and the case-study build assertion read from `dist/`, so they only mean anything after a build. In `.github/workflows/ci.yml`, the current order is `npm test` then `npm run build`. Reverse it so build-output assertions are real in CI, and keep a second test run so a failure is attributable:

```yaml
      - name: Build
        run: npm run build
      - name: Unit and build-output tests
        run: npm test
```

- [ ] **Step 8: Run everything**

```bash
npm run build
npm test
npx lhci autorun
npx wrangler deploy --dry-run
```
Expected: build succeeds; all tests pass; every Lighthouse assertion passes on all three pages; the dry run resolves.

Report the actual homepage script size and `total-byte-weight`, and the Lighthouse scores for `/writing/` and the post page.

- [ ] **Step 9: Commit**

```bash
git add src/components/Writing.astro src/pages/index.astro src/layouts/BaseLayout.astro tests/homepage.test.ts lighthouserc.json .github/workflows/ci.yml
git commit -m "feat: homepage writing section, view transitions and CI coverage

Mounts the three most recent posts between Experience and Contact. CI now
builds before testing, so the assertions that read dist/ are real rather than
skipped, and Lighthouse gates the two new indexable pages alongside the
homepage."
```

---

## Verification checklist

Before this plan is considered complete:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes — expect ~37 new tests on top of Plan 1's 85
- [ ] `npx lhci autorun` passes every assertion on `/`, `/writing/` and the post page
- [ ] `npx wrangler deploy --dry-run` resolves
- [ ] `dist/client/rss.xml` exists; external items link to their publisher, native items to this site
- [ ] No page directory exists under `dist/client/writing/` for any external post
- [ ] Tag pages carry `noindex` and appear **zero** times in `sitemap-0.xml`
- [ ] `og:image` resolves to an absolute URL and the file is under 100KB
- [ ] The post page contains exactly one `BlogPosting` JSON-LD block
- [ ] `grep -rn "5+ years" src/` returns nothing
- [ ] Every page renders correctly at 360px width with no horizontal scroll
- [ ] With `prefers-reduced-motion: reduce`, no transitions run and all content is visible
- [ ] With JavaScript disabled, `/writing/` and the post page show their content (the `noscript` `.reveal` fallback covers `PostCard`'s `reveal` class)

---

## Out of scope

| Deferred | To |
|---|---|
| Per-post generated OG images (Satori) | A later plan, at ~5 native posts |
| Syndicating native posts to Dev.to / Hashnode with `canonical_url` back here | Manual, per post — it is a publishing action, not code |
| Comments | Not planned |
| Full-text search | Not planned until the archive justifies it |
| A `/writing` pagination scheme | Not until there are more than ~20 posts |
