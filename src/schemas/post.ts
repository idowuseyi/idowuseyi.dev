import { z } from 'astro/zod';

// Only http/https are acceptable: a `javascript:` or `ftp:` URI may be
// URL-shaped but is not a link a reader can follow to the article. Mirrors
// the evidence-URL rule in src/schemas/project.ts.
const articleUrl = z.string().url({ protocol: /^https?$/ });

const common = {
  title: z.string().trim().min(1),
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

// Published elsewhere. The article itself lives at `url`, which keeps that
// publisher's canonical. Only `description` is ever rendered (PostCard and the
// feed both use it); an external post's MDX body is authored context for
// whoever edits the file and reaches no page.
const external = z
  .object({
    ...common,
    kind: z.literal('external'),
    platform: z.string().min(1),
    url: articleUrl,
  })
  .strict()
  .refine(
    (data) => {
      const hostname = new URL(data.url).hostname;
      return hostname !== 'idowuseyi.dev' && hostname !== 'www.idowuseyi.dev';
    },
    {
      message: 'An external post must point at another publisher, not this site.',
      path: ['url'],
    },
  );

// A discriminated union on `kind` gives readable build errors keyed to the
// variant, rather than a plain union's wall of every branch's failures.
export const postSchema = z.discriminatedUnion('kind', [native, external]);

export type Post = z.infer<typeof postSchema>;
