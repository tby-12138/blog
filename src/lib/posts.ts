import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 按发布时间倒序；开发环境会把草稿也显示出来，生产构建自动隐藏 */
export async function getPosts(options: { includeDrafts?: boolean } = {}): Promise<Post[]> {
  const includeDrafts = options.includeDrafts ?? import.meta.env.DEV;
  const posts = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function collectTags(posts: Post[]): Map<string, number> {
  const tags = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }
  return new Map([...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')));
}

export function tagSlug(tag: string): string {
  return (
    tag
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[/\\?#%]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'tag'
  );
}

/** 中文按 400 字/分钟，英文按 200 词/分钟估算 */
export function readingMinutes(body = ''): number {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ');

  const cjk = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const words = text
    .replace(/[\u3400-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(cjk / 400 + words / 200));
}
