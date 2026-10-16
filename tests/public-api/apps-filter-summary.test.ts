import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';
import { scrollPastToolbar } from '@/tests/public-api/filter-summary';

test('toolbar and floating summaries disclose the same active scope without duplicating primary controls', async ({
  page,
}) => {
  const params = new URLSearchParams({
    start: '2026-03-10',
    end: '2026-03-12',
    secondaryRegion: '1',
    region: JSON.stringify({ kind: 'include', members: [['v', 'Europe']] }),
  });
  await page.goto(`/time-app?${params}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  const floating = page.getByRole('group', {
    name: 'Active filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Open filters: Region: Europe', exact: true })
    .waitFor();
  expect(await floating.count()).toBe(0);
  expect(
    await toolbar
      .getByRole('button', { name: 'Choose dates Date range', exact: true })
      .count()
  ).toBe(1);
  expect(
    await inline
      .getByRole('button', { name: 'Remove Date range filter', exact: true })
      .count()
  ).toBe(0);
  await scrollPastToolbar(page);
  expect(
    await floating
      .getByRole('button', { name: 'Remove Date range filter', exact: true })
      .count()
  ).toBe(1);
  const region = floating.getByRole('button', {
    name: 'Open filters: Region: Europe',
    exact: true,
  });
  await region.click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => sheet.count()).toBe(0);
  await expect
    .poll(() => region.evaluate(element => document.activeElement === element))
    .toBe(true);
  expect(
    await toolbar.evaluate(element => element.getBoundingClientRect().bottom)
  ).toBeLessThanOrEqual(0);
  await floating
    .getByRole('button', { name: 'Open filters', exact: true })
    .focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => floating.count()).toBe(0);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters (2 active)', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await inline
    .getByRole('button', { name: 'Remove Region filter', exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has('region'))
    .toBe(false);
  expect(new URL(page.url()).searchParams.get('start')).toBe('2026-03-10');
  await scrollPastToolbar(page);
  expect(
    await floating
      .getByRole('button', { name: 'Remove Region filter', exact: true })
      .count()
  ).toBe(0);
  await floating
    .getByRole('button', { name: 'Remove Date range filter', exact: true })
    .click();
  await expect.poll(() => floating.count()).toBe(0);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate(
          element =>
            document.activeElement === element &&
            element.getBoundingClientRect().top >= -1
        )
    )
    .toBe(true);
});

test('inactive secondary filters stay in the sheet and active chips preserve unrelated URL state', async ({
  page,
}) => {
  const params = new URLSearchParams({
    q: 'retained',
    'revenue-by': 'country',
    country: JSON.stringify({ kind: 'include', members: [['v', 'fr']] }),
  });
  await page.goto(`/exploration?${params}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Open filters: Country: France', exact: true })
    .waitFor();
  expect(
    await inline
      .getByRole('button', { name: 'Remove Region filter', exact: true })
      .count()
  ).toBe(0);
  await inline
    .getByRole('button', { name: 'Open filters: Country: France', exact: true })
    .click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  expect(
    await sheet
      .getByRole('button', { name: 'Region: All', exact: true })
      .count()
  ).toBe(1);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(() => sheet.count()).toBe(0);
  await expect
    .poll(() =>
      inline
        .getByRole('button', {
          name: 'Open filters: Country: France',
          exact: true,
        })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
  await inline
    .getByRole('button', { name: 'Remove Country filter', exact: true })
    .press('Enter');
  await expect
    .poll(() =>
      inline
        .getByRole('button', { name: 'Remove Country filter', exact: true })
        .count()
    )
    .toBe(0);
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  expect(new URL(page.url()).searchParams.get('q')).toBe('retained');
  expect(new URL(page.url()).searchParams.get('revenue-by')).toBe('country');
});
