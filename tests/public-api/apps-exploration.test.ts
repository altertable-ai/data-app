import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

function scope(region: string | null, country: string | null = null) {
  return {
    selection: {
      region:
        region === null
          ? { kind: 'all' }
          : { kind: 'include', members: [{ kind: 'value', value: region }] },
      country:
        country === null
          ? { kind: 'all' }
          : { kind: 'include', members: [{ kind: 'value', value: country }] },
    },
  };
}

test('chart breakdowns are independent and descent updates shared scope in one history entry', async ({
  page,
}) => {
  await page.goto('/exploration');
  const displayed = page.locator('output[aria-label="Displayed levels"]');
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"region"');
  const initial = page.url();
  await page.getByRole('button', { name: /Revenue breakdown/ }).click();
  await page.getByRole('option', { name: 'Country', exact: true }).click();
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"country","orders":"region"');
  await page.goBack();
  await expect.poll(() => page.url()).toBe(initial);
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"region"');
  const bars = page.getByRole('region', { name: 'Revenue bars', exact: true });
  await bars
    .getByRole('button', { name: 'Europe: 10 USD. Drill down', exact: true })
    .click();
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"country","orders":"region"');
  expect(
    JSON.parse(new URL(page.url()).searchParams.get('geography')!)
  ).toEqual(scope('eu'));
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: /Revenue breakdown/ })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await page.goBack();
  await expect.poll(() => page.url()).toBe(initial);
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"region","orders":"region"');
  await page.goForward();
  await expect
    .poll(() => displayed.textContent())
    .toContain('"revenue":"country","orders":"region"');
});

test('hierarchy controls resolve selected labels outside a failed options page', async ({
  page,
}) => {
  const params = new URLSearchParams({
    geography: JSON.stringify(scope('eu', 'far')),
    'fail-options': '1',
    'revenue-by': 'country',
    'orders-by': 'country',
  });
  await page.goto(`/exploration?${params}`);
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Open filters: Geography: Europe / Far beyond first page',
          exact: true,
        })
        .count()
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect
    .poll(() =>
      filters
        .getByRole('button', {
          name: 'Country: Far beyond first page',
          exact: true,
        })
        .count()
    )
    .toBe(1);
  expect(await filters.getByText('0 matches', { exact: true }).count()).toBe(0);
  await filters.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('geography'))
    .toBeNull();
  expect(new URL(page.url()).searchParams.get('revenue-by')).toBe('country');
  expect(
    await page
      .getByRole('group', { name: 'Active filters', exact: true })
      .count()
  ).toBe(0);
});

test('selected-label failures are visible and retry recovers the picker and summary', async ({
  page,
}) => {
  const params = new URLSearchParams({
    geography: JSON.stringify(scope('eu', 'far')),
    'fail-label': '1',
  });
  await page.goto(`/exploration?${params}`);
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true });
  await filters
    .getByRole('button', { name: 'Country: far', exact: true })
    .click();
  await expect
    .poll(() => page.getByRole('alert').allTextContents())
    .toContain('Couldn’t load valuesTry again');
  await page.evaluate(() => {
    document.body.dataset.retryLabels = 'true';
  });
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('option', { name: 'Far beyond first page', exact: true })
        .count()
    )
    .toBe(1);
  await page.keyboard.press('Escape');
  await filters.getByRole('button', { name: 'Done', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Open filters: Geography: Europe / Far beyond first page',
          exact: true,
        })
        .count()
    )
    .toBe(1);
});

test('metric and table actions share detail navigation and restore their triggers', async ({
  page,
}) => {
  await page.goto('/exploration?widget-actions=1&primary=1');
  const metricAction = page.getByRole('button', {
    name: 'Order count: View all orders',
    exact: true,
  });
  await metricAction.click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.innerText()).toContain('all');
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() =>
      metricAction.evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  const table = page.getByRole('region', { name: 'Places table', exact: true });
  expect(
    await table
      .getByRole('columnheader', { name: 'Actions', exact: true })
      .count()
  ).toBe(1);
  const menu = table.getByRole('button', {
    name: 'Revenue: eu: more actions',
    exact: true,
  });
  await menu.click();
  await page
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  await expect.poll(() => detail.innerText()).toContain('All geography: eu');
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() => menu.evaluate(element => document.activeElement === element))
    .toBe(true);
});

