import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('automatic legend previews, focuses, and adds series', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Response time across twelve services',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend' });
  const api = legend.getByRole('button', { name: 'API', exact: true });
  const analytics = legend.getByRole('button', {
    name: 'Analytics',
    exact: true,
  });
  const curves = chart.locator('.recharts-line-curve');
  await expect.poll(() => curves.count()).toBe(12);
  expect(await chart.getByRole('button', { name: 'Show all' }).count()).toBe(0);
  const chartHeight = (await chart.boundingBox())!.height;
  await api.hover();
  await expect
    .poll(() =>
      legend.getByRole('listitem').nth(1).getAttribute('data-legend-muted')
    )
    .toBe('true');
  await expect
    .poll(() =>
      curves.evaluateAll(
        paths =>
          paths.filter(
            path =>
              path.getAttribute('opacity') === '0.2' ||
              path.closest('.recharts-line')?.getAttribute('opacity') === '0.2'
          ).length
      )
    )
    .toBe(11);
  await api.click();
  expect((await chart.boundingBox())!.height).toBe(chartHeight);
  await expect
    .poll(async () => legend.locator('[data-legend-excluded]').count())
    .toBe((await legend.locator('button[aria-pressed]').count()) - 1);
  await expect
    .poll(() =>
      curves.evaluateAll(
        paths =>
          paths.filter(
            path =>
              path.getAttribute('opacity') === '0' ||
              path.closest('.recharts-line')?.getAttribute('opacity') === '0'
          ).length
      )
    )
    .toBe(11);
  await expect.poll(() => api.getAttribute('aria-pressed')).toBe('true');
  await analytics.hover();
  await expect
    .poll(() => legend.locator('[data-legend-muted]').count())
    .toBe(0);
  await expect
    .poll(() =>
      curves.evaluateAll(
        paths =>
          paths.filter(
            path =>
              path.getAttribute('opacity') === '0.2' ||
              path.closest('.recharts-line')?.getAttribute('opacity') === '0.2'
          ).length
      )
    )
    .toBe(0);
  await analytics.click();
  await expect
    .poll(async () => legend.locator('[data-legend-excluded]').count())
    .toBe((await legend.locator('button[aria-pressed]').count()) - 2);
  await expect
    .poll(() =>
      curves.evaluateAll(
        paths =>
          paths.filter(
            path =>
              path.getAttribute('opacity') === '0' ||
              path.closest('.recharts-line')?.getAttribute('opacity') === '0'
          ).length
      )
    )
    .toBe(10);
  await api.click();
  await analytics.click();
  expect((await chart.boundingBox())!.height).toBe(chartHeight);
  await expect.poll(() => curves.count()).toBe(12);
  await expect
    .poll(() => legend.locator('[data-legend-excluded]').count())
    .toBe(0);
});

test('focus removes dots from excluded line series', async ({ page }) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Series dot plot',
    exact: true,
  });
  const dots = chart.locator('.recharts-line-dots circle');
  await expect.poll(() => dots.count()).toBe(4);
  const alpha = chart.getByRole('button', { name: 'Alpha', exact: true });
  await alpha.click();
  await expect.poll(() => dots.count()).toBe(2);
  await alpha.click();
  await expect.poll(() => dots.count()).toBe(4);
});

test('first legend click does not activate a plot tooltip', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Response time across twelve services',
    exact: true,
  });
  const api = chart.getByRole('button', { name: 'API', exact: true });
  await api.click();
  await expect.poll(() => api.getAttribute('aria-pressed')).toBe('true');
  await expect.poll(() => chart.getByRole('tooltip').count()).toBe(0);
  await expect
    .poll(() => chart.locator('.recharts-active-dot').count())
    .toBe(0);
});

test('legend keyboard controls focus and restore series', async ({ page }) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Four series plot',
    exact: true,
  });
  const alpha = chart.getByRole('button', { name: 'Alpha', exact: true });
  await alpha.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => alpha.getAttribute('aria-pressed')).toBe('true');
  await expect
    .poll(() => chart.locator('[data-legend-excluded]').count())
    .toBe(3);
  await page.keyboard.press('Enter');
  await expect
    .poll(() => chart.locator('[data-legend-excluded]').count())
    .toBe(0);
});

