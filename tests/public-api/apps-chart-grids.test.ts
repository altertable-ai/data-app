import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('Cartesian charts default to themed horizontal grids and allow opt-out without changing inspection', async ({
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
      expect(await chart.locator('.recharts-cartesian-grid').count()).toBe(1);
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

test('bar charts can show a formatted value axis without moving category actions', async ({
  page,
}) => {
  await page.goto('/chart-grids');
  const chart = page.getByRole('region', {
    name: 'Currency bar',
    exact: true,
  });

  for (const label of ['$0', '$2k', '$4k', '$6k', '$8k']) {
    await expect
      .poll(() => chart.getByText(label, { exact: true }).isVisible())
      .toBe(true);
  }

  const labels = chart.locator('.altertable-chart-item-label-row');
  await expect.poll(() => labels.nth(0).textContent()).toBe('Compute');
  await expect.poll(() => labels.nth(1).textContent()).toBe('Storage');
  await expect.poll(() => labels.nth(2).textContent()).toBe('Logging');
  expect(await labels.allTextContents()).not.toContain('$7,200.00');

  await chart
    .getByRole('button', {
      name: 'Storage: $4,800.00 USD. Inspect',
      exact: true,
    })
    .hover();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toContain('$4,800.00 USD');
  await chart
    .getByRole('button', {
      name: 'Storage: $4,800.00 USD. Inspect',
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Selected service' }).textContent()
    )
    .toBe('Storage');
  await expect
    .poll(() =>
      chart
        .getByRole('button', {
          name: 'Logging: $0.00 USD. Inspect',
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
});

test('bar value axes also format counts and fractional ratios', async ({
  page,
}) => {
  await page.goto('/chart-grids');
  const counts = page.getByRole('region', {
    name: 'Count value axis',
    exact: true,
  });
  await expect
    .poll(() => counts.getByText('100', { exact: true }).isVisible())
    .toBe(true);
  const ratios = page.getByRole('region', {
    name: 'Ratio value axis',
    exact: true,
  });
  await expect
    .poll(() => ratios.getByText('100%', { exact: true }).isVisible())
    .toBe(true);
  await ratios
    .getByRole('button', { name: 'Sample 1: 50% conversion', exact: true })
    .hover();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toContain('50% conversion');
});

test('ranked bar charts keep readable phone labels and start with the leading category', async ({
  mobilePage: page,
}) => {
  await page.goto('/chart-grids');
  const chart = page.getByRole('region', { name: 'Currency bar', exact: true });
  const leading = chart.getByRole('button', {
    name: 'Compute: $7,200.00 USD. Inspect',
    exact: true,
  });
  await expect
    .poll(async () => {
      const plot = await chart.boundingBox();
      const button = await leading.boundingBox();
      return (
        !!plot &&
        !!button &&
        button.x >= plot.x &&
        button.x + button.width <= plot.x + plot.width
      );
    })
    .toBe(true);
  for (const name of ['Compute', 'Storage', 'Logging']) {
    await expect
      .poll(() =>
        chart
          .getByText(name, { exact: true })
          .evaluate(element => element.scrollWidth <= element.clientWidth)
      )
      .toBe(true);
  }
  await chart
    .getByRole('button', { name: 'Logging: $0.00 USD. Inspect', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('status', { name: 'Selected service' }).textContent()
    )
    .toBe('Logging');
});
