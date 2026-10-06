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
  const date = page
    .locator('input[type=date]')
    .and(page.getByLabel('Date', { exact: true }));
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

test('single and range controls share calendar navigation and range presets', async ({
  page,
}) => {
  await page.goto('/query-variables');
  async function values() {
    return JSON.parse((await page.getByTestId('values').textContent())!);
  }
  await page.getByRole('button', { name: /^Choose date\b/ }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Quick ranges')).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Previous month' })
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Next month' }).click();
  await dialog
    .locator('.altertable-calendar-select')
    .last()
    .getByRole('button')
    .click();
  await page.getByRole('option', { name: '2027', exact: true }).click();
  await dialog
    .locator('.altertable-calendar-select')
    .first()
    .getByRole('button')
    .click();
  await page.getByRole('option', { name: 'Dec', exact: true }).click();
  await dialog
    .locator('.react-aria-CalendarCell')
    .filter({ hasText: /^12$/ })
    .click();
  await expect(dialog).toHaveCount(0);
  expect((await values()).Date).toBe('2027-12-12T00:00:00.000Z');

  await page.getByRole('button', { name: /^Choose dates\b/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Quick ranges')).toBeVisible();
  await expect(
    page.locator('.altertable-date-range-popover')
  ).not.toHaveAttribute('data-entering');
  await page.screenshot({
    path: test.info().outputPath('range-calendar.png'),
    fullPage: true,
  });
  await dialog
    .getByRole('button', { name: 'Last 7 days', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const period = (await values()).Period;
  expect(new Date(period.to).getTime() - new Date(period.from).getTime()).toBe(
    7 * 86400000 - 1
  );
  await page.getByRole('button', { name: /^Choose dates\b/ }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .locator('.react-aria-RangeCalendar')
    .getByRole('button', { name: 'Previous month', exact: true })
    .click();
  await dialog
    .locator('.react-aria-CalendarCell')
    .filter({ hasText: /^10$/ })
    .click();
  await dialog
    .locator('.react-aria-CalendarCell')
    .filter({ hasText: /^15$/ })
    .click();
  await expect(dialog).toHaveCount(0);
  const selected = (await values()).Period;
  expect(selected.from).toMatch(/-10T00:00:00.000Z$/);
  expect(selected.to).toMatch(/-15T23:59:59.999Z$/);
});

test('existing range picker retains bounds and comparison controls', async ({
  page,
}) => {
  await page.goto('/gallery?view=filters');
  const picker = page
    .locator('.altertable-date-range')
    .filter({ has: page.getByLabel('Gallery dates from', { exact: true }) });
  await expect(
    page.getByLabel('Disabled dates from', { exact: true })
  ).toBeDisabled();
  await page
    .getByLabel('Gallery dates from', { exact: true })
    .fill('2026-08-01');
  await expect(picker.getByRole('alert')).toHaveText(
    'Choose dates within the available range.'
  );
  await page
    .getByLabel('Gallery dates from', { exact: true })
    .fill('2026-09-01');
  await picker.getByRole('button', { name: /^Choose dates\b/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Next month' })
  ).toBeDisabled();
  await dialog
    .getByRole('checkbox', { name: 'Compare with previous period' })
    .check();
  await expect(picker.getByText('vs prior')).toBeVisible();
  await expect(dialog.locator('.altertable-calendar-select')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await picker
    .getByRole('button', { name: 'Reset date range', exact: true })
    .click();
  await expect(
    page.getByLabel('Gallery dates from', { exact: true })
  ).toHaveValue('2026-09-24');
});
