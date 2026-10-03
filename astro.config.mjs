import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://idowuseyi.dev',
  // The Cloudflare adapter's Vite plugin (@cloudflare/vite-plugin) spins up its
  // own workerd dev runtime during Vite config resolution, which collides with
  // Vitest's own server attach ("There is already a server associated with the
  // config"). Astro core works around the analogous collision for its own dev
  // server by checking `process.env.VITEST` (see astro/dist/vite-plugin-astro-
  // server/plugin.js) — Vitest sets this env var automatically, so mirror that
  // pattern here and skip the adapter only under Vitest. `npm run dev/build/
  // preview/deploy` are unaffected.
  adapter: process.env.VITEST ? undefined : cloudflare(),
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !/\/(thanks|contact-error)\/?$/.test(page) }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
});
