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

/** The minimal shape `groupByTagSlug` needs from a post/entry. */
export interface TaggedEntry {
  data: { tags: string[] };
}

/**
 * Groups entries by `tagSlug(tag)`, keeping the first-seen spelling as the
 * group's display label.
 *
 * Two tags that are spelled differently but slug identically (`'AI Systems'`
 * and `'AI-Systems'` both slug to `'ai-systems'`) must not merge silently
 * under whichever one happened to appear first — that quietly relabels one
 * author's tag as another's with no warning. Merging under one label is only
 * fine when the labels already match exactly; a same-slug, different-label
 * collision throws instead, naming both labels and the shared slug so it can
 * be fixed at the source (by renaming one of the tags to match).
 */
export function groupByTagSlug<T extends TaggedEntry>(
  posts: readonly T[],
): Map<string, { label: string; posts: T[] }> {
  const bySlug = new Map<string, { label: string; posts: T[] }>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const existing = bySlug.get(slug);
      if (!existing) {
        bySlug.set(slug, { label: tag, posts: [post] });
        continue;
      }
      if (existing.label !== tag) {
        throw new Error(
          `Tag slug collision: "${existing.label}" and "${tag}" both slug to "${slug}". ` +
            'Rename one of these tags so their spelling matches, or so they no longer collide.',
        );
      }
      existing.posts.push(post);
    }
  }

  return bySlug;
}
