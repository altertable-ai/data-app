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
  const compare = page.getByRole('option', {
    name: 'Compare with previous period',
  });
  expect(await picker.getAttribute('aria-activedescendant')).toBe(
    await compare.getAttribute('id')
  );
  await expect
    .poll(async () => {
      const row = await compare.boundingBox();
      const menu = await page
        .locator('.altertable-datetime-popover')
        .boundingBox();
      return !!row && !!menu && row.y + row.height <= menu.y + menu.height;
    })
    .toBe(true);
  expect(await compare.getAttribute('aria-selected')).toBe('false');
  await picker.press('Enter');
  await expect
    .poll(() => output.textContent())
    .toContain('2026-06-26T16:00:00.000Z');
  expect(new URL(page.url()).searchParams.get('compare')).toBe('previous');
  await picker.click();
  expect(await compare.getAttribute('aria-selected')).toBe('true');
  expect(await compare.locator('.altertable-datetime-check svg').count()).toBe(
    1
  );
  await picker.press('Escape');
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

test('the final preset scrolls within the popover border when space is limited', async ({
  page,
}) => {
  await page.setViewportSize({ width: 936, height: 400 });
  await page.goto('/datetime-comparison');
  const picker = page.getByRole('combobox', {
    name: 'Date range',
    exact: true,
  });
  await picker.click();
  await picker.press('End');
  const geometry = await page
    .locator('.altertable-datetime-popover')
    .evaluate(popover => {
      const scroller = popover.firstElementChild!;
      const last = popover.querySelector<HTMLElement>(
        '.altertable-datetime-presets button:last-child'
      )!;
      return {
        popoverBottom: popover.getBoundingClientRect().bottom,
        scrollerBottom: scroller.getBoundingClientRect().bottom,
        lastBottom: last.getBoundingClientRect().bottom,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      };
    });
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  expect(geometry.scrollerBottom).toBeLessThan(geometry.popoverBottom);
  expect(geometry.lastBottom).toBeLessThanOrEqual(geometry.popoverBottom);
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
    .getByRole('option', { name: 'Compare with previous period' })
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
      .getByRole('option', { name: 'Compare with previous period' })
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
      .getByRole('option', { name: 'Compare with previous period' })
      .count()
  ).toBe(0);
  await page.getByRole('button', { name: 'Presets', exact: true }).click();
  expect(
    await page
      .getByRole('option', { name: 'Compare with previous period' })
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

for (const locale of ['en-US', 'fr-FR', 'en-GB']) {
  test(`datetime display and keyboard edits share the ${locale} app format`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-07-10T16:00:00Z'));
    await page.goto(`/datetime-comparison?locale=${locale}`);
    const picker = page.getByRole('combobox', {
      name: 'Date range',
      exact: true,
    });
    await picker.click();
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone: 'UTC',
    });
    function label(from: string, to: string) {
      return `${formatter.format(new Date(from))} – ${formatter.format(new Date(to))}`;
    }
    expect(await picker.inputValue()).toBe(
      label('2026-07-03T16:00:00Z', '2026-07-10T16:00:00Z')
    );
    expect(
      await page
        .getByRole('option', { name: 'Compare with previous period' })
        .textContent()
    ).toContain(label('2026-06-26T16:00:00Z', '2026-07-03T16:00:00Z'));
    // Move across the localized date segments to the first hour and edit it
    // without a format change.
    await picker.press('ArrowLeft');
    for (let step = 0; step < 4; step++) await picker.press('ArrowRight');
    expect(
      await picker.evaluate((element: HTMLInputElement) =>
        element.value.slice(element.selectionStart!, element.selectionEnd!)
      )
    ).toBe('16');
    await picker.press('ArrowUp');
    await picker.press('Enter');
    await expect
      .poll(() =>
        page.getByRole('status', { name: 'Applied comparison' }).textContent()
      )
      .toContain('2026-07-03T17:00:00.000Z');
    await picker.click();
    await page
      .getByRole('option', { name: 'Past 24 hours', exact: true })
      .click();
    await expect
      .poll(() =>
        page.getByRole('status', { name: 'Applied comparison' }).textContent()
      )
      .toContain('2026-07-09T16:00:00.000Z');
  });
}
