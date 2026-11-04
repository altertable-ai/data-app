import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('datetime input preserves relative selections through queries, URLs, history and dismissal', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  const output = page.getByRole('status', { name: 'Applied period' });
  await expect.poll(() => input.inputValue()).toBe('Past 7 days');
  await input.click();
  expect(await input.inputValue()).toMatch(/\d{4}/);
  await input.fill('2w');
  await expect.poll(() => output.textContent()).toContain('"amount":-7');
  await input.press('Enter');
  await expect.poll(() => output.textContent()).toContain('"unit":"WEEK"');
  expect(new URL(page.url()).searchParams.get('period')).toContain(
    'RELATIVE_ANCHOR_NOW'
  );
  await page.reload();
  await expect.poll(() => output.textContent()).toContain('"amount":-2');
  await input.click();
  await input.fill('not a date');
  await input.press('Escape');
  await expect.poll(() => output.textContent()).toContain('"unit":"WEEK"');
  await page.goBack();
  await expect.poll(() => output.textContent()).toContain('"amount":-7');
});

test('preset keyboard navigation retains input focus, and syntax errors recover through examples', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  await input.focus();
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  expect(
    await input.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await input.press('Enter');
  await expect.poll(() => input.inputValue()).toBe('Past 4 hours');
  await input.click();
  await input.fill('not a date');
  await input.press('Enter');
  expect(await input.inputValue()).toBe('not a date');
  expect(await input.getAttribute('aria-invalid')).toBe('true');
  await page
    .getByRole('complementary', { name: 'Date range syntax help' })
    .getByRole('button', { name: '45m', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied period' }).textContent()
    )
    .toContain('"amount":-45');
  await input.click();
  await input.press('End');
  expect(
    await page
      .getByRole('complementary', { name: 'Date range syntax help' })
      .isVisible()
  ).toBe(true);
  await input.press('Escape');
});

test('typed mixed and relative bounds keep UTC wall-clock fields and symbolic anchors', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  const output = page.getByRole('status', { name: 'Applied period' });
  await input.click();
  await input.fill('since July 1 2026 4pm');
  await input.press('Enter');
  await expect
    .poll(() => output.textContent())
    .toContain('2026-07-01T16:00:00.000Z');
  expect(await output.textContent()).toContain('"to":null');
  await input.click();
  await input.fill('Start of month − 1mo to Start of today');
  await input.press('Enter');
  await expect
    .poll(() => output.textContent())
    .toContain('RELATIVE_ANCHOR_START_OF_TODAY');
  expect(await output.textContent()).toContain(
    'RELATIVE_ANCHOR_START_OF_MONTH'
  );
  expect(await output.textContent()).toContain('"amount":-1,"unit":"MONTH"');
});

test('calendar starts from applied dates, requires a complete selection, and Escape returns to presets', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  const output = page.getByRole('status', { name: 'Applied period' });
  await input.click();
  await input.fill('Jul 1 - Jul 2 2026');
  await input.press('Enter');
  await input.click();
  await input.fill('Jan 2025');
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  const calendar = page.getByRole('dialog', { name: 'Date range calendar' });
  await expect
    .poll(() =>
      calendar
        .getByRole('grid')
        .evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  await calendar.getByRole('button', { name: /July 5, 2026/ }).click();
  expect(
    await calendar
      .getByRole('button', { name: 'Apply', exact: true })
      .isDisabled()
  ).toBe(true);
  await calendar.getByRole('button', { name: /July 7, 2026/ }).click();
  await calendar.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect
    .poll(() => output.textContent())
    .toContain('2026-07-05T00:00:00.000Z');
  expect(await output.textContent()).toContain('2026-07-08T00:00:00.000Z');
  await input.click();
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  await page.keyboard.press('Escape');
  expect(
    await page.getByRole('listbox', { name: 'Date range presets' }).isVisible()
  ).toBe(true);
  expect(
    await input.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await input.press('Escape');
  expect(await input.getAttribute('aria-expanded')).toBe('false');
});

test('formatted date segments support arrow selection and rapid edits before Enter', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  await input.click();
  await input.fill('Jul 1 2026 4pm to Jul 2 2026 4pm');
  await input.press('Enter');
  await input.click();
  await input.press('ArrowLeft');
  await input.press('ArrowRight');
  await input.press('ArrowRight');
  await input.press('ArrowRight');
  await input.press('ArrowRight');
  await input.press('ArrowUp');
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied period' }).textContent()
    )
    .toContain('2026-07-01T18:00:00.000Z');
});

