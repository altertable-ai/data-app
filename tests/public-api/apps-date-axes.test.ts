import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('time axes adapt date and time labels, retain context, and leave categories intact', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/date-axes');
  function axis(name: string) {
    return page.getByRole('application', { name, exact: true });
  }
  await expect
    .poll(() => axis('A year · monthly points').textContent())
    .toContain('2026');
  expect(await axis('A year · monthly points').textContent()).toMatch(
    /Jan|Apr|Jul|Oct/
  );
  expect(await axis('A year · monthly points').textContent()).not.toMatch(
    /\d{4}-\d{2}/
  );
  expect(await axis('Six weeks · daily points').textContent()).toContain(
    '2025'
  );
  expect(await axis('Six weeks · daily points').textContent()).toContain(
    '2026'
  );
  expect(await axis('Two days · hourly points').textContent()).toMatch(
    /\d{2}:00/
  );
  expect(await axis('Two days · hourly points').textContent()).toContain('Oct');
  expect(await axis('Two days · hourly points').textContent()).not.toContain(
    '2026'
  );
  expect(await axis('90 minutes · minute points').textContent()).not.toMatch(
    /Oct|2026/
  );
  expect(await axis('90 minutes · minute points').textContent()).toMatch(
    /\d{2}:\d{2}/
  );
  expect(await axis('Plan tiers · categorical axis').textContent()).toContain(
    'Free'
  );
  expect(await axis('Plan tiers · categorical axis').textContent()).toContain(
    'Custom'
  );
  const plot = page.getByRole('application', {
    name: '90 minutes · minute points',
    exact: true,
  });
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  const tooltip = page.getByRole('tooltip');
  await expect.poll(() => tooltip.textContent()).toContain('Oct 14, 2026');
  expect(await tooltip.textContent()).not.toContain('UTC');
  expect(await tooltip.textContent()).not.toContain('000Z');
  expect(errors).toEqual([]);
});

test('time ticks fit narrow cards and stay readable in both themes', async ({
  page,
}) => {
  await page.goto('/date-axes');
  for (const width of [1280, 640, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const plot of await page.getByRole('application').all()) {
      await expect
        .poll(async () => {
          // Match displayed category/date text, excluding numeric Y-axis readings.
          const labels = await plot.getByText(/\D|^\d{4}$/).all();
          const boxes = await Promise.all(
            labels.map(label => label.boundingBox())
          );
          return (
            boxes.length > 0 &&
            boxes.every(
              (box, index) =>
                box &&
                boxes
                  .slice(index + 1)
                  .every(
                    other =>
                      other &&
                      (box.y + box.height <= other.y ||
                        other.y + other.height <= box.y ||
                        box.x + box.width + 3 <= other.x ||
                        other.x + other.width + 3 <= box.x)
                  )
            )
          );
        })
        .toBe(true);
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
      )
      .toBe(true);
  }
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  expect(await page.getByRole('application').count()).toBe(5);
});

test('time axes preserve irregular spacing, fine precision, numeric opt-in and category overrides', async ({
  page,
}) => {
  await page.goto('/date-axes?edge-cases');
  const yearly = page.getByRole('application', {
    name: 'Twelve years · annual points',
    exact: true,
  });
  await expect.poll(() => yearly.textContent()).toMatch(/20\d{2}/);
  expect(await yearly.textContent()).not.toMatch(/Jan|Feb|Mar/);
  const uneven = page.getByRole('application', {
    name: 'Uneven observations · leap year',
    exact: true,
  });
  expect(await uneven.textContent()).not.toContain('2024');
  expect(await uneven.textContent()).toMatch(/Feb|Mar|Apr/);
  await uneven.scrollIntoViewIfNeeded();
  const first = await uneven.getByText('Feb 27', { exact: true }).boundingBox();
  const last = await uneven.getByText('Apr 1', { exact: true }).boundingBox();
  const bounds = await uneven.boundingBox();
  const left = first!.x;
  const right = last!.x + last!.width;
  // Three daily gaps precede a month-long gap: quarter/late plot positions inspect
  // Mar 1 / Apr 1, rather than the Feb 28 / Mar 1 readings of equal category spacing.
  for (const [fraction, date] of [
    [0.25, 'Mar 1, 2024'],
    [0.8, 'Apr 1, 2024'],
  ] as const) {
    await page.mouse.move(
      left + (right - left) * fraction,
      bounds!.y + bounds!.height / 2
    );
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain(date);
  }
  await page.mouse.move(0, 0);
  const fine = page.getByRole('application', {
    name: 'One second · milliseconds',
    exact: true,
  });
  await fine.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toMatch(/09:30:00\.\d{3}/);
  expect(await page.getByRole('tooltip').textContent()).not.toContain('UTC');
  expect(
    await page
      .getByRole('application', {
        name: 'Epoch milliseconds · explicit UTC',
        exact: true,
      })

      .textContent()
  ).toContain(':00');
  expect(
    await page
      .getByRole('application', {
        name: 'Date-like categories · explicit category',
        exact: true,
      })

      .textContent()
  ).toContain('2024-01-01');
});

test('temporal input preserves single and repeated instants and falls back for mixed categories', async ({
  page,
}) => {
  await page.goto('/date-axes?edge-cases');
  for (const [name, date] of [
    ['One observed date', 'Feb 29, 2024'],
    ['Repeated instants', '09:30:00.125'],
    ['Date observations', 'Mar 1, 2024'],
  ] as const) {
    const plot = page.getByRole('application', { name, exact: true });
    await plot.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain(date);
  }
  const categories = page.getByRole('application', {
    name: 'Mixed date and category',
    exact: true,
  });
  expect(await categories.textContent()).toContain('2024-02-29');
  expect(await categories.textContent()).toContain('Unknown');
});

test('authored category accessors and UTC tick overrides retain their public contracts', async ({
  page,
}) => {
  await page.goto('/date-axes?edge-cases');
  const categories = page.getByRole('application', {
    name: 'Authored category accessor',
    exact: true,
  });
  await expect
    .poll(() => categories.textContent())
    .toContain('[Tier: Starter]');
  expect(await categories.textContent()).toContain('[Tier: Team]');
  const formatted = page.getByRole('application', {
    name: 'UTC ticks with authored formatter',
    exact: true,
  });
  await expect.poll(() => formatted.textContent()).toContain('Hour 0');
  expect(await formatted.textContent()).toContain('Hour 12');
  await formatted.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toContain('Oct 14, 2026');
  const explicit = page.getByRole('application', {
    name: 'UTC ticks with authored positions',
    exact: true,
  });
  expect(await explicit.textContent()).toContain('Oct 14, 2026, 06:00');
});
