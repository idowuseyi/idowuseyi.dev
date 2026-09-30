export const experience = [
  {
    period: '2026 — Present',
    title: 'Co-Founder & CTO',
    org: 'KO Content Studios — KO OS',
    summary:
      'Co-founded the studio and built KO OS as its sole engineer, from first commit to production in three months — ~105k lines of TypeScript on Next.js 16, React 19 and PostgreSQL/Drizzle. Designed a provider-agnostic LLM layer on the Vercel AI SDK switching between six text providers, and a brand-aware assistant with function-calling tools over structured brand records.',
  },
  {
    period: '2025 — Present',
    title: 'Fullstack Engineer / Engineering Lead',
    org: 'Internova Technology — Theraptly',
    summary:
      'Lead and sole engineer on the Theraptly LMS, a HIPAA-oriented compliance training platform — ~1,000 of 1,675 commits across a ~184k-line codebase. Built an AI course-generation pipeline on Vertex AI turning compliance documents into schema-validated lessons and quizzes, a multi-tenant RBAC system with a matrix-conformance test suite, and four-tier Stripe billing with webhook handling.',
  },
  {
    period: '2024 — 2026',
    title: 'Backend Engineer',
    org: 'Sparkly — Community Monetization Platform',
    summary:
      'Owned payments-ledger correctness, background-job reliability and platform security across 243 commits. Eliminated a payout double-spend race with PostgreSQL row-level locking, enforced double-entry accounting invariants in the ledger write path, decomposed a 5,513-line payments god-service into twelve focused services, and restored Paystack webhook HMAC verification after forged charge.success events had been accepted as real.',
  },
  {
    period: '2024 — 2025',
    title: 'Software Engineer (Rust / NestJS) — 2× Finalist',
    org: 'HNG Internship (Cohorts 11 & 13)',
    summary:
      'Two cohorts, finalist in both. Built high-concurrency Rust microservices (Axum, Tokio, SQLx) for Google Auth and Paystack, a RAG and semantic search service on NestJS and ChromaDB, and the Telex cross-platform desktop app in Tauri 2. Architected a modular NestJS boilerplate adopted by 50+ developers.',
  },
  {
    period: '2025',
    title: 'Fullstack Mobile Engineer (Contract)',
    org: 'PayRent — Real-Estate Platform',
    summary:
      'Built a real-estate investment and rent management platform — cross-platform mobile app and backend API supporting tenants, landlords and property managers, with role-based access and real-time chat.',
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
    title: 'Backend Engineer / Chief Technology Officer',
    org: 'Fitzzy Systems Limited',
    summary:
      'Led backend architecture and engineering team delivery. Redesigned systems for 50% improved responsiveness. Introduced Docker and Kubernetes, standardizing deployment workflows across production infrastructure. Ran code reviews, mentoring and knowledge-sharing sessions.',
  },
  {
    period: '2023',
    title: 'Backend Lead (Internship)',
    org: 'Techivate Ltd — Secure E-Commerce',
    summary:
      'Led one of two parallel backend teams building the same e-commerce platform for military and security agencies; my team’s implementation shipped. Implemented httpOnly cookie sessions mitigating XSS for 10k+ daily users, integrated Stripe and Paystack checkout raising checkout success by 30%, and deployed on AWS EC2 with Redis caching that cut API latency by 50%.',
  },
  {
    period: '2023',
    title: 'Technical Writer',
    org: 'OpenReplay — Open-Source Developer Tool',
    summary:
      'Developer-focused technical content and implementation tutorials covering frontend architecture, APIs and modern JavaScript ecosystems. Also published with Mastra.ai, Medium and Dev.to.',
  },
] as const;
