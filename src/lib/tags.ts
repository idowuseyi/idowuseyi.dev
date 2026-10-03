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
