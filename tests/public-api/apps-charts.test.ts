import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';
import { readChartImage } from '@/tests/public-api/chart-image';

test('weekly date bars stay clear of Y labels and inside both plot edges', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const plot = page.getByRole('application', {
    name: 'Weekly cohort bar plot',
    exact: true,
  });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(async () => {
          const label = await plot
            .getByText('3.2k', { exact: true })
            .boundingBox();
          const bounds = await plot.boundingBox();
          const image = await readChartImage(plot);
          const columns = image.pixels.flatMap((color, index) =>
            color === 0x8040c0 || color === 0x208040
              ? [index % image.width]
              : []
          );
          if (!label || !bounds || !columns.length) return false;
          const scale = image.width / bounds.width;
          return (
            Math.min(...columns) / scale >
              label.x + label.width - bounds.x + 2 &&
            Math.max(...columns) < image.width - 2
          );
        })
        .toBe(true);
    }
  }
});

test('shared currency semantics produce compact ticks and precise keyboard readings', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Automatic currency plot',
    exact: true,
  });
  const plot = chart.getByRole('application');
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of ['-€100k', '€0', '€100k', '€200k']) {
      await expect
        .poll(() => plot.getByText(label, { exact: true }).isVisible())
        .toBe(true);
    }
  }
  await plot.focus();
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('-€52,345.89');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('€183,456.78');
});

test('automatic axis precision distinguishes close, fractional, and localized ticks', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const [name, labels] of [
    ['Close large ticks', ['1M', '1.0001M', '1.0002M']],
    ['Small ratios', ['0%', '0.01%', '0.02%']],
    ['Fractional ticks', ['0', '0.0001', '0.0002']],
    ['German currency', ['0 €', '1,5k €', '3k €']],
  ] as const) {
    const plot = page.getByRole('application', {
      name: `${name} plot`,
      exact: true,
    });
    for (const label of labels) {
      await expect
        .poll(() => plot.getByText(label, { exact: true }).isVisible())
        .toBe(true);
    }
  }
});

test('long currency axis labels fit inside the plot at desktop and phone widths', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Long currency labels basic example',
    exact: true,
  });
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    }
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          chart.evaluate(element => {
            const svg = element.querySelector('svg[role="application"]');
            if (!svg) return false;
            const bounds = svg.getBoundingClientRect();
            const labels = Array.from(svg.querySelectorAll('text')).filter(
              label => label.textContent?.includes('€')
            );
            return (
              labels.some(label => label.textContent === '-€100,000.00') &&
              labels.some(label => label.textContent === '€200,000.00') &&
              labels.every(label => {
                const box = label.getBoundingClientRect();
                return box.left >= bounds.left && box.right <= bounds.right;
              })
            );
          })
        )
        .toBe(true);
    }
  }
});

test('standalone series use the configured chart palette independently of brand accent', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  for (const name of ['Standalone line', 'Standalone area']) {
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    const image = await readChartImage(chart);
    expect(
      image.pixels.filter(color => color === 0x8040c0).length
    ).toBeGreaterThan(50);
    expect(image.pixels.filter(color => color === 0xcc5500).length).toBe(0);
  }
});

test('mixed chart series describe their measures and inspect the same monthly values with the keyboard', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Monthly revenue, forecast, and conversion',
    exact: true,
  });
  expect(
    await chart
      .getByRole('application', {
        name: 'Monthly revenue, forecast, and conversion',
        exact: true,
      })
      .count()
  ).toBe(1);
  const legend = chart.getByRole('list', { name: 'Chart legend', exact: true });
  await expect.poll(() => legend.getByRole('listitem').count()).toBe(3);
  for (const name of ['Revenue (€k)', 'Forecast (€k)', 'Conversion (%)']) {
    await expect
      .poll(() => legend.getByText(name, { exact: true }).isVisible())
      .toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await chart.getByRole('application').focus();
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Jan');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('42');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('2.4');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Feb');
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('48');
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

