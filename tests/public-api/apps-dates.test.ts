import { readFile } from 'node:fs/promises';

import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('widget headings share muted typography and preserve section hierarchy', async ({
  page,
}) => {
  await page.goto('/date-presentation');
  await expect.poll(() => page.getByRole('table').count()).toBe(1);
  expect(
    await page
      .getByRole('heading', { name: 'Event overview', level: 2 })
      .count()
  ).toBe(1);
  const headingSizes = await page
    .getByRole('heading', { name: 'Witness reports', level: 3 })
    .evaluate(element => {
      const chevron = element.querySelector('svg')!;
      const count = element.querySelector('.altertable-data-widget-count')!;
      return {
        heading: parseFloat(getComputedStyle(element).fontSize),
        chevron: parseFloat(getComputedStyle(chevron).width),
        count: parseFloat(getComputedStyle(count).fontSize),
      };
    });
  expect(headingSizes.chevron).toBe(headingSizes.heading);
  expect(headingSizes.count).toBeCloseTo(headingSizes.heading * 0.85, 1);
  const styles: string[][] = [];
  for (const name of [
    'Events',
    'Busiest bucket',
    'Street timeline',
    'Witness reports',
  ]) {
    styles.push(
      await page
        .getByRole('heading', { name, level: 3, exact: true })
        .evaluate(element => {
          const style = getComputedStyle(element);
          return [
            style.fontSize,
            style.fontWeight,
            style.color,
            style.lineHeight,
          ];
        })
    );
  }
  expect(
    styles.every(style => JSON.stringify(style) === JSON.stringify(styles[0]))
  ).toBe(true);
  expect(
    await page
      .getByRole('heading', { name: 'Events', level: 3, exact: true })
      .evaluate(element => getComputedStyle(element).color)
  ).toBe(
    await page
      .locator('.altertable-data-table thead th')
      .first()
      .evaluate(element => getComputedStyle(element).color)
  );
});

test('dates share locale and reporting zone with explicit overrides and raw CSV', async ({
  page,
}) => {
  await page.goto('/date-presentation');
  const row = page.getByRole('table').getByRole('row').nth(1);
  await expect.poll(() => row.textContent()).toContain('24 Sept 2026');
  const cells = row.getByRole('cell');
  expect(await cells.nth(0).innerText()).toBe('24 Sept 2026, 11:00:05');
  expect(await cells.nth(1).innerText()).toBe('24 Sept 2026, 15:00:05');
  expect(await cells.nth(2).innerText()).toBe('—');
  expect(
    await cells.nth(0).evaluate(element => getComputedStyle(element).textAlign)
  ).toBe('end');
  expect(
    await row
      .getByRole('rowheader')
      .evaluate(element => getComputedStyle(element).textAlign)
  ).toBe('start');
  expect(
    await page
      .getByRole('button', { name: '11:00: 1 events', exact: true })
      .count()
  ).toBe(1);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloading;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('2026-09-24T15:00:05Z');
  expect(csv).toContain('2026-09-24 15:00:05');
  expect(csv).not.toContain('24 Sept');
});

test('exact date disclosure and inspection retain the reporting zone', async ({
  page,
}) => {
  await page.goto('/date-presentation');
  await expect.poll(() => page.getByRole('table').count()).toBe(1);
  await page
    .getByRole('button', {
      name: 'Show exact date and time: 24 Sept 2026, 11:00:05',
      exact: true,
    })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Date and time details',
    exact: true,
  });
  await expect.poll(() => detail.innerText()).toContain('America/New_York');
  expect(await detail.innerText()).toContain('24 Sept 2026, 15:00:05');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Explore Witness reports', exact: true })
    .click();
  const inspection = page.getByRole('dialog');
  await expect
    .poll(() => inspection.getByRole('table').textContent())
    .toContain('24 Sept 2026, 11:00:05');
});

test('independently queried visuals keep their reporting zone when inspected', async ({
  page,
}) => {
  await page.goto('/date-presentation');
  await expect
    .poll(() =>
      page
        .getByRole('button', {
          name: 'Show exact date and time: 25 Sept 2026, 00:00',
          exact: true,
        })
        .count()
    )
    .toBe(1);
  await page
    .getByRole('button', { name: 'Explore Tokyo timestamp', exact: true })
    .click();
  const inspection = page.getByRole('dialog');
  await expect
    .poll(() =>
      inspection
        .getByRole('button', {
          name: 'Show exact date and time: 25 Sept 2026, 00:00',
          exact: true,
        })
        .count()
    )
    .toBe(1);
  expect(await inspection.innerText()).not.toContain('24 Sept 2026, 11:00');
});

test('date displays use app defaults when no reporting view supplies a zone', async ({
  page,
}) => {
  await page.goto('/date-presentation?appDefaults');
  const date = page.getByRole('button', {
    name: 'Show exact date and time: 24 Sept 2026, 17:00',
    exact: true,
  });
  await expect.poll(() => date.count()).toBe(1);
  expect(await page.getByLabel('Table timestamp').innerText()).toBe(
    '24 Sept 2026, 17:00:05'
  );
  await date.click();
  const details = page.getByRole('dialog', {
    name: 'Date and time details',
    exact: true,
  });
  await expect.poll(() => details.innerText()).toContain('Europe/Paris');
});
