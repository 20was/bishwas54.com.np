// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://bishwas54.com.np',
  // Trailing-slash discipline: Cloudflare serves `/about/` and redirects `/about`.
  // Keeping generated URLs, canonicals, and served URLs identical avoids
  // canonical-that-redirects SEO bugs.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  prefetch: true,
});
