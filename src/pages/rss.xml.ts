import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { SITE, withBase } from '../lib/site';

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
  const home = new URL(withBase(''), origin).href;
  const feed = new URL(withBase('rss.xml'), origin).href;

  const items = posts
    .map((post) => {
      const url = new URL(withBase(`posts/${encodeURIComponent(post.id)}/`), origin).href;
      return [
        '<item>',
        `<title>${escapeXml(post.data.title)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<pubDate>${post.data.pubDate.toUTCString()}</pubDate>`,
        `<description>${escapeXml(post.data.description)}</description>`,
        ...post.data.tags.map((tag) => `<category>${escapeXml(tag)}</category>`),
        '</item>',
      ].join('');
    })
    .join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(SITE.title)}</title>`,
    `<link>${home}</link>`,
    `<description>${escapeXml(SITE.description)}</description>`,
    `<language>${SITE.locale}</language>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `<atom:link href="${feed}" rel="self" type="application/rss+xml" />`,
    items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
