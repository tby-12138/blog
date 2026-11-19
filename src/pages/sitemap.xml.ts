import type { APIRoute } from 'astro';
import { collectTags, getPosts, tagSlug } from '../lib/posts';
import { withBase } from '../lib/site';

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const origin = site ?? new URL('http://localhost:4321');
  const tags = [...collectTags(posts).keys()];

  const baseEntries = [
    { path: '', lastmod: posts[0]?.data.pubDate },
    { path: 'tags/', lastmod: posts[0]?.data.pubDate },
    { path: 'about/', lastmod: undefined },
  ];

  const urls = [
    ...baseEntries.map((entry) => ({
      loc: new URL(withBase(entry.path), origin).href,
      lastmod: entry.lastmod,
    })),
    ...posts.map((post) => ({
      loc: new URL(withBase(`posts/${encodeURIComponent(post.id)}/`), origin).href,
      lastmod: post.data.updatedDate ?? post.data.pubDate,
    })),
    ...tags.map((tag) => ({
      loc: new URL(withBase(`tags/${encodeURIComponent(tagSlug(tag))}/`), origin).href,
      lastmod: undefined,
    })),
  ];

  const body = urls
    .map(
      (entry) =>
        `<url><loc>${escapeXml(entry.loc)}</loc>${
          entry.lastmod ? `<lastmod>${entry.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''
        }</url>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
