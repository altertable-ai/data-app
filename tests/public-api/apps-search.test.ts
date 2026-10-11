import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

const url = '/filter-presentation?spend=all&typeahead';

test('typeahead uses displayed records and supports manual keyboard selection', async ({
  page,
}) => {
  await page.goto(url);
  const input = page.getByRole('combobox', { name: 'Search customers' });
  const options = page.getByRole('option');
  await input.focus();
  expect(await page.getByRole('listbox').count()).toBe(0);
  await input.fill('a');
  await expect.poll(() => options.count()).toBe(5);
  expect(await options.first().innerText()).toContain('Foundry Team');
  expect(await page.getByRole('table').getByRole('row').count()).toBe(8);
  await input.press('ArrowDown');
  expect(await options.first().getAttribute('aria-selected')).toBe('true');
  expect(await input.getAttribute('aria-activedescendant')).toBe(
    await options.first().getAttribute('id')
  );
  expect(
    await input.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect
    .poll(() => page.getByRole('dialog', { name: 'Beacon Labs' }).count())
    .toBe(1);
  expect(await input.inputValue()).toBe('a');
  expect(await page.getByRole('listbox').count()).toBe(0);
});

test('Escape dismisses suggestions before clearing search and no matches stays in the page', async ({
  page,
}) => {
  await page.goto(url);
  const input = page.getByRole('combobox');
  await input.fill('Beacon');
  await expect.poll(() => page.getByRole('option').count()).toBe(1);
  await input.press('Escape');
  expect(await input.inputValue()).toBe('Beacon');
  expect(await input.getAttribute('aria-expanded')).toBe('false');
  await input.press('ArrowUp');
  expect(await page.getByRole('option').getAttribute('aria-selected')).toBe(
    'true'
  );
  await input.press('Escape');
  await input.press('Escape');
  await expect.poll(() => input.inputValue()).toBe('');
  await input.fill('missing customer');
  await expect
    .poll(() =>
      page.getByText('No matching customers', { exact: true }).count()
    )
    .toBe(1);
  expect(await page.getByRole('listbox').count()).toBe(0);
});

test('refresh retains suggestions with the displayed result and replaces both together', async ({
  page,
}) => {
  await page.goto(`${url}&slowSearch`);
  const input = page.getByRole('combobox');
  await input.fill('a');
  await expect.poll(() => page.getByRole('option').count()).toBe(5);
  await expect.poll(() => input.getAttribute('aria-busy')).toBeNull();
  await input.press('ArrowDown');
  await input.fill('Beacon');
  await expect.poll(() => input.getAttribute('aria-busy')).toBe('true');
  expect(await page.getByRole('option').first().innerText()).toContain(
    'Foundry Team'
  );
  expect(await page.getByRole('table').getByRole('row').count()).toBe(8);
  expect(await input.getAttribute('aria-activedescendant')).toBeNull();
  await expect.poll(() => input.getAttribute('aria-busy')).toBeNull();
  expect(await page.getByRole('option').count()).toBe(1);
  expect(await page.getByRole('option').innerText()).toContain('Beacon Labs');
  expect(await page.getByRole('table').getByRole('row').count()).toBe(2);
});

test('touch selection works in a popup constrained to the mobile search field', async ({
  mobilePage: page,
}) => {
  await page.goto(url);
  const input = page.getByRole('combobox');
  await input.fill('Beacon');
  const option = page.getByRole('option', { name: /Beacon Labs/ });
  await option.waitFor();
  const panel = await page.getByRole('listbox').boundingBox();
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(375);
  await option.tap();
  await expect
    .poll(() => page.getByRole('dialog', { name: 'Beacon Labs' }).count())
    .toBe(1);
  expect(await input.inputValue()).toBe('Beacon');
});

test('hidden search does not expose a suggestion panel', async ({ page }) => {
  await page.goto(`${url}&hideSearch&q=Beacon`);
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(2);
  expect(await page.getByRole('combobox').count()).toBe(0);
  expect(await page.getByRole('listbox').count()).toBe(0);
});
