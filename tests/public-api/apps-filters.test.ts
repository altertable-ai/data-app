import { expect } from 'vitest';
import type { Page, Locator } from 'playwright';
import { test } from '@/tests/public-api/browser';

async function choose(
  page: Page,
  scope: Page | Locator,
  label: string,
  option: string
) {
  await scope.getByRole('button', { name: new RegExp(` ${label}$`) }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
function decode(text: string | null) {
  return JSON.parse(text ?? '{}');
}

test('presentation groups disclose secondary restrictions and preserve them across history', async ({
  page,
}) => {
  await page.goto('/filter-presentation');
  const scope = page.getByRole('group', { name: 'Filters', exact: true });
  const display = page.getByRole('dialog', {
    name: 'Display options',
    exact: true,
  });
  const more = scope.getByRole('button', {
    name: 'More filters (1 active)',
    exact: true,
  });
  expect(await more.locator('svg').count()).toBe(1);
  await more.hover();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('Show additional filters');
  const table = page.getByRole('table');
  await expect.poll(() => table.getByRole('row').count()).toBe(8);
  expect(
    await scope.getByRole('button', { name: 'Monthly spend Sort by' }).count()
  ).toBe(0);
  expect(
    await page.getByRole('button', { name: 'Monthly spend Sort by' }).count()
  ).toBe(0);
  expect(
    await page
      .getByRole('button', { name: 'Display options', exact: true })
      .count()
  ).toBe(1);
  const visibleLines = (await page.getByRole('main').innerText()).split('\n');
  expect(visibleLines).not.toContain('Filters');
  expect(visibleLines).not.toContain('Display options');
  expect(
    await scope.getByRole('button', { name: 'Any Active account' }).count()
  ).toBe(0);
  await more.focus();
  await more.press('Space');
  expect(await more.getAttribute('aria-expanded')).toBe('true');
  expect(
    await more
      .locator('svg')
      .evaluate(element => getComputedStyle(element).transform)
  ).toBe('none');
  const secondary = page.getByRole('group', {
    name: 'Secondary filters',
    exact: true,
  });
  expect(
    await secondary.getByText('Active account', { exact: true }).count()
  ).toBe(1);
  const labelBox = await secondary
    .getByText('Active account', { exact: true })
    .boundingBox();
  const inputBox = await secondary
    .getByRole('button', { name: 'Any Active account', exact: true })
    .boundingBox();
  expect(labelBox!.y + labelBox!.height).toBeLessThan(inputBox!.y);
  await choose(page, secondary, 'Active account', 'Yes');
  await expect.poll(() => table.getByRole('row').count()).toBe(6);
  const appliedURL = page.url();
  await scope
    .getByRole('button', { name: 'More filters (2 active)', exact: true })
    .click();
  expect(await secondary.count()).toBe(0);
  await page.reload();
  await expect.poll(() => table.getByRole('row').count()).toBe(6);
  expect(
    await scope
      .getByRole('button', { name: 'More filters (2 active)', exact: true })
      .count()
  ).toBe(1);
  await scope.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect.poll(() => table.getByRole('row').count()).toBe(9);
  expect(
    await scope
      .getByRole('button', { name: 'More filters', exact: true })
      .count()
  ).toBe(1);
  await page.goBack();
  await expect.poll(() => page.url()).toBe(appliedURL);
  await expect.poll(() => table.getByRole('row').count()).toBe(6);

  const tableBefore = await table.boundingBox();
  const heading = await page
    .getByRole('heading', { name: 'Customer explorer', exact: true })
    .boundingBox();
  const displayTrigger = page.getByRole('button', {
    name: 'Display options',
    exact: true,
  });
  await displayTrigger.focus();
  await displayTrigger.press('Enter');
  expect((await table.boundingBox())!.y).toBe(tableBefore!.y);
  await choose(page, display, 'Order', 'Ascending');
  await expect
    .poll(() => table.getByRole('rowheader').first().textContent())
    .toBe('Atelier North');
  expect(
    await page
      .getByRole('button', {
        name: 'Display options (1 changed)',
        exact: true,
      })
      .count()
  ).toBe(1);
  await choose(page, display, 'Sort by', 'Customer name');
  expect(
    await page
      .getByRole('button', { name: 'Display options (2 changed)', exact: true })
      .count()
  ).toBe(1);
  await display.getByRole('button', { name: 'Customer name Sort by' }).click();
  const selectionButton = await display
    .getByRole('button', { name: 'Customer name Sort by' })
    .boundingBox();
  await expect
    .poll(async () => {
      const menu = await page.getByRole('listbox').locator('..').boundingBox();
      return Math.abs(
        menu!.x + menu!.width - selectionButton!.x - selectionButton!.width
      );
    })
    .toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.getByRole('listbox').count()).toBe(0);
  expect(await display.count()).toBe(1);
  await expect
    .poll(() =>
      display.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => display.count()).toBe(0);
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Display options (2 changed)',
          exact: true,
        })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Display options (2 changed)', exact: true })
    .click();
  expect(
    await display.getByRole('button', { name: 'Customer name Sort by' }).count()
  ).toBe(1);
  await page.mouse.click(
    heading!.x + heading!.width / 2,
    heading!.y + heading!.height / 2
  );
  await expect.poll(() => display.count()).toBe(0);
  await scope.getByRole('button', { name: 'Clear', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('direction')).toBe('asc');
});

