import { expect, test } from '@playwright/test';

test('home shows recent writing and navigates to a tutorial', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bishwas Adhikari/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page
    .getByRole('link', { name: /Lesson 01/ })
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/tutorials\/devops-networking\/networking-and-ip-addresses\//,
  );
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Lesson 01',
  );
});

test('theme choice persists across pages and reloads', async ({ page }) => {
  await page.goto('/');
  await page.locator('theme-switch label.sepia').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');

  await page.goto('/tutorials/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
});

test('search returns results', async ({ page }) => {
  await page.goto('/search/');
  await page.locator('pagefind-searchbox input').fill('DNS');
  await expect(page.locator('a', { hasText: /DNS/ }).first()).toBeVisible({
    timeout: 10_000,
  });
});

test('series navigation links consecutive lessons', async ({ page }) => {
  await page.goto('/tutorials/devops-networking/ports/');
  await page.getByRole('link', { name: /Next in series/ }).click();
  await expect(page).toHaveURL(/network-models-and-layers/);
});

test('series landing page lists lessons in part order', async ({ page }) => {
  await page.goto('/tutorials/devops-networking/');
  const parts = await page.locator('.lessons .meta').allTextContents();
  const orders = parts
    .map((t) => t.match(/^Part (\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  expect(orders.length).toBeGreaterThan(1);
  expect(orders).toEqual([...orders].sort((a, b) => a - b));
});

test('404 page offers a way back', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link', { name: /home page/ })).toBeVisible();
});