test('hierarchy child controls appear only after selecting an ancestor and apply immediately', async ({
  page,
}) => {
  await page.goto('/exploration');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true });
  expect(await filters.getByRole('button', { name: / Country$/ }).count()).toBe(
    0
  );
  await filters
    .getByRole('button', { name: 'Region: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await expect
    .poll(() =>
      filters.getByRole('button', { name: 'Country: All', exact: true }).count()
    )
    .toBe(1);
  expect(
    JSON.parse(new URL(page.url()).searchParams.get('geography')!)
  ).toEqual(scope('eu'));
  await filters
    .getByRole('button', { name: 'Country: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'France', exact: true }).click();
  expect(
    JSON.parse(new URL(page.url()).searchParams.get('geography')!)
  ).toEqual(scope('eu', 'fr'));
  await filters.getByRole('button', { name: 'Done', exact: true }).click();
});

test('metric records use the existing inspection tabs and load only on Records', async ({
  page,
}) => {
  await page.goto('/exploration?about=total&tab=glossary');
  const inspection = page.getByRole('dialog', {
    name: 'Order count',
    exact: true,
  });
  await inspection
    .getByRole('tab', { name: 'Glossary', exact: true })
    .waitFor();
  expect(
    await page.locator('body').getAttribute('data-order-requests')
  ).toBeNull();
  await inspection.getByRole('tab', { name: 'Queries', exact: true }).click();
  expect(
    await page.locator('body').getAttribute('data-order-requests')
  ).toBeNull();
  await inspection.getByRole('tab', { name: 'Records', exact: true }).click();
  await expect.poll(() => inspection.innerText()).toContain('order-1');
  expect(await page.locator('body').getAttribute('data-order-requests')).toBe(
    '1'
  );
  expect(
    await inspection.getByText('All geography: all', { exact: true }).count()
  ).toBe(1);
  expect(
    await inspection
      .getByRole('heading', { name: 'Orders', exact: true })
      .locator('svg')
      .count()
  ).toBe(0);
  expect(await inspection.getByRole('tab').allTextContents()).toEqual([
    'Records',
    'Glossary',
    'Queries',
  ]);
});

test('pie slice details retain displayed input while a refresh completes and restore focus', async ({
  page,
}) => {
  await page.goto('/exploration');
  const trigger = page.getByRole('button', {
    name: 'Europe: 10 orders. View orders',
    exact: true,
  });
  await trigger.waitFor();
  await page
    .getByRole('searchbox', { name: 'Search', exact: true })
    .fill('delay');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'))
    .toBe('delay');
  await trigger.focus();
  await trigger.press('Enter');
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.innerText()).toContain('order-1');
  const route = JSON.parse(new URL(page.url()).searchParams.get('details')!);
  expect(route[0].input.search).toBe('');
  expect(route[0].input.placeId).toBe('eu');
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() => trigger.evaluate(element => document.activeElement === element))
    .toBe(true);
  expect(new URL(page.url()).searchParams.get('q')).toBe('delay');
  expect(new URL(page.url()).searchParams.get('details')).toBeNull();
});

test('shared detail links reject malformed scope before the destination executes', async ({
  page,
}) => {
  const params = new URLSearchParams({
    details: JSON.stringify([
      { id: 'orders', input: { geography: scope(null, 'fr') } },
    ]),
  });
  await page.goto(`/exploration?${params}`);
  await page
    .getByRole('button', { name: 'Explore Order count', exact: true })
    .waitFor();
  expect(
    await page
      .getByRole('dialog', { name: 'Contributing orders', exact: true })
      .count()
  ).toBe(0);
  expect(
    await page.locator('body').getAttribute('data-order-requests')
  ).toBeNull();
});

test('nested details replace one sheet and close to the original dashboard trigger', async ({
  page,
}) => {
  await page.goto('/exploration');
  const trigger = page.getByRole('button', {
    name: 'Europe: 10 orders, 66.7%. Actions',
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await detail
    .getByRole('button', { name: 'order-1: Inspect order', exact: true })
    .click();
  const nested = page.getByRole('dialog', {
    name: 'Order record',
    exact: true,
  });
  await expect
    .poll(() => nested.getByRole('table').innerText())
    .toContain('order-1');
  expect(await page.getByRole('dialog').count()).toBe(1);
  await nested
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() => trigger.evaluate(element => document.activeElement === element))
    .toBe(true);
  expect(new URL(page.url()).searchParams.has('details')).toBe(false);
});

test('a record inspection can replace itself with a detail and return to its metric trigger', async ({
  page,
}) => {
  await page.goto('/exploration');
  const trigger = page.getByRole('button', {
    name: 'Explore Order count',
    exact: true,
  });
  await trigger.click();
  const records = page.getByRole('dialog', {
    name: 'Order count',
    exact: true,
  });
  await records
    .getByRole('button', { name: 'order-1: Inspect order', exact: true })
    .click();
  const nested = page.getByRole('dialog', {
    name: 'Order record',
    exact: true,
  });
  await expect
    .poll(() => nested.getByRole('table').innerText())
    .toContain('order-1');
  await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
  await nested
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() => trigger.evaluate(element => document.activeElement === element))
    .toBe(true);
});