test('standalone charts retain formatted hover and tap inspection, zero values, and scroll dismissal', async ({
  page,
  mobilePage,
}) => {
  for (const [current, touch] of [
    [page, false],
    [mobilePage, true],
  ] as const) {
    await current.setViewportSize({ width: 320, height: 900 });
    await current.goto('/chart-legends');
    for (const name of [
      'Standalone bar',
      'Standalone line',
      'Standalone area',
    ]) {
      const chart = current.getByRole('region', {
        name: `${name} basic example`,
        exact: true,
      });
      const point = chart.getByRole('button', {
        name: 'Wed: 8.0 ms',
        exact: true,
      });
      if (touch) await point.tap();
      else await point.hover();
      await expect
        .poll(() => current.getByRole('tooltip').textContent())
        .toContain('8.0 ms');
      expect(await point.getAttribute('tabindex')).toBe('-1');
      await current.keyboard.press('Escape');
      await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
      const zero = chart.getByRole('button', {
        name: 'Tue: 0.0 ms',
        exact: true,
      });
      if (touch) await zero.tap();
      else await zero.hover();
      await expect
        .poll(() => current.getByRole('tooltip').textContent())
        .toContain('0.0 ms');
      await current.evaluate(() => window.dispatchEvent(new Event('scroll')));
      await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
    }
    const pie = current.getByRole('region', {
      name: 'Standalone pie basic example',
      exact: true,
    });
    const slice = pie.getByRole('button', {
      name: 'Wed: 8.0 ms, 66.7%',
      exact: true,
    });
    if (touch) await slice.tap();
    else await slice.hover();
    await expect
      .poll(() => current.getByRole('tooltip').textContent())
      .toContain('8.0 ms');
    await expect
      .poll(() => current.getByRole('tooltip').textContent())
      .toContain('66.7%');
    await current.keyboard.press('Escape');
    await expect.poll(() => current.getByRole('tooltip').count()).toBe(0);
  }
});

test('product analytics charts preserve frontend funnel stacks, numeric retention offsets, and branch exploration', async ({
  page,
  mobilePage,
}) => {
  for (const current of [page, mobilePage]) {
    await current.emulateMedia({ reducedMotion: 'reduce' });
    await current.setViewportSize({ width: 320, height: 900 });
    await current.goto('/chart-legends');
    const funnel = current.getByRole('region', {
      name: 'Activation funnel plot',
      exact: true,
    });
    await funnel.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => funnel.getByRole('tooltip').textContent())
      .toContain('Signed up');
    await expect
      .poll(() => funnel.getByRole('tooltip').textContent())
      .toContain('600 of 1,000 users');
    const retention = current.getByRole('region', {
      name: 'Weekly retention plot',
      exact: true,
    });
    await retention.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 8: 60% · 48 / 80 users · Incomplete period');
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 1: 0% · 0 / 100 users');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Sep 8: Not observed');
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => retention.getByRole('tooltip').textContent())
      .toContain('Week 7');
    const journey = current.getByRole('region', {
      name: 'Onboarding journey',
      exact: true,
    });
    async function activateBranch(name: string) {
      const button = journey.getByRole('button', { name, exact: true });
      if (current === mobilePage) await button.tap();
      else await button.click();
    }
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Signed up, step 1, 1,060 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    expect(
      await journey.getByRole('region', { name: /Report created/ }).count()
    ).toBe(0);
    await activateBranch('More after Workspace created, step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('button', {
            name: 'Less after Workspace created, step 2',
            exact: true,
          })
          .getAttribute('aria-expanded')
      )
      .toBe('true');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Report created, step 3, 460 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Drop-off, step 3, 180 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await activateBranch('More after Report created, step 3');
    await activateBranch('More after Subscribed, step 4');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Converted, step 5, 460 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await activateBranch('Less after Workspace created, step 2');
    await expect
      .poll(() =>
        journey.getByRole('region', { name: /Report created/ }).count()
      )
      .toBe(0);
    await activateBranch('Show more events at step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Settings, step 2, 20 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    expect(
      await journey
        .getByRole('button', {
          name: 'More after Settings, step 2',
          exact: true,
        })
        .count()
    ).toBe(0);
    await activateBranch('More after Search, step 2');
    await expect
      .poll(() =>
        journey
          .getByRole('region', {
            name: 'Signed up, step 3, 30 users',
            exact: true,
          })
          .count()
      )
      .toBe(1);
    await current
      .getByRole('button', { name: 'Switch to dark theme', exact: true })
      .click();
    await expect
      .poll(() =>
        current.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      )
      .toBe(true);
    await current.evaluate(() => {
      document.documentElement.style.fontSize = '24px';
    });
    await expect
      .poll(() =>
        current.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      )
      .toBe(true);
  }
});

