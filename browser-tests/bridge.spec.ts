import { expect, test } from '@playwright/test';

test('iframe logs reach the current React host logger without reconnecting', async ({
  page,
}) => {
  await page.goto('/bridge-host?period=last-30');
  const app = page.frameLocator('iframe');
  await expect(app.locator('#location')).toContainText('period=last-30');
  await app.getByRole('button', { name: 'Write logs' }).click();
  const entries = [
    [1, 'log', 'plain'],
    [1, 'info', 'completed', { rows: 3 }],
    [1, 'warn', 'slow'],
    [1, 'error', 'failed'],
  ];
  await expect(page.locator('#logs')).toHaveText(JSON.stringify(entries));
  await page.getByRole('button', { name: 'Change handler' }).click();
  await app.getByRole('button', { name: 'Write logs' }).click();
  entries.push(...entries.map(([, ...entry]) => [2, ...entry]));
  await expect(page.locator('#logs')).toHaveText(JSON.stringify(entries));
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await expect(page.locator('#diagnostics')).toContainText(
    '"route":"test:echo"'
  );
  const diagnostics = await page.locator('#diagnostics').textContent();
  await page.getByRole('button', { name: 'Toggle logging' }).click();
  await app.getByRole('button', { name: 'Write logs' }).click();
  await app.locator('#result').evaluate(element => {
    element.textContent = '';
  });
  // A subsequent request response confirms earlier log messages were processed.
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await expect(page.locator('#logs')).toHaveText(JSON.stringify(entries));
  await expect(page.locator('#diagnostics')).toHaveText(diagnostics!);
});

test('React host bridge uses the latest handler and synchronizes deep links and history', async ({
  page,
}) => {
  await page.goto('/bridge-host?period=last-30#totals');
  const app = page.frameLocator('iframe');
  await expect(app.locator('#location')).toContainText('period=last-30');
  await expect(app.locator('#location')).toContainText('#totals');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":1');
  await page.getByRole('button', { name: 'Change handler' }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toHaveText(
    '{"period":"last-7","version":2}'
  );
  await page.getByRole('button', { name: 'Replace iframe' }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await page.getByRole('button', { name: 'Toggle bridge' }).click();
  await page.getByRole('button', { name: 'Toggle bridge' }).click();
  await app.locator('#result').evaluate(element => {
    element.textContent = '';
  });
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect(app.locator('#result')).toContainText('"version":2');
  await app.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/\/bridge-host\?period=last-7#daily$/);
  await expect(page.locator('body')).toHaveAttribute(
    'data-navigation-requests',
    '1'
  );
  await page.goBack();
  await expect(app.locator('#location')).toContainText('period=last-30');
  await expect(app.locator('#location')).toContainText('#totals');
  await page.goForward();
  await expect(app.locator('#location')).toContainText('period=last-7');
  await page.reload();
  await expect(app.locator('#location')).toContainText('period=last-7');
  await expect(app.locator('#location')).toContainText('#daily');
});
