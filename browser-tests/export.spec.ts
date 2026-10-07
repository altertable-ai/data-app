import { unzipSync, strFromU8 } from 'fflate';
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
  await expect(app.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  release();
  gate = Promise.resolve();
  await expect(
    app
      .getByRole('row', { name: 'Alpha 3', exact: true })
      .filter({ visible: true })
  ).toBeVisible();
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
    'sample-counts-all-groups.csv',
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
    'sample-counts-all-groups.csv',
    '\uFEFFGroup,Sample count\r\nAlpha,3\r\nBeta,0\r\n'
  );
  release();
  gate = Promise.resolve();
  await expect(
    app.getByText('Showing group Beta', { exact: true })
  ).toBeVisible();
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
    'sample-counts-group-beta.csv',
    '\uFEFFGroup,Sample count\r\nBeta,0\r\n'
  );
  fail = false;
  await app
    .getByRole('searchbox', { name: 'Group', exact: true })
    .fill('missing');
  await expect(
    app.getByText('No matching groups', { exact: true })
  ).toBeVisible();
  await expect(app.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
});

test('embedded export failures stay visible and allow retry', async ({
  page,
}) => {
  await page.goto('/starter-data-app?export-error');
  const app = page.frameLocator('iframe');
  const button = app.getByRole('button', { name: 'Export CSV', exact: true });
  await button.click();
  await expect(app.getByRole('alert')).toHaveText(
    'Couldn’t export data.Try again'
  );
  await page
    .locator('iframe')
    .screenshot({ path: test.info().outputPath('export-error-toast.png') });
  await expect(button).toBeEnabled();
  await expect(
    app.locator('.altertable-data-view-toast-region[data-position="top"]')
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Allow exports', exact: true })
    .click();
  const downloaded = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Try again', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    'sample-counts-all-groups.csv'
  );
  await expect(app.getByRole('alert')).toHaveCount(0);
  await expect(button).toBeEnabled();
});

for (const embedded of [false, true])
  test(`multiple datasets export CSVs and a ZIP ${embedded ? 'through the iframe host' : 'standalone'}`, async ({
    page,
  }) => {
    await page.goto(embedded ? '/bundle-host' : '/gallery?multiple-exports');
    const app = embedded ? page.frameLocator('iframe') : page;
    const button = app.getByRole('button', { name: 'Export', exact: true });
    await button.focus();
    await expect(app.getByRole('tooltip')).toHaveText('Export data…');
    await button.press('ArrowDown');
    await expect(
      app.getByRole('option', { name: 'Export Counts CSV', exact: true })
    ).toBeFocused();
    let downloaded = page.waitForEvent('download');
    await app
      .getByRole('option', { name: 'Export Summary CSV', exact: true })
      .click();
    let download = await downloaded;
    expect(download.suggestedFilename()).toBe('Summary.csv');
    expect(await contents(download)).toBe('\uFEFFTotal\r\n0\r\n');
    await button.click();
    downloaded = page.waitForEvent('download');
    await app
      .getByRole('option', { name: 'Export all ZIP', exact: true })
      .click();
    download = await downloaded;
    expect(download.suggestedFilename()).toBe('gallery.zip');
    const files = unzipSync(await readFile((await download.path())!));
    expect(Object.keys(files)).toEqual(['Counts.csv', 'Summary.csv']);
    expect(Array.from(files['Summary.csv']!.slice(0, 3))).toEqual([
      239, 187, 191,
    ]);
    expect(strFromU8(files['Summary.csv']!)).toBe('Total\r\n0\r\n');
    await button.click();
    downloaded = page.waitForEvent('download');
    await app
      .getByRole('option', { name: 'Export all ZIP', exact: true })
      .click();
    expect((await downloaded).suggestedFilename()).toBe('gallery.zip');
    await button.click();
    await page.screenshot({ path: test.info().outputPath('export-menu.png') });
    await app.getByRole('listbox').press('Escape');
    await expect(app.getByRole('listbox')).toHaveCount(0);
    await expect(button).toBeFocused();
  });