test('funnel inspection follows the hovered or tapped conversion and drop-off portion', async ({
  page,
  mobilePage,
}) => {
  for (const [current, touch] of [
    [page, false],
    [mobilePage, true],
  ] as const) {
    await current.setViewportSize({ width: 1280, height: 900 });
    await current.goto('/chart-legends');
    const plot = current.getByRole('region', {
      name: 'Activation funnel plot',
      exact: true,
    });
    await plot.scrollIntoViewIfNeeded();
    const visited = await plot
      .getByText('Visited', { exact: true })
      .boundingBox();
    const signedUp = await plot
      .getByText('Signed up', { exact: true })
      .boundingBox();
    const zero = await plot.getByText('0%', { exact: true }).boundingBox();
    const hundred = await plot.getByText('100%', { exact: true }).boundingBox();
    const center = signedUp!.x + signedUp!.width / 2;
    const band = center - (visited!.x + visited!.width / 2);
    const x = center - band / 4;
    const bottom = zero!.y + zero!.height / 2;
    const top = hundred!.y + hundred!.height / 2;
    for (const [rate, expected] of [
      [0.3, '600 of 1,000 users'],
      [0.8, '400 of 1,000 users'],
    ] as const) {
      const y = bottom - (bottom - top) * rate;
      if (touch) await current.touchscreen.tap(x, y);
      else await current.mouse.move(x, y);
      await expect
        .poll(() => plot.getByRole('tooltip').textContent())
        .toContain(expected);
      expect(await plot.getByRole('tooltip').textContent()).not.toContain(
        'Paid plan'
      );
      await expect
        .poll(() => plot.getByRole('tooltip').textContent())
        .toContain(rate === 0.3 ? '60% conversion' : '40% drop-off');
    }
    await plot.getByRole('application').focus();
    await current.keyboard.press('ArrowRight');
    await expect
      .poll(() => plot.getByRole('tooltip').textContent())
      .toContain('Paid plan');
  }
});

test('chart frames suppress pointer focus outlines and restore keyboard focus', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Activation funnel plot', 'Weekly retention plot']) {
    const plot = page
      .getByRole('region', { name, exact: true })
      .getByRole('application');
    await plot.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('solid');
    await plot.click({ position: { x: 10, y: 10 } });
    await plot.focus();
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('none');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() =>
        plot.evaluate(element => getComputedStyle(element).outlineStyle)
      )
      .toBe('solid');
  }
});

test('stacked bars have square joins while unstacked bars and explicit radii stay rounded', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  for (const name of ['Default stack', 'Rounded override', 'Unstacked bars']) {
    const chart = page.getByRole('region', { name, exact: true });
    const image = await readChartImage(chart.getByRole('application'));
    // Compare the painted top edge with the full width of the first purple bar.
    const columns = new Set<number>();
    image.pixels.forEach((color, index) => {
      if (color === 0x8040c0) columns.add(index % image.width);
    });
    const ordered = [...columns].sort((a, b) => a - b);
    expect(ordered.length).toBeGreaterThan(0);
    const left = ordered[0]!;
    const right =
      ordered.find((x, index) => index > 0 && x > ordered[index - 1]! + 1) ??
      image.width;
    const rowWidths: number[] = [];
    for (let y = 0; y < image.height; y++) {
      let width = 0;
      for (let x = left; x < right; x++) {
        if (image.pixels[y * image.width + x] === 0x8040c0) width++;
      }
      if (width) rowWidths.push(width);
    }
    const cornerInset = Math.max(...rowWidths) - rowWidths[0]!;
    if (name === 'Default stack') expect(cornerInset).toBeLessThanOrEqual(1);
    else expect(cornerInset).toBeGreaterThanOrEqual(4);
  }
});

