import type { Post } from '../schemas/post';

/**
 * The feed's decisions, kept free of `astro:content` so they can be tested
 * without a populated content store (which `getCollection` cannot give us
 * under `vitest run` — see tests/case-study.test.ts).
 */

/** The shape the feed needs from a post entry: its id and its frontmatter. */
export interface FeedEntry {
  id: string;
  data: Post;
}

export interface FeedItem {
  title: string;
  description: string;
  pubDate: Date;
  categories: string[];
  link: string;
}

/** Non-draft posts, newest first. */
export function publishable<T extends FeedEntry>(entries: readonly T[]): T[] {
  return entries
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function toFeedItem(entry: FeedEntry): FeedItem {
  return {
    title: entry.data.title,
    description: entry.data.description,
    pubDate: entry.data.pubDate,
    categories: entry.data.tags,
    // An external post's canonical home is its publisher. Pointing the feed
    // item at a page this site does not have would be a dead link.
    link: entry.data.kind === 'external' ? entry.data.url : `/writing/${entry.id}/`,
  };
}

/**
 * The newest post date, not `new Date()`: a build-time clock would change
 * `<lastBuildDate>` on every rebuild and make the feed byte-unstable even when
 * nothing was published. Epoch when there is nothing to publish.
 */
export function lastBuildDate(entries: readonly FeedEntry[]): Date {
  return publishable(entries)[0]?.data.pubDate ?? new Date(0);
}

/** RSS 2.0 channel metadata that `@astrojs/rss` does not emit on its own. */
export function channelCustomData(entries: readonly FeedEntry[], selfHref: string): string {
  return [
    '<language>en-gb</language>',
    `<lastBuildDate>${lastBuildDate(entries).toUTCString()}</lastBuildDate>`,
    `<atom:link href="${selfHref}" rel="self" type="application/rss+xml"/>`,
  ].join('');
}
