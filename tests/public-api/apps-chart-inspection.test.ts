import type { Locator } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

async function samplePosition(chart: Locator, index: number) {
  return chart
    .locator(`[data-atbl-internal-sample="${index}"]`)
    .evaluate(element => {
      const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
      return { x: matrix.e, y: matrix.f };
    });
}

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
      else if (name === 'Standalone bar') await point.hover();
      else {
        await point.scrollIntoViewIfNeeded();
        const position = await samplePosition(chart, 2);
        await current.mouse.move(position.x, position.y);
      }
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
      else if (name === 'Standalone bar') await zero.hover();
      else {
        const position = await samplePosition(chart, 1);
        await current.mouse.move(position.x, position.y);
      }
      await expect
        .poll(() => current.getByRole('tooltip').textContent())
        .toContain('0.0 ms');
      // Mobile WebKit has no wheel, so a phone scrolls the page instead.
      if (touch) await current.evaluate(() => window.scrollBy(0, 40));
      else await current.mouse.wheel(0, 40);
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

test('standalone bar, line and area tooltips stay put while the same item is highlighted', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Standalone bar', 'Standalone line', 'Standalone area']) {
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    const point = chart.getByRole('button', {
      name: 'Wed: 8.0 ms',
      exact: true,
    });
    await point.scrollIntoViewIfNeeded();
    const bounds = await point.boundingBox();
    const position =
      name === 'Standalone bar'
        ? {
            x: bounds!.x + bounds!.width / 2,
            y: bounds!.y + bounds!.height * 0.75,
          }
        : await samplePosition(chart, 2);
    await page.mouse.move(position.x - 2, position.y);
    const tooltip = page.getByRole('tooltip');
    await expect.poll(() => tooltip.textContent()).toContain('8.0 ms');
    const initial = await tooltip.boundingBox();
    await page.mouse.move(position.x + 2, position.y);
    expect(await tooltip.textContent()).toContain('8.0 ms');
    expect(await tooltip.boundingBox()).toEqual(initial);
  }
});

test('fixed chart inspection resumes within the same sample after scrolling', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Standalone bar', 'Standalone line', 'Standalone area']) {
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    const point = chart.getByRole('button', {
      name: 'Wed: 8.0 ms',
      exact: true,
    });
    await point.hover();
    const bounds = await point.boundingBox();
    const { x, y } =
      name === 'Standalone bar'
        ? {
            x: bounds!.x + bounds!.width / 2,
            y: bounds!.y + bounds!.height / 2,
          }
        : await samplePosition(chart, 2);
    await page.mouse.move(x + 1, y);
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('8.0 ms');
    await page.evaluate(() => window.scrollBy(0, 10));
    await expect.poll(() => page.getByRole('tooltip').count()).toBe(0);
    await page.mouse.move(x + 2, y);
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('8.0 ms');
    if (name !== 'Standalone bar') {
      await expect
        .poll(() => chart.locator('.altertable-chart-canvas circle').count())
        .toBe(1);
    }
    await page.keyboard.press('Escape');
    await page.mouse.move(x + 3, y);
    expect(await page.getByRole('tooltip').count()).toBe(0);
  }
});

test('standalone line and area inspect the closest dot in both dimensions', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const name of ['Standalone line', 'Standalone area']) {
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    await chart.scrollIntoViewIfNeeded();
    const low = await samplePosition(chart, 1);
    const high = await samplePosition(chart, 2);
    const x = (low.x + high.x) / 2 + 3;
    await page.mouse.move(x, low.y);
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('Tue');
    await page.mouse.move(x, high.y);
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('Wed');
    const dot = await chart
      .locator('.altertable-chart-canvas circle')
      .boundingBox();
    expect(dot!.x + dot!.width / 2).toBeCloseTo(high.x, 1);
    expect(dot!.y + dot!.height / 2).toBeCloseTo(high.y, 1);
  }
});

test('trend actions follow the highlighted dot when it differs from the pointer column', async ({
  page,
}) => {
  await page.goto('/chart-cursors?actions');
  for (const kind of ['line', 'area']) {
    const chart = page.getByRole('region', {
      name: `Action ${kind}`,
      exact: true,
    });
    await chart.scrollIntoViewIfNeeded();
    const low = await samplePosition(chart, 0);
    const high = await samplePosition(chart, 1);
    const x = (low.x + high.x) / 2 + 3;
    await page.mouse.move(x, low.y);
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('Minute 0');
    await page.mouse.click(x, low.y);
    await expect
      .poll(() => page.getByLabel('Selected sample').textContent())
      .toBe(`${kind}: Minute 0`);
  }
});

test('bar inspection anchors beside the bar even from the edge of its hit band', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Standalone bar basic example',
    exact: true,
  });
  const point = chart.getByRole('button', { name: 'Wed: 8.0 ms', exact: true });
  await point.scrollIntoViewIfNeeded();
  const hit = await point.boundingBox();
  const mark = await chart
    .locator('[data-atbl-internal-bar-id="wed"]')
    .boundingBox();
  await page.mouse.move(hit!.x + 2, hit!.y + hit!.height * 0.8);
  const tooltip = page.getByRole('tooltip');
  await expect.poll(() => tooltip.textContent()).toContain('Wed');
  const bounds = await tooltip.boundingBox();
  expect(bounds!.x + bounds!.width / 2).toBeCloseTo(
    mark!.x + mark!.width / 2,
    0
  );
  expect(
    Math.min(
      Math.abs(bounds!.y + bounds!.height - mark!.y),
      Math.abs(bounds!.y - mark!.y)
    )
  ).toBeLessThan(20);
});

test('standalone bars inspect the nearest category between visible bars', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Standalone bar basic example',
    exact: true,
  });
  const wedButton = chart.getByRole('button', {
    name: 'Wed: 8.0 ms',
    exact: true,
  });
  await wedButton.scrollIntoViewIfNeeded();
  const wed = await wedButton.boundingBox();
  const thu = await chart
    .getByRole('button', { name: 'Thu: 3.0 ms', exact: true })
    .boundingBox();
  const boundary = (wed!.x + wed!.width / 2 + thu!.x + thu!.width / 2) / 2;
  const y = wed!.y + wed!.height / 2;
  const tooltip = page.getByRole('tooltip');
  await page.mouse.move(boundary - 3, y);
  await expect.poll(() => tooltip.textContent()).toContain('Wed');
  await page.mouse.move(boundary + 3, y);
  await expect.poll(() => tooltip.textContent()).toContain('Thu');
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
      if (exit === 'blur') {
        // Keep the previous focus target in view so tabbing away cannot scroll.
        await page.setViewportSize({ width: 1280, height: 2400 });
      }
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
        // Move keyboard focus out of the plot while the pointer stays over it.
        const scrollY = await page.evaluate(() => window.scrollY);
        await page.keyboard.press('Shift+Tab');
        expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
        await expect
          .poll(() =>
            plot.evaluate(element => element.contains(document.activeElement))
          )
          .toBe(false);
      }
      await plot.focus();
      await expect.poll(() => tooltip.getByRole('listitem').count()).toBe(2);
    });
  }
}
