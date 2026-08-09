import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/tutorials/',
  '/tutorials/devops-networking/',
  '/tutorials/devops-networking/networking-and-ip-addresses/',
  '/notes/',
  '/about/',
  '/search/',
];

for (const path of pages) {
  for (const theme of ['light', 'dark', 'sepia']) {
    test(`axe: ${path} [${theme}]`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate((t) => {
        localStorage.setItem('theme', t);
        document.documentElement.dataset['theme'] = t;
      }, theme);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
