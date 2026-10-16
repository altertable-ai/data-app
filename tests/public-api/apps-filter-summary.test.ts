import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';
import { scrollPastToolbar } from '@/tests/public-api/filter-summary';

test('toolbar editors and floating summaries disclose the same active scope without duplicating primary controls', async ({
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
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .waitFor();
  expect(await floating.count()).toBe(0);
  expect(
    await toolbar.getByRole('button', { name: /^Remove .* filter$/ }).count()
  ).toBe(0);
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
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
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

test('active secondary filters edit directly and preserve unrelated URL state', async ({
  page,
}) => {
  const params = new URLSearchParams({
    q: 'retained',
    'revenue-by': 'country',
    country: JSON.stringify({ kind: 'include', members: [['v', 'fr']] }),
    region: JSON.stringify({ kind: 'include', members: [['v', 'eu']] }),
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
    .getByRole('button', { name: 'Region: Europe', exact: true })
    .click();
  expect(
    await page.getByRole('dialog', { name: 'Filters', exact: true }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'America', exact: true }).click();
  await inline
    .getByRole('button', { name: 'Region: America', exact: true })
    .waitFor();
  expect(JSON.parse(new URL(page.url()).searchParams.get('region')!)).toEqual({
    kind: 'include',
    members: [['v', 'us']],
  });
  await inline
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect
    .poll(() =>
      inline
        .getByRole('button', { name: 'Country: France', exact: true })
        .count()
    )
    .toBe(0);
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  expect(new URL(page.url()).searchParams.get('q')).toBe('retained');
  expect(new URL(page.url()).searchParams.get('revenue-by')).toBe('country');
  await toolbar.getByRole('button', { name: /^Filters/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await sheet
    .getByRole('button', { name: 'Country: All', exact: true })
    .waitFor();
});

test('clearing a secondary filter through its editor removes the toolbar control', async ({
  page,
}) => {
  const country = JSON.stringify({ kind: 'include', members: [['v', 'fr']] });
  await page.goto(`/exploration?${new URLSearchParams({ country })}`);
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  const inline = toolbar.getByRole('group', {
    name: 'Active toolbar filters',
    exact: true,
  });
  await inline
    .getByRole('button', { name: 'Country: France', exact: true })
    .click();
  expect(
    await page.getByRole('dialog', { name: 'Filters', exact: true }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect.poll(() => inline.count()).toBe(0);
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  await expect
    .poll(() =>
      toolbar
        .getByRole('button', { name: 'Filters', exact: true })
        .evaluate(element => document.activeElement === element)
    )
    .toBe(true);
});
