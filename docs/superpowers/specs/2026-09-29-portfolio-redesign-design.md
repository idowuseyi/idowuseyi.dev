# idowuseyi.dev — Portfolio Redesign Design Spec

**Date:** 2026-09-29
**Status:** Approved, ready for implementation planning
**Repo:** `idowuseyi/seyi.dev` (branch `redesign/v2`)

---

## 1. Purpose

Replace the current single-file static portfolio with a conversion-optimised,
content-driven site that positions Oluwaseyi Idowu as an **AI systems / agent
infrastructure engineer**, hosts a native technical blog, and measurably converts
recruiter traffic into calls and CV downloads.

### Success criteria

| Criterion | Target |
|---|---|
| Primary conversion | Recruiter books a call **or** downloads the CV |
| Secondary conversion | Client submits a project enquiry |
| Largest Contentful Paint | < 1.5s on simulated 3G |
| Blocking JavaScript (homepage) | < 30KB |
| Lighthouse (all four categories) | >= 95 |
| Every featured project | Carries verifiable evidence: a live demo link, a public repo link, or a stated reason it has neither |
| Measurement | Full funnel instrumented in PostHog from landing to conversion |

---

## 2. Audience and conversion model

**Primary audience:** recruiters and hiring managers at remote-first AI
infrastructure, developer-tooling and backend-heavy companies.
**Secondary audience:** founders and CTOs seeking contract or fractional work.

The design assumes an **8-second scan budget** before the visitor decides whether
to continue.

### CTA hierarchy

| Rank | Action | Placement | Rationale |
|---|---|---|---|
| Primary | **Book a 20-min call** | Hero, mid-page break, sticky header after scroll, contact section | Highest-value conversion |
| Secondary | **Download CV (PDF)** | Always directly beside the primary | Lower-friction rung of the same ladder; captures visitors not ready to commit time |
| Tertiary | **Start a project** | Contact section only, visually quieter | Serves the client path without signalling ambivalence about full-time roles |

Two CTAs sit side by side deliberately, because they occupy *different commitment
levels* rather than competing. Two CTAs at the same level would impose a real
decision and cost attention.

---

## 3. Positioning

**Headline:** AI systems engineer — "I build the infrastructure agents run on."

**Rationale.** Generalist fullstack postings are down ~49% since 2020 while AI
engineer roles are up ~59% (see `research/` in the job-agent repo). The same
evidence framed as AI infrastructure competes in the growing pool. AI systems
engineering *is* backend engineering — async concurrency, connection pooling,
caching, webhook verification, latency budgets, cost control — so no backend
evidence is discarded.

**Keyword strategy.** Headline and body are optimised independently:

- The **headline** is narrow and sharp, for the human decision.
- The **body** (competency line, case-study text, tech tags) carries the full
  backend keyword surface — Rust, TypeScript, Python, PostgreSQL, Redis, Axum,
  NestJS, distributed systems — so recruiter and ATS search still match.

### Factual corrections carried by this redesign

1. **"5+ years" becomes "3+ years."** The earliest dated role is January 2023.
   The current claim does not survive a LinkedIn cross-check.
2. **Every project gains verifiable evidence.** The current site has neither a
   live demo nor a repo link on any project. See the evidence rule in section 6.

---

## 4. Information architecture

| # | Section | Job it does |
|---|---|---|
| 1 | Hero + proof strip | Position, availability, CTA, credibility inside 8 seconds |
| 2 | Case study 1 — **KO OS** | Multi-provider LLM layer, agentic tool calling, paid eval suites. Write-up plus architecture diagram; no public repo required |
| 3 | Case study 2 — **RAG & semantic search** | Live interactive demo. Highest-conversion element on the site |
| 4 | Case study 3 — **Rust microservices** | Public repo, README, tests, CI badge. Proves Rust is real |
| 5 | CTA break | Book a call / Download CV, before the long tail |
| 6 | Experience timeline | Eight roles, one line each, expandable. Absorbs Techivate and the Leadership section |
| 7 | Writing | Three latest posts from the MDX blog |
| 8 | Contact | Working form, primary CTA, quiet client door |

The current site's fourth case study (Techivate e-commerce) and its standalone
Leadership section **collapse into the timeline**. They continue to earn
credibility without competing for the reader's decision budget.

### Above the fold

```
┌──────────────────────────────────────────────────────┐
│  idowuseyi.dev    Work  Writing  About    [Book call]│
├──────────────────────────────────────────────────────┤
│   AVAILABLE FOR SENIOR / STAFF ROLES                 │
│                                                      │
│   AI systems engineer.                               │
│   I build the infrastructure agents run on.          │
│                                                      │
│   Rust and TypeScript backends for LLM systems —     │
│   multi-provider routing, RAG retrieval, agentic     │
│   tool calling, and the eval suites that keep them   │
│   honest. 3+ years shipping production systems in    │
│   health-tech, fintech and developer tooling.        │
│                                                      │
│   [ Book a 20-min call ]  [ Download CV ↓ ]          │
│                                                      │
│   Rust · TypeScript · Python · PostgreSQL · Redis    │
│   Axum · NestJS · Distributed Systems · Evals        │
├──────────────────────────────────────────────────────┤
│   1k+ docs indexed · 10k+ daily users · 99.9%        │
│   2× HNG Finalist · ALX Certified Backend Engineer   │
└──────────────────────────────────────────────────────┘
```

