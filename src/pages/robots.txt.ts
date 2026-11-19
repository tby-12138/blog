import type { APIRoute } from 'astro';
import { withBase } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('http://localhost:4321');
  const sitemap = new URL(withBase('sitemap.xml'), origin).href;
  const admin = withBase('admin/');

  const body = [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${admin}`,
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
