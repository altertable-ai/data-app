import { describe, expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

describe('runtime-errors', () => {
  test('uncaught React rendering failures hide the app and offer retry', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Crash render' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() =>
        page
          .frameLocator('iframe')
          .getByRole('button', { name: 'Query', exact: true })
          .isVisible()
      )
      .toBe(true);
  });

  for (const failure of ['syntax', 'execution']) {
    test(`bundle ${failure} failures hide the app`, async ({ page }) => {
      await page.goto(`/bundle-host?broken=1&${failure}=1`);
      await expect
        .poll(() => page.getByRole('alert').textContent())
        .toContain('Could not load');
      await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
    });
  }

  test('delayed exceptions from the app bundle remain fatal', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Crash callback' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
  });

  test('unhandled rejections from the app bundle remain fatal', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Reject promise' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
  });
});

test('a failed embedded app can recover with a corrected bundle and bootstrap failures settle', async ({
  page,
}) => {
  await page.goto('/bundle-host?packaged=1&broken=1');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain('Could not load');
  await page.getByRole('button', { name: 'Fix bundle', exact: true }).click();
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Query', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .frameLocator('iframe')
        .getByRole('status', { name: 'Query result', exact: true })
        .textContent()
    )
    .toContain('"version":1');
  await page.goto('/bundle-host?timeout=1');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain('Could not load');
});
