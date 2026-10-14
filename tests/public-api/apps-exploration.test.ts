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
async function openFilters(page: Page) {
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  const trigger = page.getByRole('button', { name: /^Filters(?: \(|$)/ });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await sheet.waitFor({ state: 'hidden' });
    await trigger.click();
  }
  return sheet;
}
async function choose(page: Page, label: string, value: string) {
  const sheet = await openFilters(page);
  await controls(page)
    .getByRole('button', { name: new RegExp(`^${label}:`) })
    .click();
  await page.getByRole('option', { name: value, exact: true }).click();
  await sheet
    .getByRole('button', { name: 'Show results', exact: true })
    .click();
  await sheet.waitFor({ state: 'hidden' });
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

test('scoped detail content inherits displayed hierarchy selection without an app toolbar', async ({
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
  expect(
    await detail
      .getByRole('group', { name: 'Detail actions', exact: true })
      .count()
  ).toBe(0);
  expect(await detail.textContent()).toContain('SO-1001');
  expect(await detail.textContent()).not.toContain('SO-1002');
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

test('hierarchy filters live only in the sheet and selected members summarize in a floating bar', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  expect(await controls(page).count()).toBe(0);
  expect(
    await page
      .getByRole('group', { name: 'Active filters', exact: true })
      .count()
  ).toBe(0);
  await openFilters(page);
  expect(
    await controls(page)
      .getByRole('button', { name: 'Region: All', exact: true })
      .count()
  ).toBe(1);
  expect(
    await controls(page)
      .getByRole('button', { name: /^Country:/ })
      .count()
  ).toBe(0);
  await choose(page, 'Region', 'Europe');
  await heading(page, 'regions');
  const bar = page.getByRole('group', { name: 'Active filters', exact: true });
  await bar
    .getByRole('button', { name: 'Edit Region: Europe', exact: true })
    .waitFor();
  expect(
    await bar.getByRole('button', { name: /^Edit Country:/ }).count()
  ).toBe(0);
  expect(await widget(page, 'regions').getByRole('navigation').count()).toBe(0);
  await bar
    .getByRole('button', { name: 'Edit Region: Europe', exact: true })
    .click();
  await controls(page)
    .getByRole('button', { name: 'Country: All', exact: true })
    .waitFor();
  await choose(page, 'Country', 'France');
  await choose(page, 'Customer', 'Atelier Nord');
  await bar
    .getByRole('button', { name: 'Edit Customer: Atelier Nord', exact: true })
    .waitFor();
  expect(state(page).groupBy).toBe('region');
  await choose(page, 'Region', 'North America');
  expect(state(page).selection.country).toEqual({ kind: 'all' });
  expect(state(page).selection.customer).toEqual({ kind: 'all' });
  await openFilters(page);
  expect(
    await controls(page)
      .getByRole('button', { name: /^Customer:/ })
      .count()
  ).toBe(0);
  await choose(page, 'Country', 'United States');
  await bar
    .getByRole('button', { name: 'Edit Country: United States', exact: true })
    .waitFor();
});

test('clear resets hierarchy in one history entry while preserving ordinary scope', async ({
  page,
}) => {
  await page.goto('/exploration-app?segment=Self+serve&month=10');
  await france(page);
  const before = state(page);
  await page
    .getByRole('group', { name: 'Active filters', exact: true })
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await heading(page, 'regions');
  expect(state(page)).toBeNull();
  expect(new URL(page.url()).searchParams.get('segment')).toBe('Self serve');
  expect(new URL(page.url()).searchParams.get('month')).toBe('10');
  await page.goBack();
  await heading(page, 'customers');
  expect(state(page)).toEqual(before);
});

test('sheet ancestor grouping and browser history share the chart hierarchy state', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  await france(page);
  const sheet = await openFilters(page);
  await controls(page)
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Country options', exact: true })
    .getByRole('button', { name: 'Group by Country', exact: true })
    .click();
  await sheet
    .getByRole('button', { name: 'Show results', exact: true })
    .click();
  await heading(page, 'countries');
  await page.goBack();
  await heading(page, 'customers');
  await page.goForward();
  await heading(page, 'countries');
  await choose(page, 'Region', 'All');
  await heading(page, 'regions');
  expect(state(page)).toBeNull();
});

test('pending descent shows applied summary and blocks stale row actions without widget selectors', async ({
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
  await page
    .getByRole('button', { name: 'Edit Region: Europe', exact: true })
    .waitFor();
  expect(await widget(page, 'regions').getByRole('navigation').count()).toBe(0);
  expect(
    await page.getByRole('button', { name: /^Explore: Europe:/ }).count()
  ).toBe(0);
  expect(
    await page.getByRole('button', { name: /^View orders: Europe:/ }).count()
  ).toBe(1);
  release();
  await heading(page, 'countries');
});

test('mobile summaries fit the viewport and open hierarchy selectors by keyboard', async ({
  mobilePage: page,
}) => {
  await page.goto('/exploration-app');
  await choose(page, 'Region', 'North America');
  await act(page, 'North America', 'Break down by countries');
  await heading(page, 'countries');
  await choose(page, 'Country', 'United States');
  const bar = page.getByRole('group', { name: 'Active filters', exact: true });
  const edit = bar.getByRole('button', {
    name: 'Edit Country: United States',
    exact: true,
  });
  await edit.focus();
  expect(
    await edit.evaluate(element => getComputedStyle(element).outlineStyle)
  ).toBe('none');
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet.waitFor();
  const trigger = controls(page).getByRole('button', {
    name: 'Country: United States',
    exact: true,
  });
  const region = controls(page).getByRole('button', {
    name: 'Region: North America',
    exact: true,
  });
  const rootBox = (await region.boundingBox())!;
  const childBox = (await trigger.boundingBox())!;
  expect(childBox.x - rootBox.x).toBeGreaterThanOrEqual(12);
  expect(await trigger.getAttribute('data-variant')).toBe('outline');

  expect(
    await trigger
      .getByText('United States', { exact: true })
      .evaluate(element => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'hidden' });
  await expect
    .poll(() => edit.evaluate(element => element === document.activeElement))
    .toBe(true);
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test('invalid facet parent pairs fail before business queries and recover from the filter sheet', async ({
  page,
}) => {
  let business = 0;
  page.on('request', request => {
    if (
      request.url().endsWith('/api/drill-query') &&
      request.postDataJSON().statement.startsWith('WITH customers')
    )
      business++;
  });
  const bad = {
    selection: {
      region: {
        kind: 'include',
        members: [{ kind: 'value', value: 'Europe' }],
      },
      country: {
        kind: 'include',
        members: [{ kind: 'value', value: 'United States' }],
      },
      customer: { kind: 'all' },
    },
    groupBy: 'country',
  };
  await page.goto(
    '/exploration-app?geography=' + encodeURIComponent(JSON.stringify(bad))
  );
  await page.getByText('Update the selection', { exact: true }).waitFor();
  expect(business).toBe(0);
  await page
    .getByRole('button', { name: 'Edit Country: United States', exact: true })
    .click();
  await choose(page, 'Country', 'France');
  await heading(page, 'countries');
  expect(business).toBe(1);
});
