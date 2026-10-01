import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Brand from '../src/components/Brand.astro';
import { profile } from '../src/data/profile';

test('brand renders the canonical domain', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Brand);
  expect(html).toContain(profile.domain);
});
