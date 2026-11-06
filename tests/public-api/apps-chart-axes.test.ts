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
  const plot = chart.getByRole('application');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    }
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(async () => {
          const bounds = await plot.boundingBox();
          const labels = await plot.getByText(/€/).all();
          const boxes = await Promise.all(
            labels.map(label => label.boundingBox())
          );
          return (
            (await plot.getByText('-€100,000.00', { exact: true }).count()) ===
              1 &&
            (await plot.getByText('€200,000.00', { exact: true }).count()) ===
              1 &&
            !!bounds &&
            boxes.every(
              box =>
                !!box &&
                box.x >= bounds.x &&
                box.x + box.width <= bounds.x + bounds.width
            )
          );
        })
        .toBe(true);
    }
  }
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

test('minute bars fit their container and show readable time ticks at wide and narrow widths', async ({
  page,
}) => {
  await page.goto('/chart-legends?minute-bars');
  await page.addStyleTag({
    content: '::-webkit-scrollbar { width: 15px; height: 15px; }',
  });
  const chart = page.getByRole('region', {
    name: 'Minute bars basic example',
    exact: true,
  });
  for (const width of [1280, 996, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await chart.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const scroll = chart.locator('.altertable-selectable-bars-scroll');
        return scroll.evaluate(
          element => element.scrollWidth <= element.clientWidth
        );
      })
      .toBe(true);
    const widths = await chart
      .locator('.altertable-selectable-bars-scroll')
      .evaluate(async element => {
        const samples: number[] = [];
        for (let frame = 0; frame < 30; frame++) {
          await new Promise(requestAnimationFrame);
          samples.push(element.clientWidth);
        }
        return samples;
      });
    expect(new Set(widths).size).toBe(1);
    const labels = chart.locator('[title^="12:"]:visible');
    const boxes = await Promise.all(
      (await labels.all()).map(label => label.boundingBox())
    );
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    expect(boxes.length).toBeLessThanOrEqual(6);
    expect(
      boxes.every(
        (box, index) =>
          !!box &&
          (index === 0 ||
            box.x >= boxes[index - 1]!.x + boxes[index - 1]!.width)
      )
    ).toBe(true);
    const plot = await chart
      .locator('.altertable-selectable-bars-plot')
      .boundingBox();
    const centers = boxes.map(box => box!.x + box!.width / 2);
    const gaps = centers
      .slice(1)
      .map((center, index) => center - centers[index]!);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
    const leftMargin = centers[0]! - plot!.x;
    const rightMargin = plot!.x + plot!.width - centers.at(-1)!;
    expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(
      plot!.width / 60 + 1
    );
    await chart
      .getByRole('button', { name: '12:37: 21 requests', exact: true })
      .hover();
    await expect
      .poll(() => page.getByRole('tooltip').textContent())
      .toContain('12:37');
    await page.keyboard.press('Escape');
  }
});

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
  await page.keyboard.press('Escape');
  await expect.poll(() => tooltip.count()).toBe(0);
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
