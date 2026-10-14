import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

test('standalone series use the configured chart palette independently of brand accent', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  for (const name of ['Standalone line', 'Standalone area']) {
    const chart = page.getByRole('region', { name, exact: true });
    await expect
      .poll(() =>
        chart.locator('.recharts-line-curve').evaluateAll(elements =>
          elements.map(element => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d')!;
            context.fillStyle = getComputedStyle(element).stroke;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data];
          })
        )
      )
      .toEqual([[128, 64, 192, 255]]);
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
  expect(await chart.locator('svg title:not(:empty), svg[title]').count()).toBe(
    0
  );
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
  await page.goto('/chart-legends');
  for (const name of ['Default stack', 'Rounded override', 'Unstacked bars']) {
    const chart = page.getByRole('region', { name, exact: true });
    const bars = chart.locator('path.recharts-rectangle');
    // Inspect the rendered outlines: rounded corners use SVG arc commands.
    // All five non-null values must render, including negative and sparse stacks.
    await expect.poll(() => bars.count()).toBe(5);
    const outlines = await bars.evaluateAll(elements =>
      elements.map(element => element.getAttribute('d') ?? '')
    );
    expect(outlines.every(outline => outline.length > 0)).toBe(true);
    expect(outlines.map(outline => /[Aa]/.test(outline))).toEqual(
      Array(5).fill(name !== 'Default stack')
    );
  }
});

test('default composed inspection keeps series colors, hides sample dots, and formats only the hovered measure', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const bars = page.getByRole('region', { name: 'Hover bars', exact: true });
  const green = bars.locator('path[fill="var(--atbl-chart-3)"]').first();
  const fill = await green.evaluate(element => getComputedStyle(element).fill);
  await green.scrollIntoViewIfNeeded();
  const greenBox = await green.boundingBox();
  await page.mouse.move(
    greenBox!.x + greenBox!.width / 2,
    greenBox!.y + greenBox!.height / 2
  );
  await expect
    .poll(() => bars.getByRole('tooltip').textContent())
    .toContain('Green : 1,234.568');
  expect(await bars.getByRole('tooltip').textContent()).not.toContain('Purple');
  expect(await green.evaluate(element => getComputedStyle(element).fill)).toBe(
    fill
  );
  const lines = page.getByRole('region', { name: 'Hover lines', exact: true });
  expect(await lines.locator('.recharts-line-dots circle').count()).toBe(0);
  const curve = lines.locator('.recharts-line-curve').nth(1);
  await curve.scrollIntoViewIfNeeded();
  const point = await curve.evaluate(element => {
    const path = element as SVGPathElement;
    const point = path.getPointAtLength(path.getTotalLength() * 0.2);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(
      path.getScreenCTM()!
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y);
  await expect
    .poll(() => lines.getByRole('tooltip').textContent())
    .toContain('Green : 1,234.568');
  expect(await lines.getByRole('tooltip').textContent()).not.toContain(
    'Purple'
  );
  await expect
    .poll(() => lines.locator('.recharts-active-dot circle').count())
    .toBe(1);
  await page.mouse.move(0, 0);
  await lines.getByRole('application').focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => lines.getByRole('tooltip').textContent())
    .toContain('Purple');
});

test('touch inspection retains only the tapped series after releasing the screen', async ({
  mobilePage,
}) => {
  await mobilePage.goto('/chart-legends');
  const chart = mobilePage.getByRole('region', {
    name: 'Hover bars',
    exact: true,
  });
  await chart.locator('.recharts-bar-rectangle path').nth(2).tap();
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Green : 1,234.568');
  expect(await chart.getByRole('tooltip').textContent()).not.toContain(
    'Purple'
  );
  await chart.locator('.recharts-bar-rectangle path').first().tap();
  await expect
    .poll(() => chart.getByRole('tooltip').textContent())
    .toContain('Purple : 2,400.123');
  expect(await chart.getByRole('tooltip').textContent()).not.toContain('Green');
});

