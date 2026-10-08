import { z } from 'astro/zod';

const metric = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const common = {
  title: z.string().trim().min(1),
  kicker: z.string().trim().min(1),
  role: z.string().trim().min(1),
  order: z.number().int().positive(),
  blurb: z.string().trim().min(1),
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
