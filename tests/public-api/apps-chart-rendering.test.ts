import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';
import { readChartImage } from '@/tests/public-api/chart-image';

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
  // Pointer focus may land on an inner series; none of it shows an outline.
  const example = page.getByRole('region', {
    name: 'Inspection areas basic example',
    exact: true,
  });
  await expect
    .poll(() =>
      example.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true);
  expect(
    await example.evaluate(
      () => getComputedStyle(document.activeElement!).outlineStyle
    )
  ).toBe('none');
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      plot.evaluate(element => getComputedStyle(element).outlineStyle)
    )
    .toBe('solid');
});