test('browser Back closes a detail and recovers its mounted dashboard trigger', async ({
  page,
}) => {
  await page.goto('/exploration');
  const trigger = page.getByRole('button', {
    name: 'Europe: 10 orders, 66.7%. Actions',
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Contributing orders', exact: true })
    .waitFor();
  await page.goBack();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
  await expect
    .poll(() => trigger.evaluate(element => document.activeElement === element))
    .toBe(true);
});

test('floating filters include non-default dates and comparisons and clear to the calendar default', async ({
  page,
}) => {
  for (const search of [
    'start=2026-03-10&end=2026-03-12',
    'compare=previous',
  ]) {
    await page.goto(`/time-app?${search}`);
    const floating = page.getByRole('group', {
      name: 'Active filters',
      exact: true,
    });
    await floating
      .getByRole('button', { name: 'Clear filters', exact: true })
      .click();
    await expect.poll(() => floating.count()).toBe(0);
    const params = new URL(page.url()).searchParams;
    expect(params.has('start')).toBe(false);
    expect(params.has('end')).toBe(false);
    expect(params.has('compare')).toBe(false);
    await expect
      .poll(() => page.getByText(/Mar 4.*6, 2026 UTC/).count())
      .toBeGreaterThan(0);
  }
});

test('bar and pie hit targets open menus with multiple actions and restore stable trigger focus', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1');
  const bars = page.getByRole('region', { name: 'Revenue bars', exact: true });
  const bar = bars.getByRole('button', {
    name: 'Europe: 10 USD. Actions',
    exact: true,
  });
  await bar.click();
  const menu = page.getByRole('menu');
  await menu
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  const sheet = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await sheet.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect
    .poll(() => bar.evaluate(element => document.activeElement === element))
    .toBe(true);
  const slice = page.getByRole('button', {
    name: 'Europe: 10 orders. Actions',
    exact: true,
  });
  await slice.press('Enter');
  await menu
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  await sheet.getByRole('button', { name: 'Close panel', exact: true }).click();
  const legend = page.getByRole('button', {
    name: 'Europe: 10 orders, 66.7%. Actions',
    exact: true,
  });
  await expect
    .poll(() => legend.evaluate(element => document.activeElement === element))
    .toBe(true);
  await legend.click();
  await menu
    .getByRole('menuitem', { name: 'Filter region', exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('geography'))
    .toContain('eu');
});

test('line and area day actions pass the selected calendar day', async ({
  page,
}) => {
  await page.goto('/exploration?days=1');
  for (const name of ['Daily revenue', 'Daily magnitude']) {
    const chart = page.getByRole('region', { name, exact: true });
    const trigger = chart.getByRole('button', {
      name: 'March 1: 10 USD. View day',
      exact: true,
    });
    await trigger.focus();
    await trigger.press('Enter');
    const detail = page.getByRole('dialog', {
      name: 'Contributing orders',
      exact: true,
    });
    await expect
      .poll(() => detail.getByRole('table').innerText())
      .toContain('2026-03-01');
    const route = JSON.parse(new URL(page.url()).searchParams.get('details')!);
    expect(route[0].input.placeId).toBe('2026-03-01');
    await detail
      .getByRole('button', { name: 'Close panel', exact: true })
      .click();
  }
});

test('shared metric records links select the dashboard metric when story visuals reuse it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/exploration?about=total&tab=records');
  const inspection = page.getByRole('dialog', {
    name: 'Order count',
    exact: true,
  });
  await expect.poll(() => inspection.innerText()).toContain('order-1');
  await inspection.getByRole('tab', { name: 'Queries', exact: true }).click();
  await expect.poll(() => inspection.innerText()).toContain('SELECT sales');
  expect(errors).toEqual([]);
});

