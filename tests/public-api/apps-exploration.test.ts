import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

function selection(value: string | null) {
  return value === null
    ? { kind: 'all' }
    : { kind: 'include', members: [{ kind: 'value', value }] };
}
function scope(region: string | null, country: string | null = null) {
  return { region: selection(region), country: selection(country) };
}
function routeFilters(region: string | null, country: string | null = null) {
  return Object.fromEntries(
    Object.entries({ region, country }).flatMap(([name, value]) =>
      value === null
        ? []
        : [[name, JSON.stringify({ kind: 'include', members: [['v', value]] })]]
    )
  );
}
function readFilters(url: string) {
  const params = new URL(url).searchParams;
  return Object.fromEntries(
    ['region', 'country'].map(name => {
      const raw = params.get(name);
      return [
        name,
        raw ? selection(JSON.parse(raw).members[0][1]) : selection(null),
      ];
    })
  );
}

test('chart breakdowns are independent and an explicit drill updates filter and chart in one history entry', async ({
  page,
}) => {
  await page.goto('/exploration');
  const displayed = page.locator('output[aria-label="Displayed breakdowns"]');
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
  expect(readFilters(page.url())).toEqual(scope('eu'));
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

test('dimension controls resolve selected labels outside a failed options page', async ({
  page,
}) => {
  const params = new URLSearchParams({
    ...routeFilters('eu', 'far'),
    'fail-options': '1',
    'revenue-by': 'country',
    'orders-by': 'country',
  });
  await page.goto(`/exploration?${params}`);
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Open filters: Country: Far beyond first page',
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
    .poll(() => new URL(page.url()).searchParams.get('region'))
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
    ...routeFilters('eu', 'far'),
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
          name: 'Open filters: Country: Far beyond first page',
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
  await expect.poll(() => detail.innerText()).toContain('All countries: eu');
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await expect
    .poll(() => menu.evaluate(element => document.activeElement === element))
    .toBe(true);
});

test('country filters apply independently and survive changing or clearing region', async ({
  page,
}) => {
  await page.goto('/exploration');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true });
  await filters
    .getByRole('button', { name: 'Country: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'France', exact: true }).click();
  expect(readFilters(page.url())).toEqual(scope(null, 'fr'));
  await filters
    .getByRole('button', { name: 'Region: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'America', exact: true }).click();
  expect(readFilters(page.url())).toEqual(scope('us', 'fr'));
  await filters
    .getByRole('button', { name: 'Region: America', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  expect(readFilters(page.url())).toEqual(scope(null, 'fr'));
  await filters.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: /Open filters: Country: France/ })
        .count()
    )
    .toBe(1);
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
    await inspection.getByText('All countries: all', { exact: true }).count()
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
      {
        id: 'orders',
        input: { region: { kind: 'invalid' }, country: selection('fr') },
      },
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

for (const { size, depth } of [
  { size: 9000, depth: 1 },
  { size: 1, depth: 20 },
]) {
  test(`detail routes reject overflow atomically at input size ${size}`, async ({
    page,
  }) => {
    await page.goto(`/exploration?route-probe=1&input-size=${size}`);
    await page
      .getByRole('button', { name: 'Open bounded detail', exact: true })
      .click();
    const detail = page.getByRole('dialog', {
      name: 'Contributing orders',
      exact: true,
    });
    const open = detail.getByRole('button', {
      name: 'Open bounded detail',
      exact: true,
    });
    for (let index = 1; index < depth; index++) await open.click();
    const url = page.url();
    const historyLength = await page.evaluate(() => history.length);
    expect(JSON.parse(new URL(url).searchParams.get('details')!)).toHaveLength(
      depth
    );
    await open.click();
    await expect
      .poll(() =>
        detail
          .getByRole('status', { name: 'Detail navigation error' })
          .textContent()
      )
      .toContain('Detail route exceeds its bound.');
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await page.reload();
    await expect
      .poll(() => detail.getByRole('table').innerText())
      .toContain('order-1');
  });
}

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

for (const widget of ['chart', 'table'] as const) {
  test(`${widget} inspection detail actions return keyboard focus to the dashboard`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/exploration?widget-actions=1&menus=1&primary=1');
    const title = widget === 'chart' ? 'Revenue' : 'Places table';
    const trigger = page.getByRole('button', {
      name: `Explore ${title}`,
      exact: true,
    });
    await trigger.press('Enter');
    const inspection = page.getByRole('dialog', { name: title, exact: true });
    const action = inspection.getByRole('button', {
      name:
        widget === 'chart' ? 'Europe: Actions' : 'Revenue: eu: more actions',
      exact: true,
    });
    await action.press('Enter');
    await page
      .getByRole('menuitem', { name: 'View orders', exact: true })
      .press('Enter');
    const detail = page.getByRole('dialog', {
      name: 'Contributing orders',
      exact: true,
    });
    await expect
      .poll(() => detail.getByRole('table').innerText())
      .toContain('order-1');
    await detail.press('Escape');
    await expect
      .poll(() =>
        trigger.evaluate(element => document.activeElement === element)
      )
      .toBe(true);
    expect(new URL(page.url()).searchParams.has('about')).toBe(false);
    expect(errors).toEqual([]);
  });
}

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
    .poll(() => new URL(page.url()).searchParams.get('region'))
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
    expect(
      await trigger.evaluate(element => getComputedStyle(element).outlineStyle)
    ).toBe('none');
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
    'Copy “Europe”',
    'Copy summary',
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
    .poll(() => new URL(page.url()).searchParams.get('region'))
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

test('icon breakdown controls explain their purpose on keyboard focus', async ({
  page,
}) => {
  await page.goto('/exploration');
  const breakdown = page.getByRole('button', { name: /Revenue breakdown/ });
  await breakdown.focus();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('Revenue breakdown');
  await breakdown.press('Enter');
  await page.getByRole('option', { name: 'Country', exact: true }).click();
  await expect
    .poll(() =>
      page.locator('output[aria-label="Displayed breakdowns"]').textContent()
    )
    .toContain('"revenue":"country"');
});

test('action menus and breakdown dropdowns share public spacing overrides', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1');
  await page.addStyleTag({
    content:
      ':root { --atbl-dropdown-padding: 7px; --atbl-dropdown-item-padding-block: 3px; --atbl-dropdown-item-padding-inline: 13px; }',
  });
  const chart = page.getByRole('region', { name: 'Revenue bars', exact: true });
  await chart
    .getByRole('button', { name: 'Europe: Actions', exact: true })
    .click();
  const menuItem = page.getByRole('menuitem', {
    name: 'View orders',
    exact: true,
  });
  expect(
    await menuItem.evaluate(element => getComputedStyle(element).padding)
  ).toBe('3px 13px');
  expect(
    await page
      .getByRole('menu')
      .evaluate(element => getComputedStyle(element.parentElement!).padding)
  ).toBe('7px');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Revenue breakdown/ }).click();
  const option = page.getByRole('option', { name: 'Country', exact: true });
  expect(
    await option.evaluate(element => getComputedStyle(element).padding)
  ).toBe('3px 13px');
  expect(
    await page
      .getByRole('listbox')
      .evaluate(element => getComputedStyle(element).padding)
  ).toBe('7px');
});

test('bar marks open records while label menus retain explicit drill-down', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1&primary=orders');
  const chart = page.getByRole('region', { name: 'Revenue bars', exact: true });
  const bar = chart.getByRole('button', {
    name: 'Europe: 10 USD. View orders',
    exact: true,
  });
  await bar.click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect
    .poll(() => detail.getByRole('table').innerText())
    .toContain('order-1');
  expect(new URL(page.url()).searchParams.has('region')).toBe(false);
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  await chart
    .getByRole('button', { name: 'Europe: Actions', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Drill down', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('region'))
    .toContain('eu');
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
  expect(new URL(page.url()).searchParams.has('region')).toBe(false);
  await page.getByRole('menuitem', { name: 'Drill down', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('region'))
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
  await page
    .getByRole('menuitem', { name: 'Copy “Europe”', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Europe');
  expect(await page.getByText('Label copied', { exact: true }).count()).toBe(0);
  await legend.click();
  await page
    .getByRole('menuitem', { name: 'Copy summary', exact: true })
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
  await page
    .getByRole('menuitem', { name: 'Copy “Europe”', exact: true })
    .click();
  await expect
    .poll(() => page.getByRole('status').allTextContents())
    .toContain('Couldn’t copy. Try again.');
});

test('alternate visualization views retain detail and atomic filter actions', async ({
  page,
}) => {
  await page.goto('/exploration?alternate-views=1&menus=1');
  await page.getByRole('tab', { name: 'Shares', exact: true }).click();
  const chart = page.getByRole('region', {
    name: 'Alternate shares',
    exact: true,
  });
  const mark = chart.getByRole('button', {
    name: 'Europe: 10 USD. Actions',
    exact: true,
  });
  await mark.click();
  await page
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect
    .poll(() => detail.getByRole('table').innerText())
    .toContain('order-1');
  await detail
    .getByRole('button', { name: 'Close panel', exact: true })
    .click();
  const legend = chart.getByRole('button', {
    name: 'Europe: 10 USD, 66.7%. Actions',
    exact: true,
  });
  await expect
    .poll(() => legend.evaluate(element => document.activeElement === element))
    .toBe(true);
  const before = page.url();
  await mark.click();
  await page.getByRole('menuitem', { name: 'Drill down', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('revenue-by'))
    .toBe('country');
  expect(readFilters(page.url())).toEqual(scope('eu'));
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: /Revenue breakdown/ })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await page.goBack();
  await expect.poll(() => page.url()).toBe(before);
  expect(
    await page
      .getByRole('tab', { name: 'Shares', exact: true })
      .getAttribute('aria-selected')
  ).toBe('true');
});

test('visualization widgets reject breakdown targets from another view', async ({
  page,
}) => {
  await page.goto('/exploration?foreign-breakdown=1');
  await expect
    .poll(() => page.getByRole('alert').innerText())
    .toContain('Breakdown targets must belong to the dataset view.');
  expect(
    await page.getByRole('button', { name: /Revenue breakdown/ }).count()
  ).toBe(0);
});

test('active filters can be removed individually without changing other filters or display choices', async ({
  page,
}) => {
  const params = new URLSearchParams({
    ...routeFilters('eu', 'fr'),
    q: 'retained',
    'revenue-by': 'country',
  });
  await page.goto(`/exploration?${params}`);
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  await floating
    .getByRole('button', { name: 'Remove Country filter', exact: true })
    .click();
  await expect.poll(() => readFilters(page.url())).toEqual(scope('eu'));
  expect(await page.getByRole('dialog').count()).toBe(0);
  await expect
    .poll(() =>
      floating
        .getByRole('button', { name: 'Open filters', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await floating
    .getByRole('button', { name: 'Remove Region filter', exact: true })
    .press('Enter');
  await expect.poll(() => floating.count()).toBe(0);
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  const result = new URL(page.url()).searchParams;
  expect(result.get('q')).toBe('retained');
  expect(result.get('revenue-by')).toBe('country');
  expect(result.has('region')).toBe(false);
  expect(result.has('country')).toBe(false);
  await page.goBack();
  await expect.poll(() => readFilters(page.url())).toEqual(scope('eu'));
});

test('removing the active period returns dates and comparison to their defaults', async ({
  page,
}) => {
  await page.goto('/time-app?start=2026-03-10&end=2026-03-12&compare=previous');
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  await floating
    .getByRole('button', { name: 'Remove Date range filter', exact: true })
    .click();
  await expect.poll(() => floating.count()).toBe(0);
  const params = new URL(page.url()).searchParams;
  expect(params.has('start')).toBe(false);
  expect(params.has('end')).toBe(false);
  expect(params.has('compare')).toBe(false);
});

test('widget placement preserves active filter counts, editing, and clearing', async ({
  page,
}) => {
  const params = new URLSearchParams({
    ...routeFilters(null, 'fr'),
    'widget-country': '1',
  });
  await page.goto(`/exploration?${params}`);
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  await expect.poll(() => floating.innerText()).toContain('France');
  await page
    .getByRole('button', { name: 'Filters (1 active)', exact: true })
    .click();
  const panel = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect.poll(() => panel.innerText()).toContain('Country');
  await panel.getByRole('button', { name: 'Close panel', exact: true }).click();
  const remove = floating.getByRole('button', {
    name: 'Remove Country filter',
    exact: true,
  });
  await remove.hover();
  const backgrounds = await remove.evaluate(element => ({
    button: getComputedStyle(element).backgroundColor,
    chip: getComputedStyle(element.parentElement!).backgroundColor,
  }));
  expect(backgrounds.button).not.toBe('rgba(0, 0, 0, 0)');
  expect(backgrounds.button).not.toBe(backgrounds.chip);
  await floating
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect.poll(() => readFilters(page.url())).toEqual(scope(null));
  await expect.poll(() => floating.count()).toBe(0);
});

test('mapped scope choices keep actions available only for the displayed selection', async ({
  page,
}) => {
  await page.goto('/exploration?menus=1');
  const bars = page.getByRole('region', { name: 'Revenue bars', exact: true });
  const mark = bars.getByRole('button', {
    name: /^Europe: 10 USD\./,
  });
  await mark.click();
  await expect
    .poll(() =>
      page.getByRole('menuitem', { name: 'Drill down', exact: true }).count()
    )
    .toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Window/ }).click();
  await page.getByRole('option', { name: 'Previous', exact: true }).click();
  await mark.click({ button: 'right' });
  await page
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .waitFor();
  expect(
    await page
      .getByRole('menuitem', { name: 'Drill down', exact: true })
      .count()
  ).toBe(0);
  await page.getByRole('menu').press('Escape');
  await expect.poll(() => page.getByRole('menu').count()).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event('release-sales')));
  await expect
    .poll(() =>
      page.locator('output[aria-label="Displayed breakdowns"]').textContent()
    )
    .toContain('"windowId":"previous"');
  await mark.click();
  await expect
    .poll(() =>
      page.getByRole('menuitem', { name: 'Drill down', exact: true }).count()
    )
    .toBe(1);
});
