import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function contents(download: import('@playwright/test').Download) {
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!, 'utf8');
}

test('standalone toolbar downloads a UTF-8 CSV with escaped cells', async ({
  page,
}) => {
  await page.goto('/gallery');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('gallery.csv');
  expect(await contents(download)).toBe(
    '\uFEFFName,Count\r\n"München, ""East""",0\r\n"Two\nlines",\r\n'
  );
});

test('embedded toolbar exports displayed results through its host during updates and failures', async ({
  page,
}) => {
  let release!: () => void;
  let gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let fail = false;
  await page.route('**/api/sql', async route => {
    await gate;
    if (fail)
      await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    else await route.continue();
  });
  await page.goto('/starter-data-app');
  const app = page.frameLocator('iframe');
  await expect(app.getByText('Loading data')).toBeVisible();
  await expect(app.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
  release();
  gate = Promise.resolve();
  await expect(app.getByText('Alpha: 3', { exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts'
  );

  async function expectExport(filename: string, csv: string) {
    const downloaded = page.waitForEvent('download');
    await app.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe(filename);
    expect(await contents(download)).toBe(csv);
  }

  await page
    .locator('iframe')
    .screenshot({ path: test.info().outputPath('export-toolbar.png') });
  await expectExport(
    'sample-counts-all.csv',
    '\uFEFFGroup,Sample count\r\nAlpha,3\r\nBeta,0\r\n'
  );
  gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await app.getByRole('searchbox', { name: 'Group', exact: true }).fill('Beta');
  await expect(
    app.getByText('Showing all groups while loading group Beta…')
  ).toBeVisible();
  await expectExport(
    'sample-counts-all.csv',
    '\uFEFFGroup,Sample count\r\nAlpha,3\r\nBeta,0\r\n'
  );
  release();
  gate = Promise.resolve();
  await expect(app.getByText('Showing Beta', { exact: true })).toBeVisible();
  fail = true;
  await app
    .getByRole('searchbox', { name: 'Group', exact: true })
    .fill('Alpha');
  await expect(
    app.getByText(
      'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.'
    )
  ).toBeVisible();
  await expectExport(
    'sample-counts-Beta.csv',
    '\uFEFFGroup,Sample count\r\nBeta,0\r\n'
  );
  fail = false;
  await app
    .getByRole('searchbox', { name: 'Group', exact: true })
    .fill('missing');
  await expect(
    app.getByText('No matching groups', { exact: true })
  ).toBeVisible();
  await expect(app.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
});

test('embedded export failures stay visible and allow retry', async ({
  page,
}) => {
  await page.goto('/starter-data-app?export-error');
  const app = page.frameLocator('iframe');
  const button = app.getByRole('button', { name: 'Export CSV', exact: true });
  await button.click();
  await expect(app.getByRole('alert')).toHaveText(
    'Couldn’t export CSV. Try again.'
  );
  await expect(button).toBeEnabled();
  await page
    .getByRole('button', { name: 'Allow exports', exact: true })
    .click();
  const downloaded = page.waitForEvent('download');
  await button.click();
  expect((await downloaded).suggestedFilename()).toBe('sample-counts-all.csv');
  await expect(app.getByRole('alert')).toHaveCount(0);
  await expect(button).toBeEnabled();
});
