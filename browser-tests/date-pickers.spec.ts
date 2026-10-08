import { expect, test } from '@playwright/test';

test('date pickers validate fields and keep open ranges', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/date-pickers');
  async function values() {
    return JSON.parse((await page.getByTestId('values').textContent())!);
  }
  const date = page
    .locator('input[type=date]')
    .and(page.getByLabel('Date', { exact: true }));
  await expect(date).toHaveValue('2026-10-01');
  await date.fill('2026-10-02');
  expect((await values()).Date).toBe('2026-10-02');
  await date.fill('');
  await expect(page.getByRole('alert')).toHaveText('Choose a date.');
  expect((await values()).Date).toBe('2026-10-02');
  await date.fill('2026-10-03');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await values()).Date).toBe('2026-10-03');

  const from = page.getByLabel('Period from', { exact: true });
  const to = page.getByLabel('Period to', { exact: true });
  await expect(from).toHaveValue('2026-09-01');
  await expect(to).toHaveValue('');
  await to.fill('2026-09-30');
  expect((await values()).Period).toEqual({
    start: '2026-09-01',
    end: '2026-09-30',
  });
  await from.fill('2026-10-01');
  await expect(page.getByRole('alert')).toHaveText(
    'End date must be on or after start date.'
  );
  expect((await values()).Period.start).toBe('2026-09-01');
  await to.fill('2026-10-02');
  expect((await values()).Period).toEqual({
    start: '2026-10-01',
    end: '2026-10-02',
  });
  await from.fill('');
  expect((await values()).Period.start).toBeNull();
  await to.fill('');
  expect((await values()).Period).toEqual({ start: null, end: null });
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
      path: test.info().outputPath(`date-pickers-${theme}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test('single and range controls share calendar navigation and range presets', async ({
  page,
}) => {
  await page.goto('/date-pickers');
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
  expect((await values()).Date).toBe('2027-12-12');

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
  expect(
    new Date(period.end).getTime() - new Date(period.start).getTime()
  ).toBe(6 * 86400000);
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
  expect(selected.start).toMatch(/-10$/);
  expect(selected.end).toMatch(/-15$/);
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
