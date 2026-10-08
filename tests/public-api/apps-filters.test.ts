import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

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
  await region.getByRole('combobox', { name: 'Currency' }).selectOption('usd');
  const controlHeight = await region
    .getByRole('combobox', { name: 'Currency' })
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
  await page
    .getByRole('combobox', { name: 'Active', exact: true })
    .selectOption('false');
  await expect
    .poll(async () => decode(await displayed.textContent()).active)
    .toEqual({ kind: 'is', value: false });
  await page
    .getByRole('combobox', { name: 'Display', exact: true })
    .selectOption('b');
  await page.getByRole('button', { name: 'Tags: None', exact: true }).click();
  await page
    .getByRole('listbox', { name: 'Tags values' })
    .getByRole('option', { name: 'Alpha', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('combobox', { name: 'Amount', exact: true })
    .selectOption('gte');
  const amount = page.getByLabel('Amount value', { exact: true });
  await amount.fill('0');
  await amount.press('Tab');
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'comparison', operator: 'gte', value: 0 });
  await page
    .getByRole('combobox', { name: 'Amount', exact: true })
    .selectOption('range');
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'range', min: 0 });
  await page
    .getByRole('combobox', { name: 'Amount', exact: true })
    .selectOption('gte');
  await expect
    .poll(async () => decode(await displayed.textContent()).amount)
    .toEqual({ kind: 'comparison', operator: 'gte', value: 0 });
  await page.getByRole('button', { name: 'Country: All', exact: true }).click();
  await page.getByRole('option', { name: 'France', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page
    .getByRole('combobox', { name: 'Country matching' })
    .selectOption('exclude');
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
  const countryClear = page.getByRole('button', {
    name: 'Clear country',
    exact: true,
  });
  await countryClear.click();
  await expect
    .poll(async () => decode(await displayed.textContent()).country)
    .toEqual({ kind: 'all' });
  expect(await page.getByRole('list', { name: 'Active filters' }).count()).toBe(
    0
  );
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Country: All', exact: true })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await page.goBack();
  await expect
    .poll(async () => decode(await displayed.textContent()).country.kind)
    .toBe('exclude');
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
});

test('mobile numeric entry and compact selects enforce the shared 16px minimum', async ({
  mobilePage: page,
}) => {
  await page.goto('/controls');
  const region = page.getByRole('region', { name: 'Filter primitives' });
  for (const field of [
    region.getByRole('combobox', { name: 'Currency' }),
    region.getByLabel('Threshold'),
  ])
    expect(
      await field.evaluate(element =>
        parseFloat(getComputedStyle(element).fontSize)
      )
    ).toBeGreaterThanOrEqual(16);
});