test('default composed inspection formats the hovered measure and restores complete keyboard readings', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const bars = page.getByRole('region', { name: 'Hover bars', exact: true });
  const barPlot = bars.getByRole('application');
  await barPlot.scrollIntoViewIfNeeded();
  const label = await barPlot.getByText('One', { exact: true }).boundingBox();
  const barBounds = await barPlot.boundingBox();
  // The fixture's grouped bars straddle the category label with a 4px gap.
  await page.mouse.move(
    label!.x + label!.width / 2 + 17,
    barBounds!.y + barBounds!.height * 0.8
  );
  await expect
    .poll(() => bars.getByRole('tooltip').textContent())
    .toContain('Green : 1,234.568');
  expect(await bars.getByRole('tooltip').textContent()).not.toContain('Purple');
  const lines = page.getByRole('region', { name: 'Hover lines', exact: true });
  const plot = lines.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.25,
    bounds!.y + bounds!.height * 0.65
  );
  await expect
    .poll(() => lines.getByRole('tooltip').textContent())
    .toContain('Green : 1,234.568');
  expect(await lines.getByRole('tooltip').getByRole('listitem').count()).toBe(
    1
  );
  await page.mouse.move(0, 0);
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => lines.getByRole('tooltip').textContent())
    .toContain('Purple');
});

test('touch inspection retains only the tapped series after releasing the screen', async ({
  mobilePage: page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', { name: 'Hover bars', exact: true });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const label = await plot.getByText('One', { exact: true }).boundingBox();
  const bounds = await plot.boundingBox();
  for (const [offset, reading, other] of [
    [17, 'Green : 1,234.568', 'Purple'],
    [-17, 'Purple : 2,400.123', 'Green'],
  ] as const) {
    await page.touchscreen.tap(
      label!.x + label!.width / 2 + offset,
      bounds!.y + bounds!.height * 0.8
    );
    await expect
      .poll(() => chart.getByRole('tooltip').textContent())
      .toContain(reading);
    expect(await chart.getByRole('tooltip').textContent()).not.toContain(other);
  }
});

test('funnel and composed bars render the configured palette independently of the brand accent', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  for (const name of ['Activation funnel plot', 'Hover bars']) {
    const chart = page.getByRole('region', { name, exact: true });
    const image = await readChartImage(chart.getByRole('application'));
    expect(
      image.pixels.filter(color => color === 0x8040c0).length
    ).toBeGreaterThan(50);
    expect(image.pixels.filter(color => color === 0xcc5500).length).toBe(0);
  }
});

