import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { channelCustomData, publishable, toFeedItem } from '../lib/feed';
import type { FeedEntry } from '../lib/feed';

const SITE_FALLBACK = 'https://idowuseyi.dev';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE_FALLBACK);
  const entries = (await getCollection('posts')) as unknown as FeedEntry[];

  return rss({
    title: 'Oluwaseyi Idowu — Writing',
    description:
      'AI systems, backend infrastructure, and the things that break in production.',
    site,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    items: publishable(entries).map(toFeedItem),
    customData: channelCustomData(entries, new URL('/rss.xml', site).href),
  });
}
