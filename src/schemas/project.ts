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

const linked = z
  .object({
    ...common,
    evidence: z.literal('linked'),
    liveUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
  })
  .refine((data) => Boolean(data.liveUrl || data.repoUrl), {
    message: 'A linked project must define liveUrl or repoUrl.',
    path: ['evidence'],
  });

const writeupOnly = z.object({
  ...common,
  evidence: z.literal('writeup-only'),
  evidenceNote: z
    .string()
    .min(20, 'A writeup-only project must explain why it has no public link.'),
});

// A discriminated union keyed on `evidence` gives far better diagnostics than a
// plain union: Zod unions report every branch's failure, which is unreadable
// when these errors surface as build failures a human has to read. Zod (as
// re-exported by astro/zod) accepts a refined object schema as a
// discriminatedUnion branch here, so the `linked` branch's evidence-URL check
// still runs.
export const projectSchema = z.discriminatedUnion('evidence', [linked, writeupOnly]);

export type Project = z.infer<typeof projectSchema>;
