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

test('bar tooltips stay inside the visible plot for full-height and zero-value samples', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Standalone bar basic example',
    exact: true,
  });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Wed: 8.0 ms', 'Tue: 0.0 ms', 'Mon: 4.0 ms']) {
      const point = chart.getByRole('button', { name, exact: true });
      await point.hover();
      const tooltip = page.getByRole('tooltip');
      await expect
        .poll(async () => {
          const bounds = await tooltip.boundingBox();
          const plot = await chart
            .locator('.altertable-chart-canvas')
            .boundingBox();
          const viewport = await chart
            .locator('.altertable-selectable-bars-scroll')
            .boundingBox();
          return (
            !!bounds &&
            !!plot &&
            !!viewport &&
            bounds.y >= Math.max(plot.y, viewport.y) &&
            bounds.y + bounds.height <=
              Math.min(plot.y + plot.height, viewport.y + viewport.height) &&
            bounds.x >= Math.max(plot.x, viewport.x) &&
            bounds.x + bounds.width <=
              Math.min(plot.x + plot.width, viewport.x + viewport.width)
          );
        })
        .toBe(true);
    }
  }
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

test('sparse stacked bars follow the nearest populated hour and closest visible series', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Sparse stacked bars basic example',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bars = await chart
    .locator('.recharts-bar-rectangle')
    .evaluateAll(elements =>
      elements
        .map(element => element.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        }))
        .sort((left, right) => left.x - right.x || right.y - left.y)
    );
  const [a0, b2, a3, b3] = bars;
  const tooltip = chart.getByRole('tooltip');
  await page.mouse.move(a0!.x + a0!.width / 2, a0!.y + a0!.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization A : 5');
  await page.mouse.move(b2!.x + b2!.width / 2, b2!.y + b2!.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 7');
  const anchored = (await tooltip.boundingBox())!;
  const distanceToBar = Math.min(
    Math.abs(anchored.x - (b2!.x + b2!.width)),
    Math.abs(anchored.x + anchored.width - b2!.x)
  );
  expect(distanceToBar).toBeLessThanOrEqual(20);
  await page.mouse.move(b2!.x + b2!.width / 2, b2!.y - 20);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 7');
  expect(await tooltip.boundingBox()).toEqual(anchored);
  const emptyHour = await plot.getByText('H1', { exact: true }).boundingBox();
  await page.mouse.move(
    emptyHour!.x + emptyHour!.width * 0.75,
    b2!.y + b2!.height / 2
  );
  await expect.poll(() => tooltip.textContent()).toContain('H2');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 7');
  expect(await tooltip.boundingBox()).toEqual(anchored);
  const nullHour = await plot.getByText('H4', { exact: true }).boundingBox();
  await page.mouse.move(
    nullHour!.x + nullHour!.width / 2,
    b3!.y + b3!.height / 2
  );
  await expect.poll(() => tooltip.isVisible()).toBe(true);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 3');
  await page.mouse.move(a3!.x + a3!.width / 2, a3!.y + a3!.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization A : 2');
  const axisBaseline = await plot
    .locator('.recharts-xAxis .recharts-cartesian-axis-line')
    .evaluate(element => element.getBoundingClientRect().y);
  const lowBarTooltip = (await tooltip.boundingBox())!;
  expect(
    axisBaseline - (lowBarTooltip.y + lowBarTooltip.height)
  ).toBeGreaterThanOrEqual(8);
  await expect
    .poll(() =>
      chart.locator('.recharts-bar-rectangle [opacity="0.75"]').count()
    )
    .toBe(1);
  await page.mouse.move(b3!.x + b3!.width / 2, b3!.y + b3!.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 3');
  await expect
    .poll(() =>
      chart.locator('.recharts-bar-rectangle [opacity="0.75"]').count()
    )
    .toBe(1);

  await page.setViewportSize({ width: 320, height: 900 });
  await plot.scrollIntoViewIfNeeded();
  const rightmostBar = await chart
    .locator('.recharts-bar-rectangle')
    .evaluateAll(
      elements =>
        elements
          .map(element => element.getBoundingClientRect())
          .filter(rect => rect.width > 0 && rect.height > 0)
          .map(rect => ({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }))
          .sort((left, right) => right.x - left.x)[0]
    );
  await page.mouse.move(
    rightmostBar!.x + rightmostBar!.width / 2,
    rightmostBar!.y + rightmostBar!.height / 2
  );
  await expect.poll(() => tooltip.isVisible()).toBe(true);
  const narrowPlot = (await plot.boundingBox())!;
  const narrowTooltip = (await tooltip.boundingBox())!;
  expect(narrowTooltip.x).toBeGreaterThanOrEqual(narrowPlot.x);
  expect(narrowTooltip.x + narrowTooltip.width).toBeLessThanOrEqual(
    narrowPlot.x + narrowPlot.width
  );
});

test('brushed stacked bars inspect nested values and authored shapes after data and size changes', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Stacked bar inspection regressions basic example',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const bShape = chart.locator('[data-custom-shape="b"]');
  await expect.poll(() => bShape.count()).toBeGreaterThan(0);
  const bBar = (await bShape.first().boundingBox())!;
  const pointer = { x: bBar.x + bBar.width / 2, y: bBar.y + bBar.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  const tooltip = chart.getByRole('tooltip');
  await expect.poll(() => tooltip.textContent()).toContain('H2');
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 7');
  await expect
    .poll(() => chart.locator('[data-custom-active-shape="b"]').count())
    .toBe(1);
  expect(
    await chart
      .locator('[data-custom-active-shape="b"]')
      .getAttribute('data-inspection-active')
  ).toBe('true');

  await chart.getByRole('button', { name: 'Update bars' }).evaluate(button => {
    (button as HTMLButtonElement).click();
  });
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 9');

  await chart.locator('section.altertable-composed-chart').evaluate(element => {
    (element as HTMLElement).style.width = '70%';
  });
  await expect
    .poll(async () => {
      const bar = await chart
        .locator('[data-custom-active-shape="b"]')
        .first()
        .boundingBox();
      const tip = await tooltip.boundingBox();
      if (!bar || !tip) return Infinity;
      return Math.min(
        Math.abs(tip.x - (bar.x + bar.width)),
        Math.abs(tip.x + tip.width - bar.x)
      );
    })
    .toBeLessThanOrEqual(20);
});

test('a mixed chart inspects the nearest line point or stacked bar and preserves authored shapes', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Mixed stacked inspection basic example',
    exact: true,
  });
  const plot = chart.getByRole('application');
  await plot.scrollIntoViewIfNeeded();
  const a = (await chart
    .locator('.recharts-bar-rectangle [name="Organization A"]')
    .first()
    .boundingBox())!;
  const b = (await chart
    .locator('.recharts-bar-rectangle [name="Organization B"]')
    .first()
    .boundingBox())!;
  expect(
    await chart
      .locator('.recharts-bar-rectangle [name="Organization A"]')
      .first()
      .getAttribute('fill')
  ).toBe('#13579b');
  const tooltip = chart.getByRole('tooltip');
  const linePoint = await chart
    .locator('.recharts-line-curve')
    .evaluate(path => {
      const curve = path as SVGPathElement;
      const point = curve.getPointAtLength(0);
      const screen = point.matrixTransform(curve.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    });
  await page.mouse.move(linePoint.x, linePoint.y);
  await expect.poll(() => tooltip.textContent()).toContain('Trend : 11');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization B : 3');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await expect
    .poll(() => tooltip.textContent())
    .toContain('Organization A : 5');
  await expect
    .poll(() => chart.locator('[data-active-shape="a"]').count())
    .toBe(1);
  await chart
    .getByRole('button', { name: 'Trend', exact: true })
    .evaluate(button => {
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
  await expect
    .poll(() =>
      chart
        .locator('[data-active-shape="a"]')
        .evaluate(element => Boolean(element.closest('g[opacity="0.2"]')))
    )
    .toBe(true);
});

for (const name of [
  'Wrapped category axis inspection',
  'Wrapped vertical category axis inspection',
]) {
  test(`${name} supplies the tooltip label for the selected axis ID`, async ({
    page,
  }) => {
    await page.goto('/chart-legends');
    const chart = page.getByRole('region', {
      name: `${name} basic example`,
      exact: true,
    });
    await chart.getByRole('application').scrollIntoViewIfNeeded();
    const bar = (await chart
      .locator('.recharts-bar-rectangle path')
      .first()
      .boundingBox())!;
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    const tooltip = chart.getByRole('tooltip');
    await expect.poll(() => tooltip.textContent()).toContain('H0');
    expect(await tooltip.textContent()).not.toContain('Wrong 0');
  });
}

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
        // Leave for a stable sibling plot without focusing the inspected plot.
        await page
          .getByRole('application', { name: 'Hover lines', exact: true })
          .hover();
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
