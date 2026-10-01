import { expect, test } from '@playwright/test';

test('opaque bundle uses typed routes and virtual URL state without rerunning on handler changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const apiFrames: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/data/'))
      apiFrames.push(request.frame() === page.mainFrame() ? 'host' : 'app');
  });
  await page.goto('/bundle-host?period=last-30#totals');
  const app = page.frameLocator('iframe');
  await expect(page.locator('iframe')).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts'
  );
  await expect(app.locator('#location')).toHaveText('period=last-30#totals');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":1');
  await app.getByRole('button', { name: 'Data query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"data":true');
  await app.getByRole('button', { name: 'Denied query', exact: true }).click();
  await expect(app.locator('#result')).toHaveText(
    '{"publicError":true,"code":"forbidden"}'
  );
  await page.getByRole('button', { name: 'Change handler' }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
  await app.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/period=last-7#totals$/);
  await page.goBack();
  await expect(app.locator('#location')).toHaveText('period=last-30#totals');
  await page.goForward();
  await expect(app.locator('#location')).toHaveText('period=last-7#totals');
  await app.getByRole('button', { name: 'Clear filter' }).click();
  await expect(page).toHaveURL(/\/bundle-host#totals$/);
  await expect(app.locator('#location')).toHaveText('#totals');
  await page.goBack();
  await expect(app.locator('#location')).toHaveText('period=last-7#totals');
  const frame = page.frames().find(item => item !== page.mainFrame())!;
  expect(
    await frame.evaluate(() => {
      try {
        void parent.document;

        return false;
      } catch {
        return true;
      }
    })
  ).toBe(true);
  const blockedUrl = new URL('/__test/bundle', page.url()).href;
  const violation = await frame.evaluate(async url => {
    const violation = new Promise<{ directive: string; blockedURI: string }>(
      resolve => {
        document.addEventListener(
          'securitypolicyviolation',
          event => {
            resolve({
              directive: event.effectiveDirective,
              blockedURI: event.blockedURI,
            });
          },
          { once: true }
        );
      }
    );
    void fetch(url).catch(() => {});

    return violation;
  }, blockedUrl);
  expect(violation.directive).toBe('connect-src');
  // Browsers may strip a cross-origin URL's path from CSP reports.
  expect(new URL(violation.blockedURI).origin).toBe(new URL(blockedUrl).origin);
  await frame.evaluate(() => location.reload());
  await expect(page.locator('iframe')).toBeVisible();
  await expect(app.locator('#location')).toHaveText('period=last-7#totals');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
  await page.getByRole('button', { name: 'Change revision' }).click();
  await expect(app.locator('#location')).toHaveText('period=last-7#totals');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
  expect(errors).toEqual([]);
  expect(apiFrames).toEqual(['host', 'host']);
  const diagnostic = JSON.parse(
    (await page.locator('body').getAttribute('data-diagnostic'))!
  );
  expect(Object.keys(diagnostic).sort()).toEqual(['direction', 'type']);
});

test('bundle failures recover with a fresh frame and unavailable bootstraps time out', async ({
  page,
}) => {
  await page.goto('/bundle-host?broken=1');
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await page.getByRole('button', { name: 'Fix bundle' }).click();
  await expect(
    page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Query', exact: true })
  ).toBeVisible();
  await page.goto('/bundle-host?timeout=1');
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await expect(page.locator('iframe')).toBeHidden();
});

test('URL shell loads a separate-origin app and preserves navigation on reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/bundle-host?url=1&period=last-30#totals');
  const app = page.frameLocator('iframe');
  await expect(page.locator('iframe')).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    /allow-same-origin/
  );
  await expect(app.locator('#location')).toContainText('period=last-30');
  await expect(app.locator('#location')).toContainText('#totals');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":1');
  await page.getByRole('button', { name: 'Change handler' }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await app.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/period=last-7#daily$/);
  await page.goBack();
  await expect(app.locator('#location')).toContainText('period=last-30');
  await page.reload();
  await expect(app.locator('#location')).toContainText('period=last-30');
  expect(errors).toEqual([]);
});

test('Embedded surfaces retain toolbar actions and live theme changes without losing navigation', async ({
  page,
}) => {
  await page.goto('/bundle-host?period=last-30#totals');
  const app = page.frameLocator('iframe');
  await expect(
    app.getByRole('button', { name: 'Custom toolbar action' })
  ).toBeVisible();
  await expect(
    app.getByRole('heading', { name: 'Embedded report' })
  ).toHaveCount(0);
  await expect(
    app.getByRole('button', { name: 'Custom footer action' })
  ).toHaveCount(0);
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'dark');

  await page.getByRole('button', { name: 'Change theme' }).click();
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(app.locator('#location')).toHaveText('period=last-30#totals');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');

  await page.getByRole('button', { name: 'Change surface' }).click();
  await expect(
    app.getByRole('heading', { name: 'Embedded report' })
  ).toBeVisible();
  await expect(
    app.getByRole('button', { name: 'Custom footer action' })
  ).toBeVisible();
  await expect(
    app.getByRole('button', { name: 'Custom toolbar action' })
  ).toBeVisible();
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
});

test('parent presentation owns the theme until standalone system preferences are restored', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/bundle-host');
  const app = page.frameLocator('iframe');
  await page.getByRole('button', { name: 'Change theme' }).click();
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'light');

  await page
    .getByRole('button', { name: 'Toggle parent presentation' })
    .click();
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'light');

  await page
    .getByRole('button', { name: 'Toggle parent presentation' })
    .click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(app.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
});