The availability pill is the first element read, because recruiters filter on
availability before skill.

---

## 5. Visual system

**Direction:** "Systems Dossier" visual language on a conversion-optimised
landing architecture. Dark, precise, diagram-forward; reference points are
Linear, Railway, Resend and brittanychiang.com.

**Theme:** dark only. One theme designed properly rather than two designed
adequately; halves the design, diagram and testing surface.

### Colour tokens

```
--base      #08090A   near-black (pure black crushes shadow detail)
--surface   #101113   cards, elevated blocks
--border    #1E2023   hairlines
--text      #EDEEF0   primary copy
--muted     #8A8F98   secondary copy
--accent    #4ADE80   CTAs, live indicators, diagram highlights ONLY
```

The current site has no accent colour, which is why nothing on it asks to be
clicked. A single accent reserved exclusively for actions and live signals is
what converts a brochure into a funnel.

### Typography

| Role | Face | Use |
|---|---|---|
| Display | Geist Sans (fallback Inter Tight) | Hero, section titles; tracking -0.03em |
| Body | Inter | Prose, case-study copy |
| Mono | Geist Mono (fallback JetBrains Mono) | Metrics, tech tags, code, diagram labels, availability pill |

Mono-for-metrics is the signature move of the infrastructure aesthetic: it makes
`99.9%` read as measured rather than claimed.

### Motion principles

1. Motion never delays content. Text renders at full opacity; animation is
   additive. **The existing "Loading…" overlay is removed** — it spends the
   8-second budget before saying anything.
2. **View Transitions API** for navigation: native, zero JS cost, genuinely seamless.
3. Scroll-reveal <= 300ms via `IntersectionObserver`, fires once, fully disabled
   under `prefers-reduced-motion`.
4. **One signature moment, not many.** The live RAG demo is it.
5. Nothing animates on mobile at the cost of scroll smoothness.

### Performance budget (enforced in CI)

- LCP < 1.5s on simulated 3G
- < 30KB blocking JS on the homepage; PostHog and the RAG island load deferred
  and are excluded from the LCP path
- Lighthouse >= 95 in all four categories
- **The 4.6MB `assets/video.mp4` hero is deleted.** Any motion background returns
  compressed under 400KB, lazy-loaded, poster-framed, reduced-motion-aware.

The budget is set before design, not after, so the design is made within it.

---

## 6. Technical architecture

**Stack:** Astro + MDX, deployed to Cloudflare Workers (existing account, existing
`wrangler.jsonc` pattern). Astro ships zero JS by default and hydrates only
declared islands, which is what allows both the load budget and the animation.

**Styling:** vanilla CSS with custom properties. The design system is ~12 tokens
and one theme; Astro scopes component styles automatically, removing the main
reason to reach for Tailwind.

### Repository layout

```
idowuseyi.dev/
├── src/
│   ├── content/
│   │   ├── posts/           # MDX blog posts
│   │   ├── projects/        # MDX case studies (content, not markup)
│   │   └── config.ts        # Zod schemas for typed frontmatter
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── CaseStudy.astro
│   │   ├── Diagram.astro    # Mermaid -> inline SVG at build time
│   │   ├── MetricRow.astro
│   │   ├── CTA.astro
│   │   └── islands/
│   │       ├── RagDemo.tsx
│   │       └── ContactForm.tsx
│   ├── layouts/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── work/[slug].astro
│   │   ├── writing/index.astro
│   │   ├── writing/[slug].astro
│   │   ├── og/[...route].ts
│   │   └── rss.xml.ts
│   └── styles/tokens.css
├── functions/api/contact.ts
├── functions/api/rag.ts
├── public/resume.pdf
├── .github/workflows/ci.yml
└── wrangler.jsonc
```

### Content model

Case studies and posts live in content collections with **Zod-validated
frontmatter**.

**The evidence rule.** Every project must declare at least one of `liveUrl` or
`repoUrl`. A project with neither must set `evidence: 'writeup-only'` together
with a non-empty `evidenceNote` explaining why (for example, proprietary code).
The schema is a discriminated union, so a project that satisfies none of these
**fails the build**, and a `writeup-only` project with no stated reason also
fails.

This encodes the blueprint's central rule as a type while accommodating
proprietary work. It prevents the current site's single largest defect — projects
a recruiter cannot verify — without forcing a dead link or an empty repo.

Applied to the three launch case studies:

| Case study | Evidence |
|---|---|
| KO OS | `evidence: 'writeup-only'`, note: proprietary; carries architecture diagram and eval methodology |
| RAG & semantic search | `repoUrl` from Phase 2; `liveUrl` added in Phase 4 when the demo ships |
| Rust microservices | `repoUrl` plus README, tests and CI badge |

