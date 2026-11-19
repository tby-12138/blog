export const SITE = {
  title: '白雲札記',
  description: '记录技术、阅读与生活里值得留下的片段。',
  author: '白雲',
  since: 2026,
  locale: 'zh-CN',
  github: '',
};

/** 末尾一定带 "/"：本地为 "/"，GitHub Pages 项目站点为 "/repo/" */
export const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** 给站内路径加上 base 前缀，传入 "posts/abc/" 或 "/posts/abc/" 均可 */
export function withBase(path = ''): string {
  return `${BASE}${path.replace(/^\/+/, '')}`;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 统一用 UTC 取日期，避免 frontmatter 的日期在构建机时区里漂移 */
export function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function postUrl(slug: string): string {
  return withBase(`posts/${encodeURIComponent(slug)}/`);
}

export function tagUrl(slug: string): string {
  return withBase(`tags/${encodeURIComponent(slug)}/`);
}