test('live mode, limits, empty values, and outside focus remain controlled', async ({
  page,
}) => {
  await page.goto('/datetime?controls');
  const input = page.getByRole('combobox', { name: 'Custom period' });
  const output = page.getByRole('status', { name: 'Custom selection' });
  await input.click();
  expect(
    await page.getByRole('option', { name: 'Past 7 days', exact: true }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'Live', exact: true }).click();
  await expect.poll(() => output.textContent()).toContain('"live":true');
  await input.click();
  await page
    .getByRole('option', { name: 'Past 24 hours', exact: true })
    .click();
  await expect.poll(() => output.textContent()).toContain('"live":false');
  await input.click();
  await input.fill('2w');
  await input.press('Enter');
  expect(await page.getByRole('alert').textContent()).toContain(
    'at most 3 days'
  );
  await input.press('Escape');
  await input.click();
  const clear = page.getByRole('button', {
    name: 'Clear selection',
    exact: true,
  });
  await clear.click();
  expect(
    await clear.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await expect.poll(() => output.textContent()).toContain('"value":null');
  expect(await input.getAttribute('aria-expanded')).toBe('false');
});

for (const theme of ['light', 'dark'] as const) {
  test(`datetime menus fit narrow ${theme} screens and recover focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/datetime');
    if (theme === 'dark')
      await page
        .getByRole('button', { name: 'Switch to dark theme', exact: true })
        .click();
    const input = page.getByRole('combobox', {
      name: 'Date range',
      exact: true,
    });
    await input.click();
    await page.getByRole('option', { name: 'More', exact: true }).click();
    const help = page.getByRole('complementary', {
      name: 'Date range syntax help',
    });
    await help.scrollIntoViewIfNeeded();
    const helpBox = await help.boundingBox();
    expect(helpBox!.x).toBeGreaterThanOrEqual(0);
    expect(helpBox!.x + helpBox!.width).toBeLessThanOrEqual(320);
    await page.getByRole('option', { name: 'Select from calendar…' }).click();
    const calendar = page.getByRole('dialog', { name: 'Date range calendar' });
    const box = await calendar.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    await expect
      .poll(() => input.evaluate(element => element === document.activeElement))
      .toBe(true);
    await input.press('Escape');
  });
}

test('applying the initial calendar selection commits absolute days and Tab dismisses text drafts', async ({
  page,
}) => {
  await page.goto('/datetime?controls');
  const input = page.getByRole('combobox', { name: 'Custom period' });
  const output = page.getByRole('status', { name: 'Custom selection' });
  await input.click();
  await page
    .getByRole('option', { name: 'Past 24 hours', exact: true })
    .click();
  await input.click();
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect
    .poll(() => output.textContent())
    .not.toContain('RELATIVE_ANCHOR');
  expect(await output.textContent()).toContain('T00:00:00.000Z');
  const applied = await output.textContent();
  await input.click();
  await input.fill('2h');
  await input.press('Tab');
  expect(await input.getAttribute('aria-expanded')).toBe('false');
  expect(await output.textContent()).toBe(applied);
  expect(
    await page
      .getByRole('button', { name: 'Clear selection', exact: true })
      .evaluate(element => element === document.activeElement)
  ).toBe(true);
});

test('rebased mixed ranges can be applied, reopened, and restored before their UTC preview start', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-07-02T14:30:00.000Z'));
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  const output = page.getByRole('status', { name: 'Applied period' });
  await input.click();
  await input.fill('since July 2 2026 4pm');
  await input.press('Enter');
  await expect
    .poll(() => output.textContent())
    .toContain('2026-07-02T16:00:00.000Z');
  await input.click();
  expect(await input.getAttribute('aria-expanded')).toBe('true');
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  expect(
    await page.getByRole('dialog', { name: 'Date range calendar' }).isVisible()
  ).toBe(true);
  await page.keyboard.press('Escape');
  await input.press('Escape');
  await page.reload();
  await expect
    .poll(() => output.textContent())
    .toContain('2026-07-02T16:00:00.000Z');
});

test('configured presets flow through generated filters, labels, query values and reloads', async ({
  page,
}) => {
  await page.goto('/datetime?presets=analytics');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  await input.click();
  expect(
    await page.getByRole('option', { name: 'Past 15 minutes' }).count()
  ).toBe(0);
  await page.getByRole('option', { name: 'Year to date' }).click();
  await expect.poll(() => input.inputValue()).toBe('Year to date');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied period' }).textContent()
    )
    .toContain('RELATIVE_ANCHOR_START_OF_YEAR');
  await input.click();
  await page.getByRole('option', { name: 'Launch window' }).click();
  await expect.poll(() => input.inputValue()).toBe('Launch window');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied period' }).textContent()
    )
    .toContain('2026-01-03T00:00:00.000Z');
  await page.reload();
  await expect.poll(() => input.inputValue()).toBe('Launch window');
});

test('standalone menus support monitoring and empty presets without losing text or calendar entry', async ({
  page,
}) => {
  await page.goto('/datetime?controls&presets=monitoring');
  const input = page.getByRole('combobox', {
    name: 'Custom period',
    exact: true,
  });
  await input.click();
  await page.getByRole('option', { name: 'Past 5 minutes' }).click();
  await expect.poll(() => input.inputValue()).toBe('Past 5 minutes');
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Custom selection' }).textContent()
    )
    .toContain('"amount":-5');
  await page.goto('/datetime?presets=empty');
  const generated = page.getByRole('combobox', {
    name: 'Date range',
    exact: true,
  });
  await generated.click();
  expect(await page.getByRole('option').count()).toBe(2);
  expect(
    await page
      .getByRole('option', { name: 'Select from calendar…' })
      .isVisible()
  ).toBe(true);
  await generated.fill('2w');
  await generated.press('Enter');
  await expect.poll(() => generated.inputValue()).toBe('Past 2 weeks');
});

test('modified arrows preserve native text selection without editing date segments', async ({
  page,
}) => {
  await page.goto('/datetime');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  await input.click();
  await input.fill('Jul 1 2026 4pm to Jul 2 2026 4pm');
  await input.press('Enter');
  await input.click();
  const draft = await input.inputValue();
  const box = (await input.boundingBox())!;
  function selection() {
    return input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]);
  }
  // Pointer placement before the first character puts the caret at the start.
  await input.click({ position: { x: 1, y: box.height / 2 } });
  expect(await selection()).toEqual([0, 0]);
  await input.press('Shift+ArrowRight');
  expect(await selection()).toEqual([0, 1]);
  for (const modifier of ['Shift', 'Control', 'Alt', 'Meta']) {
    // Shrink the selection back to its start anchor, then select three characters.
    for (let step = 0; step < 50 && (await selection())[1]! > 0; step++)
      await input.press('Shift+ArrowLeft');
    for (let step = 0; step < 3; step++) await input.press('Shift+ArrowRight');
    expect(await selection()).toEqual([0, 3]);
    await input.press(`${modifier}+ArrowUp`);
    expect(await input.inputValue()).toBe(draft);
  }
});

test('shared reporting policy governs generated datetime presets, calendar, text and URLs', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-07-02T12:00:00Z'));
  await page.goto('/datetime?policy');
  const input = page.getByRole('combobox', { name: 'Date range', exact: true });
  await input.click();
  expect(
    await page.getByRole('option', { name: 'Today', exact: true }).count()
  ).toBe(0);
  expect(
    await page.getByRole('option', { name: 'Yesterday', exact: true }).count()
  ).toBe(1);
  await input.fill('today');
  await input.press('Enter');
  expect(await input.getAttribute('aria-invalid')).toBe('true');
  await input.press('Escape');
  await input.click();
  await page.getByRole('option', { name: 'Yesterday', exact: true }).click();
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Applied period' }).textContent()
    )
    .toContain('RELATIVE_ANCHOR_START_OF_YESTERDAY');
  await input.click();
  await page.getByRole('option', { name: 'Select from calendar…' }).click();
  expect(
    await page.getByRole('dialog', { name: 'Date range calendar' }).isVisible()
  ).toBe(true);
  expect(
    await page.getByRole('button', { name: /July 2, 2026/ }).isEnabled()
  ).toBe(false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect.poll(() => input.inputValue()).toBe('Yesterday');
});
