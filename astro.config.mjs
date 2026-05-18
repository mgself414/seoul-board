// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// GitHub Pages: 사용자/조직 site가 아닌 project page라 base 경로 필요.
// 추후 Cloudflare Pages 등 도메인 직속으로 옮길 때는 site만 바꾸고 base 제거.
const isGhPages = process.env.GH_PAGES === '1';

// https://astro.build/config
export default defineConfig({
  site: isGhPages ? 'https://mgself414.github.io' : 'http://localhost:4321',
  base: isGhPages ? '/seoul-board' : '/',
  trailingSlash: 'ignore',

  vite: {
    plugins: [tailwindcss()],
  },
});