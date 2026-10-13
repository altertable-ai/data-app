import { expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { Page } from 'playwright';
import { test } from '@/tests/public-api/browser';
function controls(page: Page) {
  return page.getByRole('navigation', {
    name: 'Geography exploration',
    exact: true,
  });
}
function widget(page: Page, level: string) {
  return page.getByRole('region', { name: `Revenue by ${level}`, exact: true });
}
async function heading(page: Page, level: string) {
  await expect.poll(() => widget(page, level).count()).toBe(1);
}
async function act(page: Page, group: string, action: string) {
  await page
    .getByRole('button', { name: new RegExp(`^Explore: ${group}:`) })
    .click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}
async function choose(page: Page, label: string, value: string) {
  await controls(page)
    .getByRole('button', { name: new RegExp(`^${label}:`) })
    .click();
  await page.getByRole('option', { name: value, exact: true }).click();
}
function state(page: Page) {
  const raw = new URL(page.url()).searchParams.get('geography');
  return raw ? JSON.parse(raw) : null;
}
async function france(page: Page) {
  await act(page, 'Europe', 'Break down by countries');
  await heading(page, 'countries');
  await act(page, 'France', 'Break down by customers');
  await heading(page, 'customers');
}

test('selectors and chart filters share one hierarchy state and grouping remains explicit', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: All', exact: true })
      .count()
  ).toBe(1);
  await choose(page, 'Region', 'Europe');
  await heading(page, 'regions');
  await expect
    .poll(() =>
      widget(page, 'regions')
        .getByRole('button', { name: 'Region: Europe', exact: true })
        .count()
    )
    .toBe(1);
  const selected = state(page);
  expect(selected.groupBy).toBe('region');
  await choose(page, 'Region', 'All');
  await act(page, 'Europe', 'Filter to this region');
  await expect.poll(() => state(page)).toEqual(selected);
  await act(page, 'Europe', 'Break down by countries');
  await heading(page, 'countries');
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .count()
  ).toBe(1);
  expect(
    await controls(page)
      .getByRole('button', { name: 'Country: All', exact: true })
      .count()
  ).toBe(1);
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .getByText('Europe', { exact: true })
      .evaluate(element => element.scrollWidth <= element.clientWidth)
  ).toBe(true);

  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .getByText('Europe', { exact: true })
      .evaluate(
        element =>
          element.getBoundingClientRect().height <=
          parseFloat(getComputedStyle(element).lineHeight) + 1
      )
  ).toBe(true);
  await choose(page, 'Country', 'France');
  await expect
    .poll(() =>
      widget(page, 'countries')
        .getByRole('button', { name: 'Country: France', exact: true })
        .count()
    )
    .toBe(1);
  expect(state(page).groupBy).toBe('country');
  await choose(page, 'Country', 'All');
  await act(page, 'France', 'Filter to this country');
  await expect
    .poll(() =>
      controls(page)
        .getByRole('button', { name: 'Country: France', exact: true })
        .count()
    )
    .toBe(1);
  expect(state(page).selection.country).toEqual({
    kind: 'include',
    members: [{ kind: 'value', value: 'France' }],
  });
  expect(
    await page
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .count()
  ).toBe(3);
});

test('editing a parent clears descendants and dependent facets atomically without losing dates or segment', async ({
  page,
}) => {
  const requests: any[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/drill-query'))
      requests.push(request.postDataJSON().params);
  });
  await page.goto('/exploration-app?segment=Self+serve');
  await france(page);
  const before = requests.length;
  await choose(page, 'Region', 'North America');
  await heading(page, 'countries');
  const next = state(page);
  expect(next.selection.country).toEqual({ kind: 'all' });
  expect(next.selection.customer).toEqual({ kind: 'all' });
  expect(next.groupBy).toBe('country');
  await choose(page, 'Country', 'United States');
  await expect
    .poll(() =>
      widget(page, 'countries')
        .getByRole('button', { name: 'Country: United States', exact: true })
        .count()
    )
    .toBe(1);
  expect(
    requests
      .slice(before)
      .filter(params => params.region === 'North America')
      .every(params => params.country !== 'France' && params.customer == null)
  ).toBe(true);
  expect(
    await page
      .getByRole('button', { name: 'Self serve Segment', exact: true })
      .count()
  ).toBe(1);
  expect(new URL(page.url()).searchParams.get('segment')).toBe('Self serve');
  const facet = requests.find(
    params => params.region === 'North America' && !('start' in params)
  );
  expect(facet).toEqual({ region: 'North America' });
});

test('ancestor navigation, widget selectors and browser history update the same URL value', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  await france(page);
  const customers = widget(page, 'customers');
  const navigation = customers.getByRole('navigation', {
    name: 'Geography breakdown',
    exact: true,
  });
  expect(
    await navigation
      .getByRole('button', { name: 'Customer: All', exact: true })
      .count()
  ).toBe(1);
  await navigation
    .getByRole('button', { name: 'Group by Country', exact: true })
    .click();
  await heading(page, 'countries');
  expect(state(page).selection.country.members[0].value).toBe('France');
  await page.goBack();
  await heading(page, 'customers');
  await page.goForward();
  await heading(page, 'countries');
  const local = widget(page, 'countries').getByRole('navigation', {
    name: 'Geography breakdown',
  });
  await local
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await heading(page, 'regions');
  expect(state(page)).toBeNull();
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: All', exact: true })
      .count()
  ).toBe(1);
});

