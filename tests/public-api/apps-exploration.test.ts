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
  await bars.getByRole('button', { name: /Europe/ }).click();
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
    name: 'Europe: 10 orders, 66.7%. View orders',
    exact: true,
  });
  await trigger.click();
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
    name: 'Europe: 10 orders, 66.7%. View orders',
    exact: true,
  });
  await trigger.click();
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