test('funnel summaries truncate long names, reserve a more cell, and separate the event path from the plot', async ({
  page,
  mobilePage,
}) => {
  for (const current of [page, mobilePage]) {
    await current.goto('/chart-legends');
    const funnel = current.getByRole('region', {
      name: 'Many populations funnel',
      exact: true,
    });
    const summary = funnel.getByRole('list', {
      name: 'Funnel series',
      exact: true,
    });
    const expectedCells = current === mobilePage ? 2 : 3;
    await expect
      .poll(() => summary.getByRole('listitem').count())
      .toBe(expectedCells);
    const tops = await summary
      .getByRole('listitem')
      .evaluateAll(items =>
        items.map(item => item.getBoundingClientRect().top)
      );
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
    const label = summary.getByText(
      'Population 1 — users assigned to the extended calendar experiment in Europe',
      { exact: true }
    );
    expect(await label.getAttribute('title')).toBe(await label.textContent());
    expect(
      await label.evaluate(element => ({
        truncated: element.scrollWidth > element.clientWidth,
        overflow: getComputedStyle(element).textOverflow,
      }))
    ).toEqual({ truncated: true, overflow: 'ellipsis' });
    const summaryBox = await summary.boundingBox();
    const pathBox = await funnel
      .getByText('Started onboarding → Completed onboarding', { exact: true })
      .boundingBox();
    const plotBox = await funnel
      .getByRole('region', {
        name: 'Many populations funnel plot',
        exact: true,
      })
      .boundingBox();
    expect(
      pathBox!.y - summaryBox!.y - summaryBox!.height
    ).toBeGreaterThanOrEqual(12);
    expect(plotBox!.y - pathBox!.y - pathBox!.height).toBeGreaterThanOrEqual(
      16
    );
    const more = summary.getByRole('button', {
      name: `+${10 - expectedCells} more`,
      exact: true,
    });
    await more.click();
    await expect.poll(() => summary.getByRole('listitem').count()).toBe(10);
    const fewer = summary.getByRole('button', {
      name: 'Show fewer',
      exact: true,
    });
    expect(await fewer.getAttribute('aria-expanded')).toBe('true');
    await fewer.click();
    await expect
      .poll(() => summary.getByRole('listitem').count())
      .toBe(expectedCells);
    expect(
      await current.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBe(true);
  }
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
          cells.at(-1)!.text === `+${13 - cells.length} more` &&
          rows === 2 &&
          cells.length === firstRow * 2 &&
          Math.abs(cells.at(-1)!.right - right) < 1
        );
      })
      .toBe(true);
  }
});

test('area and line inspection shows only the nearest measure with formatted precision', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Inspection areas', 'Inspection lines']) {
    const chart = page.getByRole('region', { name, exact: true });
    const plot = chart.getByRole('application');
    await plot.scrollIntoViewIfNeeded();
    const bounds = await plot.boundingBox();
    // The lower fixture series lies near two thirds of the plot height.
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      bounds!.y + bounds!.height * 0.65
    );
    const tooltip = chart.getByRole('tooltip');
    await expect.poll(() => tooltip.textContent()).toContain('Green');
    expect(await tooltip.getByRole('listitem').count()).toBe(1);
    expect(await tooltip.textContent()).not.toMatch(/\d\.\d{4}/);
  }
});

test('single-series inspection remains available away from the line', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection single line',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height * 0.8
  );
  const tooltip = chart.getByRole('tooltip');
  await expect.poll(() => tooltip.isVisible()).toBe(true);
  expect(await tooltip.textContent()).toContain('Purple');
  expect(await tooltip.getByRole('listitem').count()).toBe(1);
});

test('filled areas suppress internal pointer outlines while preserving keyboard focus', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection areas',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.click();
  await expect.poll(() => chart.locator(':focus').count()).toBe(1);
  expect(
    await chart
      .locator(':focus')
      .evaluate(element => getComputedStyle(element).outlineStyle)
  ).toBe('none');
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      plot.evaluate(element => getComputedStyle(element).outlineStyle)
    )
    .toBe('solid');
});

test('tooltip stays anchored while moving vertically around the same point', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection lines',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  const point = {
    x: bounds!.x + bounds!.width / 2,
    y: bounds!.y + bounds!.height * 0.6,
  };
  await page.mouse.move(point.x, point.y + 10);
  const tooltip = chart.getByRole('tooltip');
  await expect.poll(() => tooltip.isVisible()).toBe(true);
  const content = await tooltip.textContent();
  const initial = await tooltip.boundingBox();
  for (const offset of [20, 30, 15]) {
    await page.mouse.move(point.x, point.y + offset);
    expect(await tooltip.textContent()).toBe(content);
    expect(await tooltip.boundingBox()).toEqual(initial);
  }
  await page.mouse.move(point.x + 70, point.y + 10);
  await expect.poll(() => tooltip.textContent()).not.toBe(content);
});

