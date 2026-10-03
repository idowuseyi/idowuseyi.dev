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
