import { expect, test } from '@playwright/test';

for (const kind of ['rejection', 'error'] as const) {
  test(`unrelated ${kind} leaves the app visible and connected`, async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    const app = page.frameLocator('iframe');
    await expect(
      app.getByRole('button', { name: 'Query', exact: true })
    ).toBeVisible();
    const frame = page
      .frames()
      .find(frame => frame.url().includes('/__test/runtime'))!;
    const reported = page.waitForEvent('pageerror');
    await frame.evaluate(kind => {
      const script = document.createElement('script');
      script.textContent =
        kind === 'rejection'
          ? 'Promise.reject(new Error("Extension connection failed"));\n//# sourceURL=inpage.js'
          : 'throw new Error("Injected script failed");\n//# sourceURL=inpage.js';
      document.body.append(script);
    }, kind);
    await reported;
    await expect(page.locator('iframe')).toBeVisible();
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect(app.locator('#result')).toContainText('"version":1');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('iframe')).toBeVisible();
  });
}

test('uncaught React rendering failures hide the app and offer retry', async ({
  page,
}) => {
  await page.goto('/bundle-host');
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Crash render' })
    .click();
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await expect(page.locator('iframe')).toBeHidden();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Query', exact: true })
  ).toBeVisible();
});

for (const failure of ['syntax', 'execution']) {
  test(`bundle ${failure} failures hide the app`, async ({ page }) => {
    await page.goto(`/bundle-host?broken=1&${failure}=1`);
    await expect(page.getByRole('alert')).toContainText('Could not load');
    await expect(page.locator('iframe')).toBeHidden();
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
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await expect(page.locator('iframe')).toBeHidden();
});

test('unhandled rejections from the app bundle remain fatal', async ({
  page,
}) => {
  await page.goto('/bundle-host');
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Reject promise' })
    .click();
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await expect(page.locator('iframe')).toBeHidden();
});

test('unattributed rejections remain diagnostics', async ({ page }) => {
  await page.goto('/bundle-host');
  const app = page.frameLocator('iframe');
  await expect(
    app.getByRole('button', { name: 'Query', exact: true })
  ).toBeVisible();
  const frame = page
    .frames()
    .find(frame => frame.url().includes('/__test/runtime'))!;
  const reported = page.waitForEvent('pageerror');
  await frame.evaluate(() => {
    void Promise.reject('Unknown rejection');
  });
  await reported;
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":1');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
