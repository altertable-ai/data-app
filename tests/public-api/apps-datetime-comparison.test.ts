import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('datetime comparisons preserve selection through queries, reload, refresh, and clear', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-07-10T16:00:00Z'));
  await page.goto('/datetime-comparison');
  const picker = page.getByRole('combobox', {
    name: 'Date range',
    exact: true,
  });
  const output = page.getByRole('status', { name: 'Applied comparison' });
  await expect.poll(() => output.textContent()).toContain('"comparison":null');
  await picker.click();
  await picker.press('End');
  const compare = page.getByRole('checkbox', {
    name: 'Compare with previous period',
  });
  expect(
    await compare.evaluate(element => element === document.activeElement)
  ).toBe(true);
  expect(await picker.getAttribute('aria-activedescendant')).toBe(null);
  await compare.press('Enter');
  await picker.press('Escape');
  await expect
    .poll(() => output.textContent())
    .toContain('2026-06-26T16:00:00.000Z');
  expect(new URL(page.url()).searchParams.get('compare')).toBe('previous');
  expect(
    await page.getByText('100.0% vs', { exact: false }).count()
  ).toBeGreaterThan(0);
  await page.reload();
  await expect
    .poll(() => output.textContent())
    .toContain('2026-06-26T16:00:00.000Z');
  await page.clock.setFixedTime(new Date('2026-07-10T17:00:00Z'));
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect
    .poll(() => output.textContent())
    .toContain('2026-06-26T17:00:00.000Z');
  await expect
    .poll(() => output.textContent())
    .toContain('2026-07-10T17:00:00.000Z');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect.poll(() => output.textContent()).toContain('"comparison":null');
  expect(new URL(page.url()).searchParams.has('compare')).toBe(false);
});

test('coverage disables comparison and changing range repairs an unavailable previous period', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-07-10T16:00:00Z'));
  await page.goto('/datetime-comparison');
  const picker = page.getByRole('combobox', {
    name: 'Date range',
    exact: true,
  });
  await picker.click();
  await page
    .getByRole('checkbox', { name: 'Compare with previous period' })
    .click();
  await picker.click();
  await picker.fill('June 1 to June 3 2026');
  await picker.press('Enter');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied comparison' }).textContent()
    )
    .toContain('"comparison":null');
  await picker.click();
  expect(
    await page
      .getByRole('checkbox', { name: 'Compare with previous period' })
      .isEnabled()
  ).toBe(false);
  await picker.press('Escape');
  await page.goBack();
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied comparison' }).textContent()
    )
    .toContain('"comparison":"previous"');
});

test('calendar editing hides comparison until returning to presets', async ({
  page,
}) => {
  await page.goto('/datetime-comparison');
  await page.getByRole('combobox', { name: 'Date range', exact: true }).click();
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  expect(
    await page
      .getByRole('checkbox', { name: 'Compare with previous period' })
      .count()
  ).toBe(0);
  await page.getByRole('button', { name: '‹ Presets', exact: true }).click();
  expect(
    await page
      .getByRole('checkbox', { name: 'Compare with previous period' })
      .isVisible()
  ).toBe(true);
});

test('plain datetime views inherit the reporting contract timezone', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-07-10T16:00:00Z'));
  await page.goto('/datetime?policy&reportingZone=America%2FNew_York');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Reporting timezone' }).textContent()
    )
    .toBe('America/New_York');
});
