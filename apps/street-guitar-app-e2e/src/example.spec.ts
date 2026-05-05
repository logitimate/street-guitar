import { test, expect } from '@playwright/test';

test('home page loads and shows hero heading', async ({ page }) => {
  await page.goto('/');

  const h1 = page.locator('h1.hero-heading');
  await expect(h1).toBeVisible();
  await expect(h1).toContainText('STREET');
});

test('home page has navigation logo', async ({ page }) => {
  await page.goto('/');

  const logo = page.locator('.nav-logo');
  await expect(logo).toBeVisible();
  await expect(logo).toContainText('GUITAR');
});

test('home page has pricing section', async ({ page }) => {
  await page.goto('/');

  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await expect(page.locator('#pricing')).toBeVisible();
});
