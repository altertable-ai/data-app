import { expect, test } from '@playwright/test';

test('variable selectors preserve types and simple UTC dates', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/query-variables');
  async function values() {
    return JSON.parse((await page.getByTestId('values').textContent())!);
  }
  async function enter(label: string, value: string) {
    await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
    const input = page.getByRole('searchbox', {
      name: `Search ${label.toLowerCase()} values`,
    });
    await input.fill(value);
    await input.press('Enter');
  }
  await enter('Text', "O'Reilly");
  await enter('Count', '4');
  await enter('Fraction', '2.75');
  expect((await values()).Text).toBe("O'Reilly");
  expect((await values()).Count).toBe(4);
  expect((await values()).Fraction).toBe(2.75);
  await enter('Count', '2.75');
  await expect(page.locator('.altertable-combobox-empty')).toBeVisible();
  expect((await values()).Count).toBe(4);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Enabled:/ }).click();
  await page.getByRole('option', { name: 'True', exact: true }).click();
  expect((await values()).Enabled).toBe(true);
  await page.getByRole('button', { name: /^Enabled:/ }).click();
  await page.getByRole('option', { name: 'Null', exact: true }).click();
  expect((await values()).Enabled).toBeNull();
  await page.getByRole('button', { name: /^Interval:/ }).click();
  await page.getByRole('option', { name: 'Month', exact: true }).click();
  expect((await values()).Interval).toBe('MONTHLY');
  await page.getByRole('button', { name: /^Duration:/ }).click();
  await page
    .getByRole('option', { name: 'Previous month', exact: true })
    .click();
  expect((await values()).Duration).toEqual({ amount: 1, unit: 'MONTH' });
  const date = page.getByLabel('Date', { exact: true });
  await expect(date).toHaveValue('2026-10-01');
  await date.fill('2026-10-02');
  expect((await values()).Date).toBe('2026-10-02T00:00:00.000Z');
  await date.fill('');
  await expect(page.getByRole('alert')).toHaveText('Choose a date.');
  expect((await values()).Date).toBe('2026-10-02T00:00:00.000Z');
  await date.fill('2026-10-03');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await values()).Date).toBe('2026-10-03T00:00:00.000Z');

  const from = page.getByLabel('Period from', { exact: true });
  const to = page.getByLabel('Period to', { exact: true });
  await expect(from).toHaveValue('2026-09-01');
  await expect(to).toHaveValue('');
  await to.fill('2026-09-30');
  expect((await values()).Period).toEqual({
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T23:59:59.999Z',
  });
  await from.fill('2026-10-01');
  await expect(page.getByRole('alert')).toHaveText(
    'End date must be on or after start date.'
  );
  expect((await values()).Period.from).toBe('2026-09-01T00:00:00.000Z');
  await to.fill('2026-10-02');
  expect((await values()).Period).toEqual({
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-02T23:59:59.999Z',
  });
  await from.fill('');
  expect((await values()).Period.from).toBeNull();
  await to.fill('');
  expect((await values()).Period).toEqual({ from: null, to: null });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`variables-${theme}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
