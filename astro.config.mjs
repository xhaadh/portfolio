// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  vite: {
    // Cast: @tailwindcss/vite ships types for a newer Vite than Astro 5 bundles (runtime is fine).
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