test('composed inspection switches between nearest pointer series and complete keyboard readings', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection lines',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  const tooltip = chart.getByRole('tooltip');
  // Inspect empty plot space near the lower series, then near the upper series.
  for (const [height, name] of [
    [0.65, 'Green'],
    [0.25, 'Purple'],
    [0.65, 'Green'],
  ] as const) {
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      bounds!.y + bounds!.height * height
    );
    await expect.poll(() => tooltip.textContent()).toContain(name);
    await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(1);
  }
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
  expect(await tooltip.textContent()).toContain('Green');
  expect(await tooltip.textContent()).toContain('Purple');
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height * 0.65
  );
  await expect.poll(() => tooltip.textContent()).toContain('Green');
  await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(1);
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

test('standalone charts keep the latest samples visible initially and after data updates', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/chart-legends');
  for (const count of [20, 30]) {
    if (count === 30)
      await page
        .getByRole('button', { name: 'Load newer samples', exact: true })
        .click();
    for (const name of ['Recent bar', 'Recent line', 'Recent area']) {
      const chart = page.getByRole('region', { name, exact: true });
      await chart.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => {
          const bounds = await chart.boundingBox();
          const latest = await chart
            .getByRole('button', {
              name: `Sample ${count}: ${count} ms`,
              exact: true,
            })
            .boundingBox();
          const first = await chart
            .getByRole('button', { name: 'Sample 1: 1 ms', exact: true })
            .boundingBox();
          return (
            latest &&
            bounds &&
            first &&
            first.x < bounds.x &&
            latest.x >= bounds.x &&
            latest.x + latest.width <= bounds.x + bounds.width + 2
          );
        })
        .toBe(true);
      await chart
        .getByRole('button', {
          name: `Sample ${count}: ${count} ms`,
          exact: true,
        })
        .hover();
      await expect
        .poll(() => page.getByRole('tooltip').textContent())
        .toContain(`${count} ms`);
      await page.keyboard.press('Escape');
    }
  }
});

for (const name of ['Hover bars', 'Inspection lines', 'Inspection areas']) {
  for (const exit of ['leave', 'blur']) {
    test(`${name} ${exit} restores complete focus readings`, async ({
      page,
    }) => {
      await page.goto('/chart-legends');
      const chart = page.getByRole('region', {
        name: name === 'Hover bars' ? name : `${name} basic example`,
        exact: true,
      });
      const plot = chart.getByRole('application');
      const tooltip = chart.getByRole('tooltip');
      await plot.scrollIntoViewIfNeeded();
      if (exit === 'blur') await plot.focus();
      const bounds = (await plot.boundingBox())!;
      const label =
        name === 'Hover bars'
          ? (await plot.getByText('One', { exact: true }).boundingBox())!
          : null;
      await page.mouse.move(
        label ? label.x + label.width / 2 + 17 : bounds.x + bounds.width / 2,
        bounds.y + bounds.height * (label ? 0.8 : 0.65)
      );
      await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(1);
      if (exit === 'leave') {
        // No blur or key handler can reset a plot that has never received focus.
        await page.mouse.move(0, 0);
        await expect.poll(() => tooltip.isVisible()).toBe(false);
      } else {
        await page
          .getByRole('button', { name: 'Switch to dark theme', exact: true })
          .evaluate(element => element.focus({ preventScroll: true }));
      }
      await plot.focus();
      await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
    });
  }
}

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

