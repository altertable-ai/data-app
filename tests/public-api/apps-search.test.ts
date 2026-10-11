import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

const url = '/filter-presentation?spend=all&typeahead';

test('typeahead uses displayed records and supports manual keyboard selection', async ({
  page,
}) => {
  await page.goto(`${url}&openDetails`);
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
  await expect.poll(() => input.inputValue()).toBe('Beacon Labs');
  expect(await page.getByRole('dialog').count()).toBe(0);
});

test('hidden search does not expose a suggestion panel', async ({ page }) => {
  await page.goto(`${url}&hideSearch&q=Beacon`);
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(2);
  expect(await page.getByRole('combobox').count()).toBe(0);
  expect(await page.getByRole('listbox').count()).toBe(0);
});

test('arrow navigation cycles through every suggestion and the unselected search state', async ({
  page,
}) => {
  await page.goto(url);
  const input = page.getByRole('combobox');
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  expect(await input.getAttribute('aria-activedescendant')).toBeNull();
  for (let index = 0; index < 5; index++) await input.press('ArrowDown');
  expect(await options.last().getAttribute('aria-selected')).toBe('true');
  await input.press('ArrowDown');
  expect(await input.getAttribute('aria-activedescendant')).toBeNull();
  await input.press('Enter');
  expect(await input.inputValue()).toBe('a');
  expect(await page.getByRole('dialog').count()).toBe(0);
  await input.press('ArrowUp');
  expect(await options.last().getAttribute('aria-selected')).toBe('true');
  for (let index = 0; index < 5; index++) await input.press('ArrowUp');
  expect(await input.getAttribute('aria-activedescendant')).toBeNull();
});

test('suggestions stay on one line aligned with the input and do not flash an empty loading panel', async ({
  page,
}) => {
  await page.goto(`${url}&slowSearch`);
  const input = page.getByRole('combobox');
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  await expect.poll(() => input.getAttribute('aria-busy')).toBeNull();
  const inputBox = await input.boundingBox();
  const titleBox = await options.first().locator('span').boundingBox();
  const detailBox = await options.first().locator('small').boundingBox();
  expect(Math.abs(inputBox!.x - titleBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(titleBox!.y - detailBox!.y)).toBeLessThan(5);
  const panel = page.getByRole('listbox');
  const before = await panel.boundingBox();
  await input.fill('Beacon');
  await expect.poll(() => input.getAttribute('aria-busy')).toBe('true');
  expect((await panel.boundingBox())!.height).toBe(before!.height);
  await input.fill('missing');
  await expect
    .poll(() =>
      page.getByText('No matching customers', { exact: true }).count()
    )
    .toBe(1);
  expect(await panel.count()).toBe(0);
  await input.fill('Beacon');
  await expect.poll(() => input.getAttribute('aria-busy')).toBe('true');
  expect(await panel.count()).toBe(0);
  await expect.poll(() => options.count()).toBe(1);
});

test('multiple datasets combine suggestions without extra requests or colliding record IDs', async ({
  page,
}) => {
  await page.goto('/search-catalog');
  const input = page.getByRole('combobox', { name: 'Search workspace' });
  await expect.poll(() => page.getByRole('table').count()).toBe(2);
  const requests = await page.locator('body').getAttribute('data-requests');
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(4);
  expect(await options.allTextContents()).toEqual([
    'AlicePerson · Design',
    'AmiraPerson · Engineering',
    'AlphaProject · Active',
    'AlpineProject · Planning',
  ]);
  const ids = await options.evaluateAll(elements =>
    elements.map(element => element.id)
  );
  expect(new Set(ids).size).toBe(4);
  expect(Number(await page.locator('body').getAttribute('data-requests'))).toBe(
    Number(requests) + 1
  );
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect.poll(() => input.inputValue()).toBe('Alpine');
  await expect
    .poll(() => page.getByRole('table').nth(1).getByRole('row').count())
    .toBe(2);
  expect(await page.getByRole('dialog').count()).toBe(0);
});
