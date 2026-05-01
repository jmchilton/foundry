// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';
import remarkWikiLinks from './src/lib/remark-wiki-links.ts';
import remarkCorpusCitations from './src/lib/remark-corpus-citations.ts';

export default defineConfig({
  site: 'https://jmchilton.github.io',
  base: '/foundry',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [
      [remarkWikiLinks, { contentDir: '../content', base: '/foundry' }],
      [remarkCorpusCitations, { repoRoot: '..' }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/.obsidian/**', '**/content/log.md'],
      },
    },
  },
});