test('pie ellipsis, slice context menu, and legend keyboard menu share actions at the correct origin', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1&primary=1');
  const slice = page.getByRole('button', {
    name: 'Europe: 10 orders. View orders',
    exact: true,
  });
  const legend = page.getByRole('button', {
    name: 'Europe: 10 orders, 66.7%. Actions',
    exact: true,
  });
  const more = legend;
  await more.click();
  const menu = page.getByRole('menu');
  const choices = await menu.getByRole('menuitem').allTextContents();
  expect(choices).toEqual([
    'View orders',
    'Filter region',
    'Copy label',
    'Copy details',
  ]);
  const triggerBox = await more.boundingBox();
  const menuBox = await menu.boundingBox();
  expect(Math.abs(menuBox!.x - triggerBox!.x)).toBeLessThan(12);
  await page.keyboard.press('Escape');
  const sliceBox = await slice.boundingBox();
  const point = {
    x: sliceBox!.x + sliceBox!.width * 0.6,
    y: sliceBox!.y + sliceBox!.height * 0.55,
  };
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect
    .poll(() => menu.getByRole('menuitem').allTextContents())
    .toEqual(choices);
  const contextBox = await menu.boundingBox();
  expect(Math.abs(contextBox!.x - point.x)).toBeLessThan(14);
  expect(Math.abs(contextBox!.y - point.y)).toBeLessThan(16);
  const firstAction = menu.getByRole('menuitem').first();
  expect(
    await firstAction.evaluate(
      element => getComputedStyle(element).outlineStyle
    )
  ).toBe('none');
  await menu.press('Home');
  await firstAction.press('ArrowDown');
  await expect
    .poll(() =>
      menu
        .getByRole('menuitem')
        .nth(1)
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await legend.press('Shift+F10');
  await expect
    .poll(() => menu.getByRole('menuitem').allTextContents())
    .toEqual(choices);
  await menu
    .getByRole('menuitem', { name: 'Filter region', exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('geography'))
    .toContain('eu');
  for (const trigger of [
    slice,
    legend,
    page.getByRole('button', { name: 'Explore Order count', exact: true }),
  ]) {
    expect(
      await trigger.evaluate(element => getComputedStyle(element).cursor)
    ).toBe('pointer');
  }
});

test('single-action pie slices and legend labels retain pointer menus and return to their origin', async ({
  page,
}) => {
  await page.goto('/exploration');
  for (const name of [
    'Europe: 10 orders. View orders',
    'Europe: 10 orders, 66.7%. Actions',
  ]) {
    const target = page.getByRole('button', { name, exact: true });
    await target.click({ button: 'right' });
    const menu = page.getByRole('menu');
    await menu
      .getByRole('menuitem', { name: 'View orders', exact: true })
      .click();
    const detail = page.getByRole('dialog', {
      name: 'Contributing orders',
      exact: true,
    });
    await expect.poll(() => detail.innerText()).toContain('order-1');
    await detail
      .getByRole('button', { name: 'Close panel', exact: true })
      .click();
    await expect
      .poll(() =>
        target.evaluate(element => document.activeElement === element)
      )
      .toBe(true);
  }
});

test('bar labels open menus with a small aligned chevron and preserve scope until selection', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1&primary=1');
  const chart = page.getByRole('region', { name: 'Revenue bars', exact: true });
  const label = chart.getByRole('button', {
    name: 'Europe: Actions',
    exact: true,
  });
  await label.waitFor();
  const labelBox = await label.boundingBox();
  const iconBox = await label.locator('svg').boundingBox();
  expect(iconBox!.width).toBe(12);
  expect(
    Math.abs(
      labelBox!.y + labelBox!.height / 2 - iconBox!.y - iconBox!.height / 2
    )
  ).toBeLessThan(1);
  expect(
    await label
      .locator('svg')
      .evaluate(element => getComputedStyle(element).color)
  ).toBe(await label.evaluate(element => getComputedStyle(element).color));
  await label.click();
  expect(new URL(page.url()).searchParams.has('geography')).toBe(false);
  await page.getByRole('menuitem', { name: 'Drill down', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('geography'))
    .toContain('eu');
});

test('the entire legend row copies displayed values without success notifications', async ({
  page,
}) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/exploration');
  const legend = page.getByRole('button', {
    name: 'Europe: 10 orders, 66.7%. Actions',
    exact: true,
  });
  await legend.waitFor();
  await legend.scrollIntoViewIfNeeded();
  const row = await legend.boundingBox();
  await page.mouse.click(row!.x + row!.width - 5, row!.y + row!.height / 2);
  await page.getByRole('menuitem', { name: 'Copy label', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Europe');
  expect(await page.getByText('Label copied', { exact: true }).count()).toBe(0);
  await legend.click();
  await page
    .getByRole('menuitem', { name: 'Copy details', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Europe\n10 orders · 66.7%');
  expect(await page.getByText('Details copied', { exact: true }).count()).toBe(
    0
  );
});

test('copy failures show feedback instead of reporting success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Permission denied');
        },
      },
    });
  });
  await page.goto('/exploration');
  await page
    .getByRole('button', {
      name: 'Europe: 10 orders, 66.7%. Actions',
      exact: true,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Copy label', exact: true }).click();
  await expect
    .poll(() => page.getByRole('status').allTextContents())
    .toContain('Couldn’t copy. Try again.');
});