test('automatic legend keeps long labels accessible without layout shift', async ({
  mobilePage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Long series labels plot',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend' });
  const label = legend.getByText(
    'Alpha — response time in production workspaces across Europe',
    { exact: true }
  );
  await expect.poll(() => label.isVisible()).toBe(true);
  expect(await label.getAttribute('title')).toBe(
    'Alpha — response time in production workspaces across Europe'
  );
  expect(
    await label.evaluate(element => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  const chartHeight = (await chart.boundingBox())!.height;
  const alpha = legend.getByRole('button', {
    name: 'Alpha — response time in production workspaces across Europe',
  });
  await alpha.click();
  await expect
    .poll(() => legend.locator('[data-legend-excluded]').count())
    .toBeGreaterThan(0);
  expect((await chart.boundingBox())!.height).toBe(chartHeight);
  await alpha.click();
  await expect
    .poll(() => legend.locator('[data-legend-excluded]').count())
    .toBe(0);
});

test('four series exit focus when all are re-enabled', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 968 });
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Four series plot',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend' });
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
  expect(await chart.getByRole('button', { name: 'Show all' }).count()).toBe(0);
  const height = (await chart.boundingBox())!.height;
  const alpha = legend.getByRole('button', { name: 'Alpha', exact: true });
  await alpha.click();
  await expect
    .poll(() => legend.locator('[data-legend-excluded]').count())
    .toBe(3);
  expect(await legend.getByRole('listitem').count()).toBe(4);
  expect((await chart.boundingBox())!.height).toBe(height);
  for (const name of ['Beta', 'Gamma', 'Delta']) {
    await legend.getByRole('button', { name, exact: true }).click();
  }
  await expect
    .poll(() => legend.locator('[data-legend-excluded]').count())
    .toBe(0);
  for (const name of ['Alpha', 'Beta', 'Gamma', 'Delta']) {
    await expect
      .poll(() =>
        legend
          .getByRole('button', { name, exact: true })
          .getAttribute('aria-pressed')
      )
      .toBe('false');
  }
  expect((await chart.boundingBox())!.height).toBe(height);
});

test('funnel and retention legends focus their plotted populations', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const [name, first, second] of [
    ['FunnelChart', 'Free plan', 'Paid plan'],
    ['RetentionChart', 'Sep 1', 'Sep 8'],
  ]) {
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    const firstButton = chart.getByRole('button', {
      name: first,
      exact: name === 'RetentionChart',
    });
    const secondButton = chart.getByRole('button', {
      name: second,
      exact: name === 'RetentionChart',
    });
    await firstButton.click();
    await expect
      .poll(() => firstButton.getAttribute('aria-pressed'))
      .toBe('true');
    await expect
      .poll(() => chart.locator('[data-legend-excluded]').count())
      .toBe(1);
    await secondButton.hover();
    await expect
      .poll(() => chart.locator('[data-legend-muted]').count())
      .toBe(0);
    await secondButton.click();
    await expect
      .poll(() => chart.locator('[data-legend-excluded]').count())
      .toBe(0);
    await expect
      .poll(() => firstButton.getAttribute('aria-pressed'))
      .toBe('false');
  }
});

test('native function-key series respond to the automatic legend', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Native accessor plot',
    exact: true,
  });
  const alpha = chart.getByRole('button', { name: 'Alpha', exact: true });
  await alpha.click();
  await expect.poll(() => alpha.getAttribute('aria-pressed')).toBe('true');
  await expect
    .poll(() =>
      chart
        .locator('.recharts-line-curve')
        .evaluateAll(
          paths =>
            paths.filter(
              path =>
                path.getAttribute('opacity') === '0' ||
                path.closest('.recharts-line')?.getAttribute('opacity') === '0'
            ).length
        )
    )
    .toBe(1);
  await alpha.click();
  await expect
    .poll(() => chart.locator('[data-legend-excluded]').count())
    .toBe(0);
});

test('crowded automatic legends reserve a cell for expansion and restore their compact list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Response time across twelve services',
    exact: true,
  });
  const legend = chart.getByRole('list', { name: 'Chart legend', exact: true });
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
  const more = legend.getByRole('button', { name: '+9 more', exact: true });
  await expect.poll(() => more.getAttribute('aria-expanded')).toBe('false');
  const lastSeries = await legend.getByRole('listitem').nth(2).boundingBox();
  const overflow = await legend.getByRole('listitem').nth(3).boundingBox();
  expect(Math.abs(lastSeries!.y - overflow!.y)).toBeLessThan(1);
  await more.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(13);
  await expect
    .poll(() => legend.getByText('Webhooks', { exact: true }).isVisible())
    .toBe(true);
  const fewer = legend.getByRole('button', { name: 'Show fewer', exact: true });
  await expect.poll(() => fewer.getAttribute('aria-expanded')).toBe('true');
  await fewer.click();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
});

