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

test('an Activity-hidden link cancels confirmation and works again when restored', async ({
  page,
}) => {
  await page.goto('/bundle-host');
  const app = page.frameLocator('iframe');
  const link = app.getByRole('link', { name: 'View full report' });
  const dialog = page.getByRole('dialog', { name: 'Open external link' });
  await link.click();
  await expect.poll(() => dialog.isVisible()).toBe(true);
  // Simulate a background visibility change while the host modal makes the app inert.
  await app
    .getByRole('button', { name: 'Hide report link' })
    .evaluate(button => (button as HTMLButtonElement).click());
  await expect.poll(() => dialog.count()).toBe(0);
  await app.getByRole('button', { name: 'Show report link' }).click();
  await expect.poll(() => link.getAttribute('aria-disabled')).toBe('false');
  expect(await link.getAttribute('aria-busy')).toBeNull();
  await link.click();
  await expect.poll(() => dialog.isVisible()).toBe(true);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => link.getAttribute('aria-disabled')).toBe('false');
  expect(page.context().pages()).toHaveLength(1);
});

test('host navigation helper uses the app request and retains host user activation', async ({
  page,
}) => {
  await page
    .context()
    .route('https://example.com/**', route =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Report</h1>' })
    );
  await page.goto('/bundle-host?custom-navigation');
  const app = page.frameLocator('iframe');
  const dialog = page.getByRole('dialog', { name: 'Open external link' });
  const navigation = page.getByLabel('External navigation');
  await app.getByRole('link', { name: 'Denied report' }).click();
  await expect
    .poll(() =>
      app.getByRole('alert').filter({ hasText: 'Could not open' }).count()
    )
    .toBe(1);
  expect(await navigation.textContent()).toBe('');
  await app.getByRole('link', { name: 'View full report' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await navigation.textContent()).toBe('');
  await app.getByRole('link', { name: 'View full report' }).click();
  const opened = page.context().waitForEvent('page');
  await dialog.getByRole('link').click({ modifiers: ['Shift'] });
  const external = await opened;
  await external.waitForLoadState();
  expect(JSON.parse((await navigation.textContent())!)).toEqual({
    url: 'https://example.com/report?source=widget',
    target: 'tab',
    keys: { shiftKey: false, metaKey: false, ctrlKey: true },
    keyboardEvent: true,
    activated: true,
  });
  expect(await external.evaluate(() => window.opener)).toBeNull();
  expect(await external.evaluate(() => document.referrer)).toBe('');
  expect(page.context().pages()).toHaveLength(2);
  await expect.poll(() => dialog.count()).toBe(0);
});

test('a failing host navigation helper closes confirmation and permits retry', async ({
  page,
}) => {
  await page.goto('/bundle-host?custom-navigation&navigation-error');
  const app = page.frameLocator('iframe');
  const link = app.getByRole('link', { name: 'View full report' });
  const dialog = page.getByRole('dialog', { name: 'Open external link' });
  await link.click();
  await dialog.getByRole('link').click({ button: 'middle' });
  await expect.poll(() => dialog.count()).toBe(0);
  await expect
    .poll(() =>
      app.getByRole('alert').filter({ hasText: 'Could not open' }).count()
    )
    .toBe(1);
  await expect.poll(() => link.getAttribute('aria-disabled')).toBe('false');
  expect(page.context().pages()).toHaveLength(1);
  await link.click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => dialog.count()).toBe(0);
});

for (const { name, button, modifiers, target } of [
  {
    name: 'explicit tab',
    button: 'Request new tab',
    modifiers: [],
    target: 'tab',
  },
  {
    name: 'explicit window',
    button: 'Request new window',
    modifiers: [],
    target: 'window',
  },
  {
    name: 'Shift event',
    button: 'Request from event',
    modifiers: ['Shift'],
    target: 'window',
  },
  {
    name: 'Ctrl event',
    button: 'Request from event',
    modifiers: ['Control'],
    target: 'tab',
  },
  {
    name: 'Cmd event',
    button: 'Request from event',
    modifiers: ['Meta'],
    target: 'tab',
  },
  {
    name: 'Shift precedence',
    button: 'Request from event',
    modifiers: ['Shift', 'Control'],
    target: 'window',
  },
] as const) {
  test(`bridge navigation supports ${name}`, async ({ page }) => {
    await page
      .context()
      .route('https://example.com/**', route =>
        route.fulfill({ contentType: 'text/html', body: 'Report' })
      );
    await page.goto('/bundle-host?custom-navigation');
    const app = page.frameLocator('iframe');
    await app
      .getByRole('button', { name: button, exact: true })
      .press([...modifiers, 'Enter'].join('+'));
    const dialog = page.getByRole('dialog', { name: 'Open external link' });
    await expect.poll(() => dialog.isVisible()).toBe(true);
    const opened = page.context().waitForEvent('page');
    // Confirmation modifiers must not replace the original frame's intent.
    await dialog
      .getByRole('link')
      .click({ modifiers: target === 'tab' ? ['Shift'] : [] });
    const external = await opened;
    await external.waitForLoadState();
    expect(
      JSON.parse((await page.getByLabel('External navigation').textContent())!)
    ).toEqual({
      url: 'https://example.com/report',
      target,
      activated: true,
      keyboardEvent: true,
      keys:
        button === 'Request from event'
          ? {
              shiftKey: (modifiers as readonly string[]).includes('Shift'),
              metaKey: (modifiers as readonly string[]).includes('Meta'),
              ctrlKey: (modifiers as readonly string[]).includes('Control'),
            }
          : {
              shiftKey: target === 'window',
              metaKey: false,
              ctrlKey: target === 'tab',
            },
    });
    await expect
      .poll(() => app.getByLabel('External navigation result').textContent())
      .toBe('opened');
    expect(page.context().pages()).toHaveLength(2);
  });
}

test('unmodified event navigation is ignored without confirmation', async ({
  page,
}) => {
  await page.goto('/bundle-host?custom-navigation');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Request from event' }).click();
  await expect
    .poll(() => app.getByLabel('External navigation result').textContent())
    .toBe('ignored');
  expect(await page.getByRole('dialog').count()).toBe(0);
  expect(await page.getByLabel('External navigation').textContent()).toBe('');
  expect(page.context().pages()).toHaveLength(1);
});

test('ExternalLink forwards original Shift navigation to the host', async ({
  page,
}) => {
  await page
    .context()
    .route('https://example.com/**', route =>
      route.fulfill({ contentType: 'text/html', body: 'Report' })
    );
  await page.goto('/bundle-host?custom-navigation');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('link', { name: 'View full report' })
    .click({ modifiers: ['Shift'] });
  const opened = page.context().waitForEvent('page');
  await page.getByRole('dialog').getByRole('link').click();
  await (await opened).waitForLoadState();
  expect(
    JSON.parse((await page.getByLabel('External navigation').textContent())!)
      .target
  ).toBe('window');
});
