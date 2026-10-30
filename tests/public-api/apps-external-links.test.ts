import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('sandboxed widget opens an approved external link only after host confirmation', async ({
  page,
}) => {
  await page.context().route('https://example.com/**', route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>External report</h1>',
    })
  );
  await page.goto('/bundle-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('link', { name: 'View full report' }).click();
  const dialog = page.getByRole('dialog', { name: 'Open external link' });
  await expect.poll(() => dialog.isVisible()).toBe(true);
  expect(await dialog.textContent()).toContain(
    'https://example.com/report?source=widget'
  );
  expect(page.context().pages()).toHaveLength(1);
  expect(await page.locator('iframe').getAttribute('sandbox')).toBe(
    'allow-scripts'
  );
  await dialog.getByRole('button', { name: 'Cancel' }).press('Escape');
  await expect.poll(() => dialog.count()).toBe(0);
  await app.getByRole('link', { name: 'View full report' }).press('Enter');
  const opened = page.context().waitForEvent('page');
  await dialog.getByRole('link', { name: 'Open example.com' }).click();
  const external = await opened;
  await external.waitForLoadState();
  expect(external.url()).toBe('https://example.com/report?source=widget');
  expect(await external.evaluate(() => window.opener)).toBeNull();
  expect(await external.evaluate(() => document.referrer)).toBe('');
  await expect.poll(() => dialog.count()).toBe(0);
});

test('denied and unsafe widget links do not navigate', async ({ page }) => {
  await page.goto('/bundle-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('link', { name: 'Denied report' }).click();
  await expect
    .poll(() =>
      app.getByRole('alert').filter({ hasText: 'Could not open' }).isVisible()
    )
    .toBe(true);
  expect(await page.getByRole('dialog').count()).toBe(0);
  expect(
    await app.getByText('Unsafe report', { exact: true }).getAttribute('href')
  ).toBeNull();
  expect(page.context().pages()).toHaveLength(1);
});

test('iframe reload dismisses a pending host confirmation and permits another request', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/bundle-host');
  await page.getByRole('button', { name: 'Change theme' }).click();
  const app = page.frameLocator('iframe');
  const link = app.getByRole('link', { name: 'View full report' });
  await link.click({ button: 'middle' });
  const dialog = page.getByRole('dialog', { name: 'Open external link' });
  await expect.poll(() => dialog.isVisible()).toBe(true);
  await page.locator('iframe').evaluate(frame => {
    frame.setAttribute('src', frame.getAttribute('src')!);
  });
  await expect.poll(() => dialog.count()).toBe(0);
  await link.click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => dialog.count()).toBe(0);
  expect(page.context().pages()).toHaveLength(1);
});
