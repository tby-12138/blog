import { defineConfig } from 'astro/config';
import rehypeBasePath from './src/lib/rehype-base-path.mjs';

// GitHub Pages 的项目站点部署在 https://<user>.github.io/<repo>/ 下。
// CI 会通过 BASE_PATH 传入 "/<repo>"，本地开发则是 "/"。
const rawBase = process.env.BASE_PATH ?? '/';
const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;
const baseUrl = base === '/' ? '/' : `${base}/`;

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  base,
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
    rehypePlugins: [[rehypeBasePath, { base: baseUrl }]],
  },
});