test('funnel conversion bars use the same palette color as composed bars', async ({
  page,
}) => {
  await page.goto('/chart-legends?palette');
  const funnel = page.getByRole('region', {
    name: 'Activation funnel plot',
    exact: true,
  });
  const bars = page.getByRole('region', { name: 'Hover bars', exact: true });
  const fill = await bars
    .locator('.recharts-bar-rectangle path')
    .first()
    .evaluate(element => getComputedStyle(element).fill);
  expect(
    await funnel
      .locator('.recharts-bar-rectangle path')
      .first()
      .evaluate(element => getComputedStyle(element).fill)
  ).toBe(fill);
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

test('area and line charts show only the hovered series with formatted precision and an active dot', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  for (const [name, selector, expected] of [
    ['Inspection areas', '.recharts-area-curve', 'Green'],
    ['Inspection lines', '.recharts-line-curve', 'Green'],
  ]) {
    const chart = page.getByRole('region', { name, exact: true });
    expect(
      await chart
        .locator('.recharts-line-dots circle, .recharts-area-dots circle')
        .count()
    ).toBe(0);
    const curve = chart.locator(selector).nth(1);
    await curve.scrollIntoViewIfNeeded();
    const point = await curve.evaluate(element => {
      const path = element as SVGPathElement;
      const point = path.getPointAtLength(path.getTotalLength() * 0.3);
      const screen = new DOMPoint(point.x, point.y).matrixTransform(
        path.getScreenCTM()!
      );
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.move(point.x, point.y);
    await expect
      .poll(() => chart.getByRole('tooltip').textContent())
      .toContain(expected);
    expect(await chart.getByRole('tooltip').getByRole('listitem').count()).toBe(
      1
    );
    expect(await chart.getByRole('tooltip').textContent()).not.toMatch(
      /\d\.\d{4}/
    );
    await expect
      .poll(() => chart.locator('.recharts-active-dot circle').count())
      .toBe(1);
  }
});

test('single-series tooltip follows the pointer across the plot away from the line', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection single line',
    exact: true,
  });
  const curve = chart.locator('.recharts-line-curve');
  await curve.scrollIntoViewIfNeeded();
  const point = await curve.evaluate(element => {
    const path = element as SVGPathElement;
    const point = path.getPointAtLength(path.getTotalLength() * 0.5);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(
      path.getScreenCTM()!
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y + 30);
  await expect.poll(() => chart.getByRole('tooltip').isVisible()).toBe(true);
  expect(await chart.getByRole('tooltip').getByRole('listitem').count()).toBe(
    1
  );
  await expect
    .poll(() => chart.locator('.recharts-active-dot circle').count())
    .toBe(1);
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

test('line charts select the nearest series across empty plot space', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection lines',
    exact: true,
  });
  const curves = chart.locator('.recharts-line-curve');
  await curves.first().scrollIntoViewIfNeeded();
  for (const [index, offset, expected] of [
    [0, -15, 'Purple'],
    [1, 20, 'Green'],
    [0, -15, 'Purple'],
  ] as const) {
    const point = await curves.nth(index).evaluate(element => {
      const path = element as SVGPathElement;
      const point = path.getPointAtLength(30);
      const screen = new DOMPoint(point.x, point.y).matrixTransform(
        path.getScreenCTM()!
      );
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.move(point.x, point.y + offset);
    await expect
      .poll(() => chart.getByRole('tooltip').textContent())
      .toContain(expected);
    expect(await chart.getByRole('tooltip').getByRole('listitem').count()).toBe(
      1
    );
    await expect
      .poll(() => chart.locator('.recharts-active-dot circle').count())
      .toBe(1);
  }
});

test('tooltip stays anchored while moving vertically around the same point', async ({
  page,
}) => {
  await page.goto('/chart-legends');
  const chart = page.getByRole('region', {
    name: 'Inspection lines',
    exact: true,
  });
  const curve = chart.locator('.recharts-line-curve').nth(1);
  await curve.scrollIntoViewIfNeeded();
  const point = await curve.evaluate(element => {
    const path = element as SVGPathElement;
    const point = path.getPointAtLength(70);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(
      path.getScreenCTM()!
    );
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y + 10);
  const tooltip = chart.getByRole('tooltip');
  await expect.poll(() => tooltip.isVisible()).toBe(true);
  const content = await tooltip.textContent();
  const initial = await tooltip.boundingBox();
  const dot = await chart.locator('.recharts-active-dot circle').boundingBox();
  for (const offset of [20, 30, 15]) {
    await page.mouse.move(point.x, point.y + offset);
    expect(await tooltip.textContent()).toBe(content);
    expect(await tooltip.boundingBox()).toEqual(initial);
    expect(
      await chart.locator('.recharts-active-dot circle').boundingBox()
    ).toEqual(dot);
  }
  await page.mouse.move(point.x + 70, point.y + 10);
  await expect.poll(() => tooltip.textContent()).not.toBe(content);
});