test('retention derives ticks, inspection, and accessible readings from authored periods', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  const chart = page.getByRole('region', {
    name: 'Sparse retention',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const labels = await plot.getByText(/Cohort/).allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  expect(
    labels.every(label => /^Cohort 2026 \/ week (0|2|7|11)$/.test(label))
  ).toBe(true);
  await plot.focus();
  const tooltip = chart.getByRole('tooltip');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Alpha: 80% · 90 / 100 users');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Alpha: Not observed');
  expect(await tooltip.textContent()).toContain('Beta: 40% · 20 / 50 users');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Alpha: 0% · 0 / 100 users');
  expect(await tooltip.textContent()).not.toContain('Beta');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Alpha: 15% · 15 / 100 users · Incomplete period');
  expect(await tooltip.textContent()).toContain(
    'Beta: 20% · 10 / 50 users · Incomplete period'
  );
  await page
    .getByRole('button', { name: 'Switch to dark theme', exact: true })
    .evaluate(element => element.focus({ preventScroll: true }));
  const image = await readChartImage(plot);
  const tailPixels = image.pixels.filter(
    (_, index) =>
      index % image.width > image.width * 0.7 &&
      Math.floor(index / image.width) > image.height * 0.5
  );
  // Alpha's observed zero joins its dotted tail. Beta's missing week 7 breaks it.
  expect(tailPixels.filter(pixel => pixel === 0x8040c0).length).toBeGreaterThan(
    10
  );
  expect(tailPixels.filter(pixel => pixel === 0x208040).length).toBe(0);
  const readings = await chart
    .getByRole('list', { name: 'Sparse retention readings', exact: true })
    .getByRole('listitem')
    .allTextContents();
  expect(readings[0]).toBe(
    'Alpha · Cohort 2026 / week 0: 80% · 90 / 100 users · Cohort 2026 / week 2: Not observed · Cohort 2026 / week 7: 0% · 0 / 100 users · Cohort 2026 / week 11: 15% · 15 / 100 users · Incomplete period'
  );
});

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

test('long bar category labels fit their columns and retain full readings', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ['plain', 'with actions']) {
        const chart = page.getByRole('region', {
          name: `Long category bars ${mode}`,
          exact: true,
        });
        const labels = chart.getByTitle(/B2B|Business|International/);
        await expect.poll(() => labels.count()).toBe(6);
        await expect
          .poll(async () => {
            const bounds = await labels.evaluateAll(elements =>
              elements.map(element => {
                const rect = element.getBoundingClientRect();
                return {
                  left: rect.left,
                  right: rect.right,
                  width: rect.width,
                };
              })
            );
            const columns = await chart
              .getByRole('button', { name: /: \d+ people/ })
              .evaluateAll(elements =>
                elements.map(element => {
                  const rect = element.getBoundingClientRect();
                  return { left: rect.left, right: rect.right };
                })
              );
            const centers = columns.map(
              column => (column.left + column.right) / 2
            );
            const halfColumn = (centers[1]! - centers[0]!) / 2;
            return bounds.every(
              (label, index) =>
                label.width > 0 &&
                label.left >= centers[index]! - halfColumn - 1 &&
                label.right <= centers[index]! + halfColumn + 1
            );
          })
          .toBe(true);
        const last = 'B2BReactivationWithoutSpaces';
        expect(
          await chart.getByTitle(last, { exact: true }).evaluate(element => {
            const style = getComputedStyle(element);
            return (
              element.scrollWidth > element.clientWidth &&
              style.overflowX === 'hidden' &&
              style.textOverflow === 'ellipsis'
            );
          })
        ).toBe(true);
        await chart
          .getByRole('button', { name: new RegExp(`${last}: 20 people`) })
          .hover();
        await expect
          .poll(() => page.getByRole('tooltip').textContent())
          .toContain(last);
        await page.keyboard.press('Escape');
        if (mode === 'with actions') {
          await chart
            .getByRole('button', { name: `${last}: Actions`, exact: true })
            .click();
          await expect
            .poll(() =>
              page
                .getByRole('menuitem', { name: 'Inspect', exact: true })
                .isVisible()
            )
            .toBe(true);
          await page.keyboard.press('Escape');
        }
      }
    }
  }
});