test('pending hierarchy transitions retain displayed context and prevent stale descent', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/drill-query', async route => {
    if (route.request().postDataJSON().params.groupBy === 'country') await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/exploration-app');
  await act(page, 'Europe', 'Break down by countries');
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .count()
  ).toBe(1);
  expect(
    await widget(page, 'regions')
      .getByRole('button', { name: 'Region: All', exact: true })
      .count()
  ).toBe(1);
  expect(
    await widget(page, 'regions')
      .getByRole('button', { name: 'Region: All', exact: true })
      .isDisabled()
  ).toBe(true);
  expect(
    await page.getByRole('button', { name: /^Explore: Europe:/ }).count()
  ).toBe(0);
  expect(
    await page.getByRole('button', { name: /^View orders: Europe:/ }).count()
  ).toBe(1);
  release();
  await heading(page, 'countries');
  await expect
    .poll(() =>
      widget(page, 'countries')
        .getByRole('button', { name: 'Region: Europe', exact: true })
        .count()
    )
    .toBe(1);
});

test('scoped detail exports inherit displayed hierarchy selection', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  await act(page, 'Europe', 'Break down by countries');
  await heading(page, 'countries');
  await act(page, 'France', 'View orders');
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(3);
  const downloaded = page.waitForEvent('download');
  await detail.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csv = await readFile((await (await downloaded).path())!, 'utf8');
  expect(csv).toContain('SO-1001');
  expect(csv).toContain('SO-1003');
  expect(csv).not.toContain('SO-1002');
  await page.keyboard.press('Escape');
  await heading(page, 'countries');
});

test('invalid exploration links canonicalize before query predicates are built', async ({
  page,
}) => {
  const invalid = [
    [],
    { selection: {}, groupBy: 'country' },
    {
      selection: {
        region: { kind: 'all' },
        country: { kind: 'all' },
        customer: { kind: 'all' },
      },
      groupBy: 'country',
    },
  ];
  for (const value of invalid) {
    await page.goto(
      `/exploration-app?geography=${encodeURIComponent(JSON.stringify(value))}`
    );
    await heading(page, 'regions');
    expect(state(page)).toBeNull();
  }
});

test('mobile keyboard selectors and menu actions preserve local navigation focus', async ({
  mobilePage: page,
}) => {
  await page.goto('/exploration-app');
  await controls(page)
    .getByRole('button', { name: 'Region: All', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await page.getByRole('button', { name: /^Explore: Europe:/ }).focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Break down by countries', exact: true })
    .click();
  await heading(page, 'countries');
  const navigation = widget(page, 'countries').getByRole('navigation', {
    name: 'Geography breakdown',
  });
  await expect
    .poll(() =>
      navigation.evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await controls(page)
    .getByRole('button', { name: 'Group by Region', exact: true })
    .click();
  await heading(page, 'regions');
});

test('chart menus center on category labels and keep primary actions and escape recovery', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  const trigger = page.getByRole('button', { name: /^Explore: Europe:/ });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Europe actions', exact: true });
  await menu.waitFor();
  await expect
    .poll(() =>
      menu.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  const label = (await trigger
    .getByText('Europe', { exact: true })
    .boundingBox())!;
  await expect
    .poll(async () => {
      const box = (await menu.boundingBox())!;
      return Math.abs(box.x + box.width / 2 - label.x - label.width / 2);
    })
    .toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => trigger.evaluate(element => element === document.activeElement))
    .toBe(true);
  await page.goto('/exploration-app?primary');
  const direct = page.getByRole('button', { name: /^View orders: Europe:/ });
  await direct.click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'hidden' });
  await expect
    .poll(() => direct.evaluate(element => element === document.activeElement))
    .toBe(true);
  const more = widget(page, 'regions').getByRole('button', {
    name: 'Europe actions',
    exact: true,
  });
  await more.focus();
  await page.keyboard.press('Enter');
  const primaryMenu = page.getByRole('menu', {
    name: 'Europe actions',
    exact: true,
  });
  await primaryMenu.waitFor();
  await expect
    .poll(() =>
      primaryMenu.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => more.evaluate(element => element === document.activeElement))
    .toBe(true);
});

test('inspection uses the shared selectors and ancestor navigation without duplicate controls', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  await france(page);
  await page
    .getByRole('button', { name: 'Explore Revenue by customers', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Revenue by customers',
    exact: true,
  });
  await inspection
    .getByRole('navigation', { name: 'Geography breakdown' })
    .getByRole('button', { name: 'Group by Country', exact: true })
    .click();
  await heading(page, 'countries');
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Revenue by countries', exact: true })
        .count()
    )
    .toBe(1);
  expect(
    await page
      .getByRole('button', { name: 'Up one level', exact: true })
      .count()
  ).toBe(0);
  await page.keyboard.press('Escape');
});

