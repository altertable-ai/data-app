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
  await page.goto('/bundle-host?broken=1');
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

test('mounting sets document identity before rendering and supplies it to the app', async ({
  page,
}) => {
  await page.goto('/static?identity');
  const title = 'Activity report • test/test • Altertable app';
  await expect
    .poll(() => page.getByLabel('Document title at render').textContent())
    .toBe(title);
  expect(await page.title()).toBe(title);
  await expect
    .poll(() =>
      page
        .getByRole('heading', { name: 'Activity report', exact: true })
        .isVisible()
    )
    .toBe(true);
});

test('custom roots inherit the nearest app identity without component configuration', async ({
  page,
}) => {
  await page.goto('/static?custom-root');
  const first = page.getByRole('region', { name: 'First app', exact: true });
  const second = page.getByRole('region', { name: 'Second app', exact: true });
  await expect
    .poll(() =>
      first
        .getByRole('heading', { name: 'Activity report', exact: true })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      second
        .getByRole('heading', { name: 'Second report', exact: true })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() => second.getByText('other', { exact: true }).isVisible())
    .toBe(true);
});

test('app descriptions are inherited and presentation can override or hide them', async ({
  page,
}) => {
  await page.goto('/static');
  await expect
    .poll(() =>
      page
        .getByText('Explore activity across groups.', { exact: true })
        .isVisible()
    )
    .toBe(true);
  await page.goto('/static?override-description');
  await expect
    .poll(() =>
      page.getByText('Custom activity subtitle.', { exact: true }).isVisible()
    )
    .toBe(true);
  expect(
    await page
      .getByText('Explore activity across groups.', { exact: true })
      .count()
  ).toBe(0);
  await page.goto('/static?hide-description');
  await expect
    .poll(() =>
      page
        .getByRole('heading', { name: 'Activity report', exact: true })
        .isVisible()
    )
    .toBe(true);
  expect(
    await page
      .getByText('Explore activity across groups.', { exact: true })
      .count()
  ).toBe(0);
});
