import { describe, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { test } from '@/tests/public-api/browser';

describe('export', () => {
  async function contents(download: import('playwright').Download) {
    const path = await download.path();
    expect(path).not.toBeNull();
    return readFile(path!, 'utf8');
  }

  test('standalone toolbar downloads a UTF-8 CSV with escaped cells', async ({
    page,
  }) => {
    await page.goto('/static');
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('gallery.csv');
    expect(await contents(download)).toBe(
      '\uFEFFName,Count\r\n"München, ""East""",0\r\n"Two\nlines",\r\n\'=1+1,-10\r\n\' +SUM(A1),false\r\n\'@SUM(A1),true\r\n'
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
    await page.route('**/api/registered-query', async route => {
      await gate;
      if (fail)
        await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('group', { name: 'Page actions', exact: true })
          .filter({ hasText: 'Loading data' })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => app.getByRole('button', { name: 'Export CSV' }).isDisabled())
      .toBe(true);
    release();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Alpha 2,200,000', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => page.locator('iframe').getAttribute('sandbox'))
      .toBe('allow-scripts');

    async function expectExport(filename: string, csv: string) {
      const downloaded = page.waitForEvent('download');
      await app
        .getByRole('button', { name: 'Export CSV', exact: true })
        .click();
      const download = await downloaded;
      expect(download.suggestedFilename()).toBe(filename);
      expect(await contents(download)).toBe(csv);
    }

    await expectExport(
      'sample-counts-all-groups.csv',
      '\uFEFFGroup,Sample count\r\nAlpha,2200000\r\nBeta,0\r\n'
    );
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Beta');
    await expect
      .poll(() =>
        app
          .getByRole('status')
          .filter({ hasText: 'Showing all groups while loading group Beta…' })
          .isVisible()
      )
      .toBe(true);
    await expectExport(
      'sample-counts-all-groups.csv',
      '\uFEFFGroup,Sample count\r\nAlpha,2200000\r\nBeta,0\r\n'
    );
    release();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('Showing group Beta', { exact: true })
          .isVisible()
      )
      .toBe(true);
    fail = true;
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Alpha');
    await expect
      .poll(() =>
        app
          .getByRole('alert')
          .filter({
            hasText:
              'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.',
          })
          .isVisible()
      )
      .toBe(true);
    await expectExport(
      'sample-counts-group-beta.csv',
      '\uFEFFGroup,Sample count\r\nBeta,0\r\n'
    );
    fail = false;
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('missing');
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('No matching groups', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => app.getByRole('button', { name: 'Export CSV' }).isDisabled())
      .toBe(true);
  });

  test('embedded export failures stay visible and allow retry', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?export-error');
    const app = page.frameLocator('iframe');
    const button = app.getByRole('button', { name: 'Export CSV', exact: true });
    await button.click();
    await expect
      .poll(() => app.getByRole('alert').textContent())
      .toBe('Couldn’t export data.Try again');

    await expect.poll(() => button.isEnabled()).toBe(true);
    await page
      .getByRole('button', { name: 'Allow exports', exact: true })
      .click();
    const downloaded = page.waitForEvent('download');
    await app.getByRole('button', { name: 'Try again', exact: true }).click();
    expect((await downloaded).suggestedFilename()).toBe(
      'sample-counts-all-groups.csv'
    );
    await expect.poll(() => app.getByRole('alert').count()).toBe(0);
    await expect.poll(() => button.isEnabled()).toBe(true);
  });

  for (const embedded of [false, true])
    test(`multiple datasets export CSVs and a ZIP ${embedded ? 'through the iframe host' : 'standalone'}`, async ({
      page,
    }) => {
      await page.goto(embedded ? '/bundle-host' : '/static?multiple-exports');
      const app = embedded ? page.frameLocator('iframe') : page;
      const button = app.getByRole('button', { name: 'Export', exact: true });
      await button.focus();
      await expect
        .poll(() => app.getByRole('tooltip').textContent())
        .toBe('Export data…');
      await button.press('ArrowDown');
      await expect
        .poll(() =>
          app
            .getByRole('option', { name: 'Export Counts CSV', exact: true })
            .evaluate(
              element => element === element.ownerDocument.activeElement
            )
        )
        .toBe(true);
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

      await app.getByRole('listbox').press('Escape');
      await expect.poll(() => app.getByRole('listbox').count()).toBe(0);
      await expect
        .poll(() =>
          button.evaluate(
            element => element === element.ownerDocument.activeElement
          )
        )
        .toBe(true);
    });
});
