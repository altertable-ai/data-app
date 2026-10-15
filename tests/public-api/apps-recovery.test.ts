import { readFile } from 'node:fs/promises';
import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

// The public example is the fixture: every transition uses its visible controls.
test('widgets isolate initial query failure and retry only their shared view', async ({
  page,
}) => {
  await page.goto('/recovery');
  await expect
    .poll(() => page.getByLabel('Sales requests').textContent())
    .toBe('1 requests · waiting');
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('1 requests · waiting');
  expect(
    await page
      .getByRole('button', { name: 'Present story', exact: true })
      .isDisabled()
  ).toBe(true);
  expect(
    await page.getByRole('button', { name: 'Complete Acquisition' }).isEnabled()
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Complete Sales', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next Acquisition response' }).click();
  await page.getByRole('option', { name: 'Unavailable', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  const revenue = page.getByRole('region', { name: 'Revenue', exact: true });
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect.poll(() => revenue.textContent()).toContain('1,201');
  for (const name of [
    'Acquired customers',
    'Acquisition',
    'Acquisition finding',
    'Acquisition chart',
  ]) {
    await expect
      .poll(() =>
        page
          .getByRole('region', { name, exact: true })
          .getByRole('alert')
          .textContent()
      )
      .toContain('Couldn’t load results');
  }
  expect(
    await page.getByRole('button', { name: 'Export', exact: true }).isEnabled()
  ).toBe(true);
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · waiting');
  expect(await page.getByLabel('Sales requests').textContent()).toBe(
    '1 requests · settled'
  );
  await page.getByRole('button', { name: 'Next Acquisition response' }).click();
  await page.getByRole('option', { name: 'Success', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect.poll(() => chart.textContent()).toContain('42 customers');
  expect(
    await page
      .getByRole('button', { name: 'Present story', exact: true })
      .isEnabled()
  ).toBe(true);
});

async function choose(
  page: import('playwright').Page,
  name: 'Sales' | 'Acquisition',
  response: string
) {
  await page.getByRole('button', { name: `Next ${name} response` }).click();
  await page.getByRole('option', { name: response, exact: true }).click();
}
async function ready(page: import('playwright').Page) {
  await page.goto('/recovery?primary=acquisition');
  for (const name of ['Sales', 'Acquisition'])
    await page
      .getByRole('button', { name: `Complete ${name}`, exact: true })
      .click();
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Acquisition chart', exact: true })
        .textContent()
    )
    .toContain('41 customers');
}

test('different-input refresh failure preserves each widget scope, story and CSV until local retry succeeds', async ({
  page,
}) => {
  await ready(page);
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await choose(page, 'Acquisition', 'Unavailable');
  await page
    .getByRole('button', { name: 'All markets Market', exact: true })
    .click();
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · waiting');
  await expect.poll(() => chart.textContent()).toContain('41 customers');
  await expect
    .poll(() => chart.getByRole('status').textContent())
    .toContain('Refreshing');
  await page
    .getByRole('button', { name: 'Complete Sales', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Showing All markets while Europe is unavailable');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('menuitem', { name: 'Export Acquisition CSV', exact: true })
    .click();
  const file = await download;
  const path = await file.path();
  expect(await readFile(path!, 'utf8')).toContain('All markets,41');
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect.poll(() => dialog.isVisible()).toBe(true);
  await expect
    .poll(() => dialog.textContent())
    .toContain('Acquired customers: 41');
  await expect.poll(() => dialog.textContent()).toContain('All markets');
  await expect
    .poll(() => dialog.textContent())
    .toContain('last successful result');
  await page.keyboard.press('Escape');
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('3 requests · waiting');
  expect(await page.getByLabel('Sales requests').textContent()).toBe(
    '2 requests · settled'
  );
  await choose(page, 'Acquisition', 'Success');
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect
    .poll(() => chart.textContent())
    .toContain('Europe: 43 customers');
  await expect.poll(() => chart.getByRole('alert').count()).toBe(0);
});

test('render failure stays in one widget and rendering retry never reruns SQL', async ({
  page,
}) => {
  await ready(page);
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await chart.getByRole('button', { name: 'Break visualization' }).click();
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Couldn’t display results.');
  const messageBox = await chart
    .getByText('Couldn’t display results.', { exact: true })
    .boundingBox();
  const retryBox = await chart
    .getByRole('button', { name: 'Retry', exact: true })
    .boundingBox();
  expect(messageBox).not.toBeNull();
  expect(retryBox).not.toBeNull();
  expect(
    Math.abs(
      messageBox!.y +
        messageBox!.height / 2 -
        retryBox!.y -
        retryBox!.height / 2
    )
  ).toBeLessThan(3);

  expect(
    await page
      .getByRole('region', { name: 'Acquisition', exact: true })
      .getByRole('row')
      .count()
  ).toBe(2);
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Couldn’t display results.');
  await chart.getByRole('button', { name: 'Repair visualization' }).click();
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => chart.textContent()).toContain('41 customers');
  expect(await page.getByLabel('Sales requests').textContent()).toBe(
    '1 requests · settled'
  );
  expect(await page.getByLabel('Acquisition requests').textContent()).toBe(
    '1 requests · settled'
  );
});

test('measured zero remains data, while successful empty results remove prior findings and exports', async ({
  page,
}) => {
  await page.goto('/recovery?primary=acquisition');
  await choose(page, 'Acquisition', 'Measured zero');
  await page
    .getByRole('button', { name: 'Complete Sales', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect.poll(() => chart.textContent()).toContain('0 customers');
  await choose(page, 'Acquisition', 'Empty result');
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect
    .poll(() => chart.textContent())
    .toContain('No acquisitions in this market');
  expect(await chart.getByRole('alert').count()).toBe(0);
  expect(
    await page
      .getByRole('button', { name: 'Export CSV', exact: true })
      .isDisabled()
  ).toBe(true);
  expect(
    await page
      .getByRole('button', { name: 'Present story', exact: true })
      .isDisabled()
  ).toBe(true);
});

for (const [response, message] of [
  ['Access denied', 'Data access denied'],
  ['Rejected SQL', 'Couldn’t load results'],
] as const) {
  test(`${response} directs the reader to the owner without offering query retry`, async ({
    page,
  }) => {
    await page.goto('/recovery');
    await choose(page, 'Acquisition', response);
    await page
      .getByRole('button', { name: 'Complete Acquisition', exact: true })
      .click();
    const chart = page.getByRole('region', {
      name: 'Acquisition chart',
      exact: true,
    });
    await expect
      .poll(() => chart.getByRole('alert').textContent())
      .toContain(message);
    expect(
      await chart.getByRole('button', { name: 'Retry', exact: true }).count()
    ).toBe(0);
    expect(await page.getByLabel('Sales requests').textContent()).toBe(
      '1 requests · waiting'
    );
  });
}

test('malformed rows fail normal operation parsing and recover through the same query boundary', async ({
  page,
}) => {
  await page.goto('/recovery');
  await choose(page, 'Acquisition', 'Invalid query rows');
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Couldn’t load results');
  await choose(page, 'Acquisition', 'Success');
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect.poll(() => chart.textContent()).toContain('42 customers');
});

test('real operation deadlines settle a hanging source and stay local to its widgets', async ({
  page,
}) => {
  await page.goto('/recovery?flow=timeout');
  await page
    .getByRole('button', { name: 'Complete Sales', exact: true })
    .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Request timed out');
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('1 requests · settled');
  await chart.getByRole('button', { name: 'Retry', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect.poll(() => chart.textContent()).toContain('42 customers');
});

test('an open story freezes its starting snapshots while a real request completes', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect.poll(() => dialog.isVisible()).toBe(true);
  await expect
    .poll(() => dialog.textContent())
    .toContain('Acquired customers: 41');
  // Finish the simulated source behind the modal, like an external query completing.
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .dispatchEvent('click');
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · settled');
  await expect
    .poll(() => dialog.textContent())
    .toContain('Acquired customers: 41');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  await expect.poll(() => dialog.isVisible()).toBe(true);
  await expect
    .poll(() => dialog.textContent())
    .toContain('Acquired customers: 42');
});

test('an open export menu freezes the dataset values and availability used by its download', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .dispatchEvent('click');
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · settled');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('menuitem', { name: 'Export Acquisition CSV', exact: true })
    .click();
  const download = await pending;
  expect(await readFile((await download.path())!, 'utf8')).toContain(
    'All markets,41'
  );
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const next = page.waitForEvent('download');
  await page
    .getByRole('menuitem', { name: 'Export Acquisition CSV', exact: true })
    .click();
  expect(await readFile((await (await next).path())!, 'utf8')).toContain(
    'All markets,42'
  );
});

test('canceling a same-input refresh restores displayed data without a failure state', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · waiting');
  await page
    .getByRole('button', { name: 'Cancel refresh', exact: true })
    .click();
  for (const name of ['Acquisition']) {
    await expect
      .poll(() => page.getByLabel(`${name} requests`).textContent())
      .toBe('2 requests · settled');
    expect(
      await page
        .getByRole('button', { name: `Complete ${name}`, exact: true })
        .isDisabled()
    ).toBe(true);
  }
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect.poll(() => chart.textContent()).toContain('41 customers');
  expect(await chart.getByRole('alert').count()).toBe(0);
  expect(
    await page
      .getByRole('button', { name: 'Refresh data', exact: true })
      .isEnabled()
  ).toBe(true);
});

test('canceling a changed-filter request stops updating feedback and preserves the displayed scope', async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole('button', { name: 'All markets Market', exact: true })
    .click();
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await expect
    .poll(() => page.getByLabel('Acquisition requests').textContent())
    .toBe('2 requests · waiting');
  await page
    .getByRole('button', { name: 'Cancel refresh', exact: true })
    .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect
    .poll(() => chart.textContent())
    .toContain('All markets: 41 customers');
  await expect.poll(() => chart.getByRole('status').textContent()).toBe('');
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect
    .poll(() => chart.textContent())
    .toContain('Europe: 43 customers');
});

test('an accepted result resets a render failure even when returned values are unchanged', async ({
  page,
}) => {
  await page.goto('/recovery?primary=acquisition');
  await choose(page, 'Acquisition', 'Measured zero');
  for (const name of ['Sales', 'Acquisition'])
    await page
      .getByRole('button', { name: `Complete ${name}`, exact: true })
      .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  await expect.poll(() => chart.textContent()).toContain('0 customers');
  await chart.getByRole('button', { name: 'Break visualization' }).click();
  await expect
    .poll(() => chart.getByRole('alert').textContent())
    .toContain('Couldn’t display results.');
  await chart.getByRole('button', { name: 'Repair visualization' }).click();
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  await expect.poll(() => chart.getByRole('alert').count()).toBe(0);
  await expect.poll(() => chart.textContent()).toContain('0 customers');
});

test('inline query errors wrap within a narrow widget while keeping recovery available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/recovery');
  await choose(page, 'Acquisition', 'Unavailable');
  await page
    .getByRole('button', { name: 'Complete Acquisition', exact: true })
    .click();
  const chart = page.getByRole('region', {
    name: 'Acquisition chart',
    exact: true,
  });
  const alert = chart.getByRole('alert');
  await expect
    .poll(() => alert.textContent())
    .toContain('Data source unavailable.');
  expect(
    await alert.getByRole('button', { name: 'Retry', exact: true }).isVisible()
  ).toBe(true);
  const bounds = await alert.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(
    await alert.evaluate(element => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
});
