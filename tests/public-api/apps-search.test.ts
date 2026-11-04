import type { Page } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

// Playwright resolves the ARIA 1.3 mark role, but its role type does not list it yet.
const mark = 'mark' as Parameters<Page['getByRole']>[0];
const url = '/filter-presentation?spend=all&typeahead';

test('typeahead uses displayed records and supports manual keyboard selection', async ({
  page,
}) => {
  await page.goto(`${url}&openDetails`);
  const input = page.getByRole('combobox', { name: 'Search customers' });
  const options = page.getByRole('option');
  await input.click();
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
    'Beacon Labs'
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
  const titleBox = await options
    .first()
    .getByText('Foundry Team', { exact: true })
    .boundingBox();
  const detailBox = await options
    .first()
    .getByText('DE · Enterprise', { exact: true })
    .boundingBox();
  expect(Math.abs(inputBox!.x - titleBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(titleBox!.y - detailBox!.y)).toBeLessThan(5);
  expect(detailBox!.x - (titleBox!.x + titleBox!.width)).toBeLessThanOrEqual(
    10
  );
  const panel = page.getByRole('listbox');
  const panelBox = await panel.boundingBox();
  expect(panelBox!.x).toBeLessThan(inputBox!.x);
  expect(panelBox!.width).toBeLessThanOrEqual(640);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(1280 - 12);
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
  expect(
    await page
      .getByRole('button', { name: 'Design: 1 people', exact: true })
      .count()
  ).toBe(1);
  expect(
    await page
      .getByRole('button', { name: 'Complete: 1 projects', exact: true })
      .count()
  ).toBe(1);
  const requests = page.getByRole('status', { name: 'Data requests' });
  const initialRequests = Number(await requests.textContent());
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
  expect(Number(await requests.textContent())).toBe(initialRequests + 1);
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect.poll(() => input.inputValue()).toBe('Alpine');
  await expect
    .poll(() => page.getByRole('table').nth(1).getByRole('row').count())
    .toBe(2);
  expect(
    await page
      .getByRole('button', { name: 'Planning: 1 projects', exact: true })
      .count()
  ).toBe(1);
  expect(
    await page
      .getByRole('button', { name: 'Active: 1 projects', exact: true })
      .count()
  ).toBe(0);
  expect(
    await page.getByText('No matching people', { exact: true }).count()
  ).toBe(1);
  expect(await page.getByRole('dialog').count()).toBe(0);
});

test('suggestions use the shared highlighting stack without filtering the displayed result again', async ({
  page,
}) => {
  await page.goto(`${url}&slowSearch`);
  const input = page.getByRole('combobox');
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  await expect.poll(() => input.getAttribute('aria-busy')).toBeNull();
  expect(
    await options
      .first()
      .getByText(/^Foundry Team$|^Beacon Labs$/)
      .getByRole(mark)
      .allTextContents()
  ).toEqual(['a']);
  expect(await options.first().getByText(/ · /).getByRole(mark).count()).toBe(
    0
  );
  await input.fill('e');
  await expect.poll(() => input.getAttribute('aria-busy')).toBeNull();
  expect(
    await options.first().getByText(/ · /).getByRole(mark).count()
  ).toBeGreaterThan(0);
  await input.fill('Beacon');
  await expect.poll(() => input.getAttribute('aria-busy')).toBe('true');
  expect(await options.count()).toBe(5);
  expect(
    await options
      .first()
      .getByText(/^Foundry Team$|^Beacon Labs$/)
      .getByRole(mark)
      .textContent()
  ).toBe('Beacon');
  await expect.poll(() => options.count()).toBe(1);
  expect(
    await options
      .first()
      .getByText(/^Foundry Team$|^Beacon Labs$/)
      .getByRole(mark)
      .textContent()
  ).toBe('Beacon');
  await options.first().click();
  await expect.poll(() => input.inputValue()).toBe('Beacon Labs');
});

test('suggestion metadata can be disabled while keeping live search', async ({
  page,
}) => {
  await page.goto('/filter-presentation?spend=all');
  const input = page.getByRole('searchbox', { name: 'Search customers' });
  await input.fill('Beacon');
  await expect
    .poll(() => page.getByRole('table').getByRole('row').count())
    .toBe(2);
  expect(await page.getByRole('combobox').count()).toBe(0);
  expect(await page.getByRole('listbox').count()).toBe(0);
});

test('suggestions balance datasets and redistribute slots from sparse or empty datasets', async ({
  page,
}) => {
  await page.goto('/search-catalog?manyPeople');
  const input = page.getByRole('combobox', { name: 'Search workspace' });
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  expect(await options.allTextContents()).toEqual([
    'AlicePerson · Design',
    'AmiraPerson · Engineering',
    'AdaPerson · Design',
    'AlphaProject · Active',
    'AlpineProject · Planning',
  ]);
  await input.fill('al');
  await expect.poll(() => options.count()).toBe(4);
  expect(await options.allTextContents()).toEqual([
    'AlicePerson · Design',
    'AlanPerson · Design',
    'AlphaProject · Active',
    'AlpineProject · Planning',
  ]);
  await input.fill('A');
  await expect.poll(() => options.count()).toBe(5);
  await input.fill('Ami');
  await expect.poll(() => options.count()).toBe(2);
  expect(await options.allTextContents()).toEqual([
    'AmiraPerson · Engineering',
    'AminaPerson · Design',
  ]);
});

test('sparse datasets yield unused suggestion slots to other datasets', async ({
  page,
}) => {
  await page.goto('/search-catalog?manyPeople&singleProject');
  const input = page.getByRole('combobox', { name: 'Search workspace' });
  await input.fill('a');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  expect(await options.allTextContents()).toEqual([
    'AlicePerson · Design',
    'AmiraPerson · Engineering',
    'AdaPerson · Design',
    'AlanPerson · Design',
    'AlphaProject · Active',
  ]);
  await page.goto('/search-catalog?manyPeople&noProjects');
  await input.fill('a');
  await expect.poll(() => options.count()).toBe(5);
  expect(await options.allTextContents()).toEqual([
    'AlicePerson · Design',
    'AmiraPerson · Engineering',
    'AdaPerson · Design',
    'AlanPerson · Design',
    'AminaPerson · Design',
  ]);
});

test('only the first declared search receives suggestions and the page shortcut', async ({
  page,
}) => {
  await page.goto('/search-catalog?secondSearch');
  const primary = page.getByRole('combobox', { name: 'Search workspace' });
  const secondary = page.getByRole('searchbox', { name: 'Search notes' });
  await secondary.fill('a');
  expect(await page.getByRole('listbox').count()).toBe(0);
  await page.keyboard.press('Control+k');
  expect(
    await primary.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await primary.fill('a');
  await expect.poll(() => page.getByRole('option').count()).toBe(4);
  expect(await secondary.inputValue()).toBe('a');
});

for (const mode of ['hideSearch', 'noSearch']) {
  test(`${mode} skips suggestion callbacks and validation`, async ({
    page,
  }) => {
    await page.goto(`/search-catalog?${mode}&invalidSuggestions`);
    await expect.poll(() => page.getByRole('table').count()).toBe(2);
    expect(await page.getByRole('combobox').count()).toBe(0);
    expect(await page.getByRole('searchbox').count()).toBe(0);
    expect(
      await page.getByRole('status', { name: 'Suggestion reads' }).textContent()
    ).toBe('0');
    expect(await page.getByRole('alert').count()).toBe(0);
  });
}

test('page search shortcuts remain unconsumed inside a native modal sheet', async ({
  page,
}) => {
  await page.goto('/filter-presentation?spend=all');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect.poll(() => sheet.count()).toBe(1);
  const target = sheet.getByRole('button').first();
  for (const modifier of ['Control', 'Meta']) {
    await target.press(`${modifier}+k`);
    expect(
      await target.evaluate(element => element === document.activeElement)
    ).toBe(true);
    expect(await sheet.isVisible()).toBe(true);
  }
});

test('title matches precede related descriptions and reach suggestions beyond the first five rows', async ({
  page,
}) => {
  await page.goto('/search-catalog?manyPeople&relatedSearch');
  await page.getByRole('combobox').fill('Alpha');
  const options = page.getByRole('option');
  await expect.poll(() => options.count()).toBe(5);
  expect((await options.allTextContents()).slice(0, 2)).toEqual([
    'Alpha personAlpha · Design',
    'AlphaProject · Active',
  ]);
  expect(
    await page.getByRole('table').first().getByRole('row').count()
  ).toBeGreaterThan(5);
});
