import { readFile } from 'node:fs/promises';

import type { Page } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

async function exportedCsv(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csv = await readFile((await (await download).path())!, 'utf8');
  return csv.replace(/^\ufeff/, '');
}

for (const runtime of ['hosted', 'local'] as const) {
  test(`${runtime} starter charts and exports the rows its operation returns`, async ({
    page,
  }) => {
    await page.goto(
      runtime === 'hosted' ? '/starter-data-app' : '/local-data-app'
    );
    const app = runtime === 'hosted' ? page.frameLocator('iframe') : page;
    await expect
      .poll(() =>
        app.getByLabel('Sample counts by group', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: 'Export CSV', exact: true })
          .isEnabled()
      )
      .toBe(true);
    // Columns named after row fields export those fields; a measured zero stays zero.
    expect(await exportedCsv(page)).toBe(
      'Group,Sample count\r\nAlpha,2000\r\nBeta,450\r\nGamma,0\r\n'
    );

    await app.getByRole('button', { name: 'All groups Group' }).click();
    await app.getByRole('option', { name: 'Gamma', exact: true }).click();
    await expect
      .poll(() => app.getByRole('button', { name: 'Gamma Group' }).isVisible())
      .toBe(true);
    await expect
      .poll(async () => (await exportedCsv(page)).includes('Alpha'))
      .toBe(false);
    expect(await exportedCsv(page)).toBe('Group,Sample count\r\nGamma,0\r\n');
  });
}
