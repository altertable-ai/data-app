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
    await expect
      .poll(async () =>
        page.getByRole('application').evaluateAll(axes =>
          axes.every(axis => {
            const labels = [
              ...axis.querySelectorAll(
                'text:not([orientation]) tspan, text[orientation="bottom"] tspan'
              ),
            ]
              .map(label => label.getBoundingClientRect())
              .sort((a, b) => a.x - b.x);
            return (
              labels.length > 0 &&
              labels.every((label, index) =>
                labels
                  .slice(index + 1)
                  .every(
                    other =>
                      label.bottom <= other.top ||
                      other.bottom <= label.top ||
                      label.right + 3 <= other.left ||
                      other.right + 3 <= label.left
                  )
              )
            );
          })
        )
      )
      .toBe(true);
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
  const positions = await uneven
    .locator('.recharts-line-curve')
    .first()
    .evaluate(element =>
      [...element.getAttribute('d')!.matchAll(/[ML]([\d.-]+),/g)].map(match =>
        Number(match[1])
      )
    );
  expect(positions).toHaveLength(5);
  expect(
    (positions[4]! - positions[3]!) / (positions[1]! - positions[0]!)
  ).toBeCloseTo(31, 1);
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
