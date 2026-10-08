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
    name: 'Clear filters',
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
  await clear.hover();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('Clear filters');
  const selectedURL = page.url();
  expect(
    await page
      .getByRole('button', { name: 'Clear country', exact: true })
      .count()
  ).toBe(0);
  expect(await page.getByRole('list', { name: 'Active filters' }).count()).toBe(
    0
  );
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
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
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
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
