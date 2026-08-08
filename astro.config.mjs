// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';

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
  integrations: [
    // expressiveCode must come before mdx
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      themeCssSelector: (theme) =>
        theme.type === 'dark'
          ? "[data-theme='dark']"
          : "[data-theme='light'],[data-theme='sepia'],:root:not([data-theme])",
      useDarkModeMediaQuery: false,
      styleOverrides: {
        borderRadius: '6px',
        borderColor: 'var(--line)',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.85rem',
        uiFontFamily: 'var(--font-sans)',
      },
    }),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/styleguide/'),
    }),
    pagefind(),
  ],
});
