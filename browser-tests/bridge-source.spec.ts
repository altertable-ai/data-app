import { expect, test } from '@playwright/test';

test('opaque bundle uses typed routes and virtual URL state without rerunning on handler changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const apiFrames: string[] = [];
  page.on('request', request => {
    if (
      request.url().includes('/api/data/') ||
      request.url().endsWith('/api/sql')
    )
      apiFrames.push(request.frame() === page.mainFrame() ? 'host' : 'app');
  });
  await page.goto('/bundle-host?period=last-30#totals');
  const app = page.frameLocator('iframe');
  await expect(page.locator('iframe')).toBeVisible();
  await expect(page.locator('iframe')).toHaveClass('app-frame');
  await expect(app.locator('body')).toHaveAttribute('data-bundle-version', '1');
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts'
  );
  await expect(app.locator('#location')).toHaveText('period=last-30#totals');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":1');
  await app.getByRole('button', { name: 'Data query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"data":true');
  await expect(app.locator('#result')).toContainText(
    'SELECT 1 AS connection_check'
  );
  await expect(app.locator('#result')).toContainText('sql-query');
  await app.getByRole('button', { name: 'Denied query', exact: true }).click();
  await expect(app.locator('#result')).toHaveText(
    '{"publicError":true,"code":"forbidden"}'
  );
  await page.locator('iframe').evaluate(frame => {
    frame.dataset.identity = 'original';
  });
  await page.getByRole('button', { name: 'Change handler' }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await expect(app.locator('body')).toHaveAttribute('data-executions', '1');
  await expect(page.locator('iframe')).toHaveAttribute(
    'data-identity',
    'original'
  );
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
  await page.getByRole('button', { name: 'Change javascript' }).click();
  await expect(app.locator('body')).toHaveAttribute('data-bundle-version', '2');
  await expect(page.locator('iframe')).not.toHaveAttribute(
    'data-identity',
    'original'
  );
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
  await page.locator('iframe').evaluate(frame => {
    frame.dataset.identity = 'failed';
  });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('iframe')).not.toHaveAttribute(
    'data-identity',
    'failed'
  );
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

test('URL bridge loads a separate-origin app and preserves navigation on reload', async ({
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

test('hidden source iframe starts eagerly even when a caller supplies lazy loading', async ({
  page,
}) => {
  let releaseBootstrap!: () => void;
  const bootstrapGate = new Promise<void>(resolve => {
    releaseBootstrap = resolve;
  });
  await page.route('**/__test/runtime', async route => {
    await bootstrapGate;
    await route.continue();
  });
  const bootstrapRequest = page.waitForRequest('**/__test/runtime');
  try {
    await page.goto('/bundle-host?lazy=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('iframe')).toBeHidden();
    await expect(page.locator('iframe')).toHaveAttribute('loading', 'eager');
    await bootstrapRequest;
    releaseBootstrap();
    await expect(page.locator('iframe')).toBeVisible();
    await expect(page.frameLocator('iframe').locator('body')).toHaveAttribute(
      'data-bundle-version',
      '1'
    );
  } finally {
    releaseBootstrap();
  }
});