test('exploration filters preserve a newer ordinary month during refresh and write one history entry', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/drill-query', async route => {
    const params = route.request().postDataJSON().params;
    if (params.start === '2026-10-01' && params.region === null) await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/exploration-app');
  await page
    .getByRole('button', { name: 'September Month', exact: true })
    .click();
  await page.getByRole('option', { name: 'October', exact: true }).click();
  await act(page, 'Europe', 'Filter to this region');
  release();
  await expect
    .poll(() =>
      widget(page, 'regions')
        .getByRole('button', { name: 'Region: Europe', exact: true })
        .count()
    )
    .toBe(1);
  expect(new URL(page.url()).searchParams.get('month')).toBe('10');
  expect(state(page).groupBy).toBe('region');
  await page.goBack();
  expect(new URL(page.url()).searchParams.get('month')).toBe('10');
  expect(state(page)).toBeNull();
});

test('stories and page exports describe the displayed exploration', async ({
  page,
}) => {
  await page.goto('/exploration-app?segment=Self+serve');
  await act(page, 'Europe', 'Break down by countries');
  await heading(page, 'countries');
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('group', { name: 'Page actions', exact: true })
    .getByRole('button', { name: 'Export CSV', exact: true })
    .click();
  const csv = await readFile((await (await downloaded).path())!, 'utf8');
  expect(csv).toContain('France,70');
  expect(csv).not.toContain('North America');
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const story = page.getByRole('dialog', {
    name: 'Revenue by countries',
    exact: true,
  });
  await story.waitFor();
  expect(await story.textContent()).toContain('Europe');
  expect(await story.textContent()).toContain('Self serve');
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
});

test('breadcrumb selectors retain longer labels on mobile and use ghost controls', async ({
  mobilePage: page,
}) => {
  await page.goto('/exploration-app');
  await choose(page, 'Region', 'North America');
  await act(page, 'North America', 'Break down by countries');
  await heading(page, 'countries');
  await choose(page, 'Country', 'United States');
  for (const [label, value] of [
    ['Region', 'North America'],
    ['Country', 'United States'],
  ]) {
    const trigger = controls(page).getByRole('button', {
      name: `${label}: ${value}`,
      exact: true,
    });
    expect(await trigger.getAttribute('data-variant')).toBe('ghost');
    expect(
      await trigger
        .getByText(value, { exact: true })
        .evaluate(element => element.scrollWidth <= element.clientWidth)
    ).toBe(true);
  }
});

test('parent selection progressively reveals child selectors while queries retain their grouping', async ({
  page,
}) => {
  const requests: {
    groupBy?: string;
    region?: string;
    country?: string;
    customer?: string;
  }[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/drill-query'))
      requests.push(request.postDataJSON().params);
  });
  await page.goto('/exploration-app');
  expect(
    await controls(page)
      .getByRole('button', { name: /^Country:/ })
      .count()
  ).toBe(0);
  expect(
    await controls(page)
      .getByRole('button', { name: /^Customer:/ })
      .count()
  ).toBe(0);
  await choose(page, 'Region', 'Europe');
  await controls(page)
    .getByRole('button', { name: 'Country: All', exact: true })
    .waitFor();
  expect(
    await controls(page)
      .getByRole('button', { name: /^Customer:/ })
      .count()
  ).toBe(0);
  await choose(page, 'Country', 'France');
  await controls(page)
    .getByRole('button', { name: 'Customer: All', exact: true })
    .waitFor();
  await choose(page, 'Customer', 'Atelier Nord');
  const local = widget(page, 'regions').getByRole('navigation', {
    name: 'Geography breakdown',
    exact: true,
  });
  await local
    .getByRole('button', { name: 'Customer: Atelier Nord', exact: true })
    .waitFor();
  expect(state(page).groupBy).toBe('region');
  expect(
    await page
      .getByRole('button', { name: 'Explore Revenue by regions', exact: true })
      .count()
  ).toBe(1);
  expect(
    requests
      .filter(params => params.groupBy)
      .every(params => params.groupBy === 'region')
  ).toBe(true);
  expect(
    requests.some(
      params =>
        params.groupBy === 'region' &&
        params.country === 'France' &&
        params.customer === 'account-atelier'
    )
  ).toBe(true);
  await choose(page, 'Country', 'All');
  await local
    .getByRole('button', { name: 'Country: All', exact: true })
    .waitFor();
  expect(
    await controls(page)
      .getByRole('button', { name: /^Customer:/ })
      .count()
  ).toBe(0);
  expect(state(page).selection.customer).toEqual({ kind: 'all' });
  await choose(page, 'Region', 'All');
  await local
    .getByRole('button', { name: 'Region: All', exact: true })
    .waitFor();
  expect(
    await controls(page)
      .getByRole('button', { name: /^Country:/ })
      .count()
  ).toBe(0);
  expect(state(page)).toBeNull();
});