### Diagrams

Mermaid definitions are rendered to **inline SVG at build time**, not at runtime.
Identical visuals at zero JS cost, and inline SVG inherits the CSS colour tokens
so diagrams recolour with the design system.

---

## 7. The RAG demo

Built on **Cloudflare Workers AI + Vectorize**, inside the existing Cloudflare
account.

- Pre-indexed corpus (Oluwaseyi's own writing and project docs). No upload flow,
  therefore no user-content risk.
- Visitor submits a question; the demo streams an answer with cited source chunks
  and their retrieval scores.
- **Rate limited per IP via Workers KV, with a hard daily ceiling and a billing
  alert.**

The cost ceiling is both a safeguard and evidence: the blueprint asks explicitly
for cloud cost optimisation, and a documented rate-limit-and-budget design
answers that better than a claim.

---

## 8. Blog strategy

The three existing posts remain on **Mastra.ai, Medium and Dev.to**; their
canonical URLs belong to those publishers and moving them would lose their links.

Going forward the relationship inverts:

1. **Publish natively** on `idowuseyi.dev/writing/` first.
2. **Syndicate** to Dev.to / Hashnode with `canonical_url` pointing back.
3. The Writing section mixes native and external posts, with external posts badged.

This keeps SEO equity and traffic on the domain. The current arrangement does the
opposite — every post builds another platform's asset.

**Machinery, all build-time:** content collections, RSS, tags, reading time,
Shiki syntax highlighting, per-post generated OG images, `BlogPosting` JSON-LD.

---

## 9. Contact and booking

Both paths are provided:

- **Book a call** opens an inline **Cal.com** embed, so the visitor never leaves
  the site. Removes the scheduling round-trip that kills most enquiries.
- **Contact form** (name, company, role, message) posts to
  `functions/api/contact.ts`, a Cloudflare Worker that delivers by email, for
  visitors who would rather write.

---

## 10. Measurement

**PostHog**, loaded after LCP so it cannot affect the performance budget.

Funnel:

```
Landed -> Scrolled past hero -> Viewed a case study
       -> Interacted with RAG demo
       -> Clicked CTA -> Booked call / Downloaded CV
```

Events: `cta_click` (with placement), `cv_download`, `rag_demo_query`,
`case_study_expand`, `contact_submit`, `booking_complete`.

Session replay identifies where recruiters stall. Once traffic exists, hero copy
becomes an A/B test rather than an opinion. This is what makes the redesign
improvable rather than merely new.

---

## 11. SEO and machine readers

- `Person` and `BlogPosting` JSON-LD — increasingly how AI-driven screening tools
  parse candidates
- Per-page OG images generated at build time (Satori)
- `llms.txt` — a plain-text summary for LLM crawlers
- Resume PDF at a stable `/resume.pdf`, one click, no gate

---

## 12. Rollout

| Phase | Deliverable | Gate |
|---|---|---|
| 1 | Astro scaffold, design tokens, hero, CTA wiring, preview deploy | Lighthouse >= 95 on a bare page |
| 2 | Case studies 1-3 as MDX with diagrams; timeline; contact form; Cal.com | Evidence rule satisfied for all three; every declared link resolves; form delivers |
| 3 | Blog: collections, RSS, OG images, syntax highlighting, three external posts badged | First native post published |
| 4 | RAG demo island, rate limiting, PostHog funnel | Cost ceiling verified under load |
| 5 | Cut over `idowuseyi.dev`, redirects, 60-second walkthrough video on case study 1 | Old site archived on a branch |

Phases 1-2 alone beat the current site on every conversion metric, so the launch
is never blocked on the demo being finished.

---

## 13. Domain

**Canonical: `idowuseyi.dev`** — matches the current site header, the GitHub
handle `@idowuseyi`, and existing writing bylines. The repository directory name
(`seyi.dev`) is left unchanged; it is not user-visible.

---

## 14. Risks

1. **Content is the bottleneck, not code.** The KO OS write-up, the Rust README
   and the RAG corpus must be authored by Oluwaseyi. Phase 2 stalls without real
   case-study copy.
2. **The RAG demo is a potential cost surprise.** Mitigated by per-IP rate limits,
   a hard daily ceiling and a billing alert.
3. **Cutting to three case studies demotes Techivate's 10k-daily-users metric**
   into the timeline. Accepted; revisit if that metric proves to be among the
   strongest evidence.
4. **"3+ years" is a reduction from the live site's "5+".** Correct for
   credibility and required for LinkedIn consistency; accepted.
5. **A GitHub personal access token is embedded in the `origin` remote URL** in
   `.git/config`. It must be rotated and replaced with SSH or a credential helper
   before any further push. Tracked as immediate remediation, outside this spec's
   scope.

---

## 15. Out of scope

- Redesigning or reissuing the resume PDF itself (owned by the job-application agent)
- A CMS or visual editor; content is authored as MDX in the repo
- Light mode
- Internationalisation
- Comments on blog posts
