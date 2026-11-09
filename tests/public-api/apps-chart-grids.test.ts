import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('Cartesian charts support themed horizontal grids without changing inspection', async ({
  page,
}) => {
  await page.goto('/chart-grids');
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    if (width === 375)
      await page.getByRole('button', { name: 'Dark theme' }).click();
    for (const name of [
      'Grid bar',
      'Grid line',
      'Grid area',
      'Grid composed',
      'Grid retention',
      'Grid funnel',
    ]) {
      const chart = page.getByRole('region', { name, exact: true });
      await expect
        .poll(() =>
          chart.locator('.recharts-cartesian-grid-horizontal line').count()
        )
        .toBeGreaterThan(1);
      expect(
        await chart.locator('.recharts-cartesian-grid-vertical line').count()
      ).toBe(0);
    }
    const authored = page.getByRole('region', {
      name: 'Authored grid',
      exact: true,
    });
    expect(await authored.locator('.recharts-cartesian-grid').count()).toBe(1);
    const scatter = page.getByRole('region', {
      name: 'Grid scatter',
      exact: true,
    });
    expect(
      await scatter
        .locator('.altertable-scatter-gridline')
        .first()
        .evaluate(el => getComputedStyle(el).borderTopWidth)
    ).toBe('1px');
    const bar = page.getByRole('region', { name: 'Grid bar', exact: true });
    await bar
      .getByRole('button', { name: 'Sample 1: 50 requests', exact: true })
      .hover();
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('50 requests');
    await page.getByRole('button', { name: 'Toggle grids' }).click();
    for (const name of [
      'Grid bar',
      'Grid line',
      'Grid area',
      'Grid composed',
      'Grid retention',
      'Grid funnel',
    ]) {
      const chart = page.getByRole('region', { name, exact: true });
      await expect
        .poll(() =>
          chart.locator('.recharts-cartesian-grid-horizontal line').count()
        )
        .toBe(0);
    }
    expect(
      await scatter
        .locator('.altertable-scatter-gridline')
        .first()
        .evaluate(el => getComputedStyle(el).borderTopWidth)
    ).toBe('0px');
    expect(
      await scatter.getByText('100', { exact: true }).count()
    ).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Toggle grids' }).click();
  }
});