test('expanded filter groups fit a phone viewport', async ({
  mobilePage: page,
}) => {
  await page.goto('/filter-presentation');
  await page
    .getByRole('button', { name: 'More filters (1 active)', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Display options', exact: true })
    .click();
  expect(
    await page.getByRole('button', { name: 'Any Active account' }).isVisible()
  ).toBe(true);
  expect(
    await page.getByRole('button', { name: 'Descending Order' }).isVisible()
  ).toBe(true);
  await page.addStyleTag({ content: ':root { font-size: 20px; }' });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 812 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  }
});

test('secondary filter fields remain ordered and clear closes the panel', async ({
  page,
}) => {
  await page.goto('/filter-presentation');
  const toggle = page.getByRole('button', {
    name: 'More filters (1 active)',
    exact: true,
  });
  await toggle.click();
  const secondary = page.getByRole('group', {
    name: 'Secondary filters',
    exact: true,
  });
  const labels = await secondary
    .getByRole('button')
    .evaluateAll(elements =>
      elements.map(element => (element as HTMLElement).innerText)
    );
  expect(labels).toEqual(['Any', 'All', 'All', 'At least 100', 'Any']);
  await secondary
    .getByRole('button', { name: 'Billing status: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'Overdue', exact: true }).click();
  await secondary
    .getByRole('button', { name: 'Account owner: All', exact: true })
    .click();
  await page.getByRole('option', { name: 'Amira', exact: true }).click();
  await page.getByRole('option', { name: 'Jonas', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(2);
  expect(
    await page
      .getByRole('button', { name: 'More filters (3 active)', exact: true })
      .count()
  ).toBe(1);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect.poll(() => secondary.count()).toBe(0);
  const closed = page.getByRole('button', {
    name: 'More filters',
    exact: true,
  });
  expect(await closed.getAttribute('aria-expanded')).toBe('false');
  await expect
    .poll(() => closed.evaluate(element => element === document.activeElement))
    .toBe(true);
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(9);
  await closed.click();
  expect(
    await secondary
      .getByRole('button', { name: 'Billing status: All', exact: true })
      .count()
  ).toBe(1);
  expect(
    await secondary
      .getByRole('button', { name: 'Account owner: All', exact: true })
      .count()
  ).toBe(1);
});

test('display settings retain nested calendar changes and dismiss one overlay at a time', async ({
  page,
}) => {
  await page.goto('/time-app?displayDate');
  const display = page.getByRole('dialog', {
    name: 'Display options',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Display options', exact: true })
    .click();
  await display.getByRole('button', { name: /^Choose dates/ }).click();
  const calendar = page.getByRole('dialog').filter({
    has: page.getByRole('checkbox', {
      name: 'Compare with previous period',
      exact: true,
    }),
  });
  await calendar
    .getByRole('checkbox', {
      name: 'Compare with previous period',
      exact: true,
    })
    .check();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('compare'))
    .toBe('previous');
  await page.keyboard.press('Escape');
  await expect.poll(() => calendar.count()).toBe(0);
  expect(await display.isVisible()).toBe(true);
  await expect
    .poll(() =>
      display.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => display.count()).toBe(0);
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Display options (1 changed)',
          exact: true,
        })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
});

test('search with display-only controls does not create an empty scope row', async ({
  page,
}) => {
  await page.goto('/filter-presentation?displayOnly');
  await page
    .getByRole('searchbox', { name: 'Search customers' })
    .fill('Beacon');
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(2);
  expect(
    await page.getByRole('group', { name: 'Filters', exact: true }).count()
  ).toBe(0);
  const options = page.getByRole('group', {
    name: 'View options',
    exact: true,
  });
  await options.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(9);
});

test('hidden control regions leave no empty row between the header and content', async ({
  page,
}) => {
  await page.goto('/filters?hideControls');
  const main = page.getByRole('main');
  const header = await main
    .locator('header')
    .filter({
      has: page.getByRole('heading', { name: 'Filter workflows', exact: true }),
    })
    .boundingBox();
  const result = await page
    .getByRole('region', { name: 'Result', exact: true })
    .boundingBox();
  const gap = await main.evaluate(element =>
    parseFloat(getComputedStyle(element).rowGap)
  );
  expect(result!.y - header!.y - header!.height).toBeCloseTo(gap, 0);
  expect(await page.getByRole('searchbox').count()).toBe(0);
  expect(
    await page.getByRole('button', { name: 'Alpha Display' }).count()
  ).toBe(0);
});

test('custom filters retain automatic search controls and URL state', async ({
  page,
}) => {
  await page.goto('/filters?customControls');
  const search = page.getByRole('group', { name: 'Search variables' });
  const filters = page.getByRole('region', { name: 'Custom filters' });
  expect(
    await search.getByRole('searchbox', { name: 'Search', exact: true }).count()
  ).toBe(1);
  expect(await filters.getByRole('searchbox').count()).toBe(0);
  expect(
    await search.getByRole('button', { name: 'Alpha Display' }).count()
  ).toBe(0);
  const displayed = page.getByRole('status', { name: 'Displayed filters' });
  await search.getByRole('searchbox').fill('France');
  await expect
    .poll(async () => decode(await displayed.textContent()).search)
    .toBe('France');
  expect(new URL(page.url()).searchParams.get('q')).toBe('France');
  await choose(page, filters, 'Display', 'Beta');
  await expect
    .poll(async () => decode(await displayed.textContent()).choice)
    .toBe('b');
  await filters.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect
    .poll(async () => decode(await displayed.textContent()).search)
    .toBe('');
  expect(await search.getByRole('searchbox').inputValue()).toBe('');
});

test('hiding search preserves its URL value and leaves filters available', async ({
  page,
}) => {
  await page.goto('/filters?hideSearch&q=France');
  const displayed = page.getByRole('status', { name: 'Displayed filters' });
  await expect
    .poll(async () => decode(await displayed.textContent()).search)
    .toBe('France');
  expect(await page.getByRole('searchbox').count()).toBe(0);
  await choose(page, page, 'Display', 'Beta');
  await expect
    .poll(async () => decode(await displayed.textContent()).choice)
    .toBe('b');
  expect(new URL(page.url()).searchParams.get('q')).toBe('France');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect
    .poll(async () => decode(await displayed.textContent()).search)
    .toBe('');
});

test('generated search has its own row above filters with consistent hover borders', async ({
  page,
}) => {
  await page.goto('/filters');
  const search = page.getByRole('group', { name: 'Search variables' });
  const field = search.getByRole('searchbox').locator('..');
  const display = page.getByRole('button', { name: 'Alpha Display' });
  const country = page.getByRole('button', {
    name: 'Country: All',
    exact: true,
  });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const searchBox = await search.boundingBox();
    const fieldBox = await field.boundingBox();
    const filterBox = await display.boundingBox();
    expect(fieldBox!.width).toBeCloseTo(Math.min(searchBox!.width, 400), 0);
    expect(searchBox!.y + searchBox!.height).toBeLessThan(filterBox!.y);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await field.hover();
  const border = await field.evaluate(
    element => getComputedStyle(element).borderColor
  );
  for (const control of [display, country]) {
    await control.hover();
    await expect
      .poll(() =>
        control.evaluate(element => getComputedStyle(element).borderColor)
      )
      .toBe(border);
  }
});

test('visible single choices, independent choices, and numeric fields preserve their distinct values', async ({
  page,
}) => {
  await page.goto('/controls');
  const region = page.getByRole('region', { name: 'Filter primitives' });
  function values() {
    return region
      .getByRole('status', { name: 'Primitive values' })
      .textContent();
  }
  const currency = region.getByRole('button', { name: / Currency$/ });
  await currency.focus();
  await currency.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect.poll(async () => decode(await values()).currency).toBe('usd');
  await expect
    .poll(() =>
      currency.evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  const controlHeight = await region
    .getByRole('button', { name: 'US dollar Currency', exact: true })
    .evaluate(element => element.getBoundingClientRect().height);
  for (const name of ['Cancel', 'Apply filters'])
    expect(
      await region
        .getByRole('button', { name, exact: true })
        .evaluate(element => element.getBoundingClientRect().height)
    ).toBe(controlHeight);
  const radios = region.getByRole('radiogroup', { name: 'Metric' });
  await radios.getByRole('radio', { name: 'Orders', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  expect(
    await radios
      .getByRole('radio', { name: 'Revenue', exact: true })
      .isChecked()
  ).toBe(true);
  await region.getByRole('radio', { name: 'Monthly', exact: true }).focus();
  await page.keyboard.press('Space');
  await region.getByRole('checkbox', { name: 'Pending', exact: true }).check();
  expect(decode(await values())).toMatchObject({
    currency: 'usd',
    metric: 'revenue',
    grouping: 'monthly',
    states: ['paid', 'pending'],
    threshold: 0,
  });
  const threshold = region.getByLabel('Threshold');
  await threshold.fill('2.5');
  await threshold.press('Tab');
  await expect.poll(async () => decode(await values()).threshold).toBe(2.5);
  await threshold.fill('');
  await threshold.press('Tab');
  await expect.poll(async () => decode(await values()).threshold).toBeNull();
  const range = region.getByRole('group', { name: 'Order amount' });
  await range.getByLabel('Minimum').fill('10');
  await range.getByLabel('Minimum').press('Tab');
  await range.getByLabel('Maximum').fill('5');
  await range.getByLabel('Maximum').press('Tab');
  expect(await range.getByRole('alert').textContent()).toBe(
    'Minimum must not exceed maximum.'
  );
  expect(decode(await values()).range).toEqual({ min: 10 });
  await range.getByLabel('Maximum').fill('20');
  await range.getByLabel('Maximum').press('Tab');
  await expect
    .poll(async () => decode(await values()).range)
    .toEqual({ min: 10, max: 20 });
});

test('generated filters apply typed predicates and clear restrictions atomically across URL history', async ({
  page,
}) => {
  await page.goto('/filters');
  const displayed = page.getByRole('status', { name: 'Displayed filters' });
  await expect
    .poll(async () => decode(await displayed.textContent()).active)
    .toEqual({ kind: 'is', value: true });
  await choose(page, page, 'Active', 'No');
  await expect
    .poll(async () => decode(await displayed.textContent()).active)
    .toEqual({ kind: 'is', value: false });
  await choose(page, page, 'Display', 'Beta');
  await page.getByRole('button', { name: 'Tags: None', exact: true }).click();
  await page
    .getByRole('listbox', { name: 'Tags values' })
    .getByRole('option', { name: 'Alpha', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  const beforeNumberEdit = page.url();
  await page
    .getByRole('button', { name: 'Amount: At least 10', exact: true })
    .click();
  const panel = page.getByRole('dialog', {
    name: 'Amount filter',
    exact: true,
  });
  await choose(page, panel, 'Condition', 'At least');
  const amount = panel.getByLabel('Value', { exact: true });
  await amount.fill('0');
  await amount.press('Tab');
  expect(page.url()).toBe(beforeNumberEdit);
  expect(decode(await displayed.textContent()).amount).toEqual({
    kind: 'range',
    min: 10,
  });
  await panel.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('button', { name: 'Amount: At least 10', exact: true })
    .click();
  await choose(page, panel, 'Condition', 'At least');
  await amount.fill('0');
  await amount.press('Tab');
  await panel.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'comparison', operator: 'gte', value: 0 });
  await page
    .getByRole('button', { name: 'Amount: At least 0', exact: true })
    .click();
  await choose(page, panel, 'Condition', 'Between');
  await panel.getByLabel('Minimum', { exact: true }).fill('10');
  await panel.getByLabel('Minimum', { exact: true }).press('Tab');
  await panel.getByLabel('Maximum', { exact: true }).fill('5');
  await panel.getByLabel('Maximum', { exact: true }).press('Tab');
  expect(
    await panel.getByRole('button', { name: 'Apply', exact: true }).isDisabled()
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => panel.count()).toBe(0);
  expect(decode(await displayed.textContent()).amount).toEqual({
    kind: 'comparison',
    operator: 'gte',
    value: 0,
  });
  await page.getByRole('button', { name: 'Country: All', exact: true }).click();
  await page.getByRole('option', { name: 'France', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await choose(page, page, 'Country matching', 'Exclude');
  await expect
    .poll(async () => decode(await displayed.textContent()).country.kind)
    .toBe('exclude');
  const countryButton = page.getByRole('button', {
    name: 'Country: France',
    exact: true,
  });
  const clear = page.getByRole('button', {
    name: 'Clear',
    exact: true,
  });
  const height = await countryButton.evaluate(
    element => element.getBoundingClientRect().height
  );
  expect(
    await clear.evaluate(element => element.getBoundingClientRect().height)
  ).toBe(height);
  expect(
    await page.getByRole('button', { name: 'Reset filters' }).count()
  ).toBe(0);
  expect(await clear.textContent()).toBe('Clear');
  expect(await clear.locator('svg').count()).toBe(0);
  const selectedURL = page.url();
  expect(
    await page
      .getByRole('button', { name: 'Clear country', exact: true })
      .count()
  ).toBe(0);
  expect(await page.getByRole('list', { name: 'Active filters' }).count()).toBe(
    0
  );
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect
    .poll(async () => decode(await displayed.textContent()))
    .toMatchObject({
      amount: { kind: 'all' },
      active: { kind: 'all' },
      country: { kind: 'all' },
      choice: 'b',
      tags: ['a'],
    });
  expect(await page.getByRole('list', { name: 'Active filters' }).count()).toBe(
    0
  );
  await page.goBack();
  await expect.poll(() => page.url()).toBe(selectedURL);
  await expect
    .poll(async () => decode(await displayed.textContent()).country.kind)
    .toBe('exclude');
  await page.goto('/filters');
  await expect
    .poll(async () => decode(await displayed.textContent()))
    .toEqual({
      search: '',
      choice: 'a',
      tags: [],
      amount: { kind: 'range', min: 10 },
      active: { kind: 'is', value: true },
      country: { kind: 'all' },
    });
  await page.reload();
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'range', min: 10 });
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Amount: Any', exact: true }).click();
  await choose(page, panel, 'Condition', 'Equals');
  await panel.getByRole('button', { name: 'Apply', exact: true }).click();
  expect(await panel.getByRole('alert').textContent()).toBe('Enter a value.');
  await panel.getByLabel('Value', { exact: true }).fill('5');
  await panel.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'comparison', operator: 'eq', value: 5 });
});

test('mobile numeric entry and compact selects enforce the shared 16px minimum', async ({
  mobilePage: page,
}) => {
  await page.goto('/controls');
  const region = page.getByRole('region', { name: 'Filter primitives' });
  for (const field of [
    region.getByRole('button', { name: / Currency$/ }),
    region.getByLabel('Threshold'),
  ])
    expect(
      await field.evaluate(element =>
        parseFloat(getComputedStyle(element).fontSize)
      )
    ).toBeGreaterThanOrEqual(16);
});