test('independent legends preserve complete long names and expand on a phone', async ({
  mobilePage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/chart-legends');
  const legend = page.getByRole('list', {
    name: 'Regional services legend',
    exact: true,
  });
  const label = legend.getByText('API — production workspaces in Europe (ms)', {
    exact: true,
  });
  await expect.poll(() => label.isVisible()).toBe(true);
  expect(await label.getAttribute('title')).toBe(
    'API — production workspaces in Europe (ms)'
  );
  expect(
    await label.evaluate(element => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  await legend.getByRole('button', { name: '+9 more', exact: true }).tap();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(13);
  await expect
    .poll(() =>
      legend
        .getByText('Analytics — production workspaces in North America (ms)', {
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Switch to dark theme', exact: true })
    .tap();
  await legend.getByRole('button', { name: 'Show fewer', exact: true }).tap();
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(4);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true);
});

test('crowded legends fill two rows and keep overflow in the final column on resize', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const legend = page
    .getByRole('region', {
      name: 'Response time across twelve services',
      exact: true,
    })
    .getByRole('list', { name: 'Chart legend', exact: true });
  for (const width of [1440, 960, 480, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const cells = await legend.getByRole('listitem').evaluateAll(items =>
          items.map(item => {
            const box = item.getBoundingClientRect();
            return { y: box.y, right: box.right, text: item.textContent };
          })
        );
        const rows = new Set(cells.map(cell => Math.round(cell.y))).size;
        const firstRow = cells.filter(
          cell => Math.abs(cell.y - cells[0]!.y) < 1
        ).length;
        const right = Math.max(...cells.map(cell => cell.right));
        return (
          cells.length <= 8 &&
          cells.at(-1)!.text?.startsWith(`+${13 - cells.length} more`) &&
          rows === 2 &&
          cells.length === firstRow * 2 &&
          Math.abs(cells.at(-1)!.right - right) < 1
        );
      })
      .toBe(true);
  }
});

test('authored legends describe measures without controls and pie legends can be omitted', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const legend = page.getByRole('list', { name: 'Measures', exact: true });
  expect(await legend.getByRole('listitem').textContent()).toBe(
    'Response time (ms)'
  );
  expect(await legend.getByRole('button').count()).toBe(0);
  expect(await legend.getByRole('img').count()).toBe(0);
  const sparseRetention = page.getByRole('region', {
    name: 'Sparse retention basic example',
    exact: true,
  });
  expect(
    await sparseRetention
      .getByRole('list', { name: 'Sparse retention cohorts' })
      .getByRole('button')
      .count()
  ).toBe(0);
  const pie = page.getByRole('region', {
    name: 'Standalone pie basic example',
    exact: true,
  });
  const categories = pie.getByRole('list', {
    name: 'Standalone pie plot legend',
    exact: true,
  });
  expect(await categories.getByRole('listitem').count()).toBe(3);
  await pie
    .getByRole('button', { name: 'Hide pie legend', exact: true })
    .click();
  expect(await categories.count()).toBe(0);
  expect(
    await pie
      .getByRole('region', { name: 'Standalone pie plot', exact: true })
      .isVisible()
  ).toBe(true);
  await pie
    .getByRole('button', { name: 'Show pie legend', exact: true })
    .click();
  expect(await categories.getByRole('listitem').count()).toBe(3);
});

for (const kind of [
  'line',
  'area',
  'bar',
  'scatter',
  'native-key',
  'native-accessor',
  'native-shared',
]) {
  test(`${kind} legend preserves series state through sorting, renaming, and removal`, async ({
    page,
  }) => {
    await page.goto('/chart-legends');
    const example = page.getByRole('region', {
      name: `${kind} legend identity basic example`,
      exact: true,
    });
    const alpha = example.getByRole('textbox', {
      name: 'Alpha note',
      exact: true,
    });
    const beta = example.getByRole('textbox', {
      name: 'Beta note',
      exact: true,
    });
    await alpha.fill('Alpha reading');
    await beta.fill('Beta reading');
    await example
      .getByRole('button', { name: 'Reverse legend', exact: true })
      .click();
    await expect
      .poll(() =>
        example
          .getByRole('textbox')
          .evaluateAll(inputs =>
            inputs.map(input => input.getAttribute('aria-label'))
          )
      )
      .toEqual(['Beta note', 'Alpha note']);
    expect(await alpha.inputValue()).toBe('Alpha reading');
    expect(await beta.inputValue()).toBe('Beta reading');
    await example
      .getByRole('button', { name: 'Rename Alpha', exact: true })
      .click();
    await expect
      .poll(() =>
        example
          .getByRole('textbox', { name: 'First note', exact: true })
          .inputValue()
      )
      .toBe('Alpha reading');
    await example
      .getByRole('button', { name: 'Remove Alpha', exact: true })
      .click();
    await expect.poll(() => example.getByRole('textbox').count()).toBe(1);
    expect(await beta.inputValue()).toBe('Beta reading');
  });
}

test('legend controls stay separate from plot inspection', async ({ page }) => {
  await page.goto('/chart-legends');
  const example = page.getByRole('region', {
    name: 'line legend identity basic example',
    exact: true,
  });
  const plot = example.getByRole('application');
  const tooltip = example.getByRole('tooltip');
  await plot.focus();
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
  const note = example.getByRole('textbox', {
    name: 'Alpha note',
    exact: true,
  });
  await note.hover();
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
  await note.fill('Inspect both measures');
  expect(await note.inputValue()).toBe('Inspect both measures');
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
});
