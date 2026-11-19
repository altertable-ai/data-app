import type { Locator } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

/** Opacity on display:contents has no visual effect; measure the painted ancestor chain. */
function displayedOpacity(locator: Locator) {
  return locator.evaluate(element => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display !== 'contents') opacity *= Number(style.opacity);
    }
    return opacity;
  });
}

function withinBusyRegion(locator: Locator) {
  return locator.evaluate(element => !!element.closest('[aria-busy="true"]'));
}

/** Measure actual foreground and backing surface in both themes. */
function textContrast(locator: Locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    function luminance(color: string) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const channels = context.getImageData(0, 0, 1, 1).data;
      return [0.2126, 0.7152, 0.0722].reduce((value, weight, index) => {
        const s = channels[index]! / 255;
        return (
          value +
          weight * (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)
        );
      }, 0);
    }
    for (let node: Element | null = element; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background === 'rgba(0, 0, 0, 0)') continue;
      const foreground = getComputedStyle(element).color;
      const a = luminance(foreground);
      const b = luminance(background);
      return {
        background,
        foreground,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    }
    throw new Error('No painted background found');
  });
}

for (const width of [375, 1280]) {
  for (const theme of ['light', 'dark']) {
    test(`widgets retain readable data and report their own refresh at ${width}px in ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await page.goto('/loading?widgets&summary');
      if (theme === 'dark')
        await page
          .getByRole('button', { name: 'Switch to dark theme', exact: true })
          .click();

      const primary = page.getByRole('region', {
        name: 'Primary results',
        exact: true,
      });
      const metric = page.getByRole('region', {
        name: 'Primary metric',
        exact: true,
      });
      const secondary = page.getByRole('region', {
        name: 'Secondary results',
        exact: true,
      });
      const table = page.getByRole('region', {
        name: 'Secondary table',
        exact: true,
      });
      const chart = page.getByRole('region', {
        name: 'Secondary chart',
        exact: true,
      });
      const widgets = [primary, metric, secondary, table, chart];
      const toolbar = page.getByRole('group', {
        name: 'Page actions',
        exact: true,
      });
      for (const widget of widgets)
        await expect.poll(() => widget.getAttribute('aria-busy')).toBe('true');
      expect(await page.getByText('Refreshing', { exact: true }).count()).toBe(
        0
      );

      await page
        .getByRole('button', { name: 'Resolve primary', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Resolve secondary', exact: true })
        .click();
      await page.clock.runFor(50);
      const values = [
        primary.getByRole('status', { name: 'primary count', exact: true }),
        metric.getByText('7', { exact: true }),
        secondary.getByRole('status', { name: 'secondary count', exact: true }),
        table.getByRole('rowheader', { name: '7', exact: true }),
        chart.getByRole('status', {
          name: 'secondary chart value',
          exact: true,
        }),
      ];
      for (const value of values)
        await expect.poll(() => displayedOpacity(value)).toBe(1);
      const columnHeader = table.getByRole('columnheader', {
        name: 'Count',
        exact: true,
      });
      const dataText = [values[1]!, values[3]!];
      const idleColors = await Promise.all(dataText.map(textContrast));
      const idleHeader = await textContrast(columnHeader);
      const positions = await Promise.all(
        widgets.map(widget => widget.boundingBox())
      );

      await toolbar
        .getByRole('button', { name: 'Refresh data', exact: true })
        .click();
      await page.clock.runFor(50);
      const pager = table.getByRole('button', {
        name: 'Next page',
        exact: true,
      });
      expect(await pager.isEnabled()).toBe(true);
      const retained = [
        ...values,
        columnHeader,
        pager,
        secondary.getByText('Measured secondary count', { exact: true }),
        secondary.getByText('Secondary coverage', { exact: true }),
        metric.getByText('Measured primary count', { exact: true }),
      ];
      for (const value of retained)
        expect(await displayedOpacity(value)).toBe(1);
      for (const value of values)
        expect(await withinBusyRegion(value)).toBe(true);
      for (const [index, value] of dataText.entries()) {
        const refreshing = await textContrast(value);
        const idle = idleColors[index]!;
        expect(refreshing.background).toBe(idle.background);
        expect(refreshing.ratio).toBeLessThan(idle.ratio);
        expect(refreshing.ratio).toBeGreaterThanOrEqual(4.5);
      }
      expect(await textContrast(columnHeader)).toEqual(idleHeader);
      for (const widget of widgets)
        expect(await displayedOpacity(widget.getByRole('heading'))).toBe(1);
      expect(await page.getByText('Loading', { exact: true }).count()).toBe(0);
      expect(await page.getByText('Refreshing', { exact: true }).count()).toBe(
        0
      );

      await page.clock.runFor(2000);
      expect(await page.getByText('Loading', { exact: true }).count()).toBe(0);
      for (const widget of widgets) {
        await expect
          .poll(() =>
            widget.getByText('Refreshing', { exact: true }).isVisible()
          )
          .toBe(true);
        const status = widget
          .getByRole('status')
          .filter({ hasText: 'Refreshing' });
        expect(await withinBusyRegion(status)).toBe(false);
      }
      expect(
        await Promise.all(widgets.map(widget => widget.boundingBox()))
      ).toEqual(positions);

      // The primary view finishes while another summary view is still running.
      await page
        .getByRole('button', { name: 'Resolve primary', exact: true })
        .click();
      await page.clock.runFor(50);
      for (const value of values.slice(0, 2))
        await expect.poll(() => withinBusyRegion(value)).toBe(false);
      for (const value of values.slice(2))
        expect(await withinBusyRegion(value)).toBe(true);
      expect(
        await toolbar
          .getByRole('button', { name: 'Cancel refresh', exact: true })
          .isVisible()
      ).toBe(true);
      expect(
        await primary.getByText('Refreshing', { exact: true }).count()
      ).toBe(0);
      await page
        .getByRole('button', { name: 'Resolve secondary', exact: true })
        .click();
      await page.clock.runFor(50);
      for (const value of values)
        await expect.poll(() => withinBusyRegion(value)).toBe(false);

      // A short refresh restarts the quiet period, and cancellation restores all data.
      await toolbar
        .getByRole('button', { name: 'Refresh data', exact: true })
        .click();
      await page.clock.runFor(500);
      expect(await page.getByText('Refreshing', { exact: true }).count()).toBe(
        0
      );
      for (const value of values)
        expect(await withinBusyRegion(value)).toBe(true);
      await toolbar
        .getByRole('button', { name: 'Cancel refresh', exact: true })
        .click();
      await page.clock.runFor(50);
      for (const value of values)
        await expect.poll(() => withinBusyRegion(value)).toBe(false);
      expect(await Promise.all(dataText.map(textContrast))).toEqual(idleColors);
      await page.clock.runFor(2500);
      expect(await page.getByText('Refreshing', { exact: true }).count()).toBe(
        0
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
    });
  }
}

test('a retry clears stale failure feedback and marks only its own view busy', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto('/loading?widgets&summary');
  const primary = page.getByRole('status', {
    name: 'primary count',
    exact: true,
  });
  const secondary = page.getByRole('status', {
    name: 'secondary count',
    exact: true,
  });
  const toolbar = page.getByRole('group', {
    name: 'Page actions',
    exact: true,
  });
  const independent = page.getByRole('region', {
    name: 'Independent section',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Resolve primary', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Resolve secondary', exact: true })
    .click();
  await page.clock.runFor(50);
  await expect.poll(() => secondary.textContent()).toBe('secondary: 7');
  await toolbar
    .getByRole('button', { name: 'Refresh data', exact: true })
    .click();
  await page.clock.runFor(50);
  await page
    .getByRole('button', { name: 'Resolve primary', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Fail secondary', exact: true })
    .click();
  await page.clock.runFor(50);
  await expect
    .poll(() => independent.getByRole('alert').isVisible())
    .toBe(true);
  expect(await displayedOpacity(secondary)).toBe(1);
  expect(await secondary.textContent()).toBe('secondary: 7');
  await independent.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.clock.runFor(50);
  await expect.poll(() => withinBusyRegion(secondary)).toBe(true);
  expect(await withinBusyRegion(primary)).toBe(false);
  expect(await independent.getByRole('alert').count()).toBe(0);
  expect(
    await independent
      .getByRole('button', { name: 'Retry', exact: true })
      .count()
  ).toBe(0);
  await page.clock.runFor(2000);
  expect(
    await independent.getByText('Refreshing', { exact: true }).count()
  ).toBe(4);
  await page
    .getByRole('button', { name: 'Resolve secondary', exact: true })
    .click();
  await page.clock.runFor(50);
  await expect.poll(() => withinBusyRegion(secondary)).toBe(false);
  expect(await independent.getByRole('alert').count()).toBe(0);
});

test('explicit status is immediate and inspection uses the running request clock', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto('/loading?widgets&summary&explicit-status');
  const manual = page.getByRole('region', {
    name: 'Manual refresh',
    exact: true,
  });
  const explicitStatus = manual
    .getByRole('status')
    .filter({ hasText: 'Refreshing' });
  await expect.poll(() => explicitStatus.isVisible()).toBe(true);
  expect(await withinBusyRegion(explicitStatus)).toBe(false);
  await page
    .getByRole('button', { name: 'Resolve primary', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Resolve secondary', exact: true })
    .click();
  await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.clock.runFor(2050);
  await page
    .getByRole('button', { name: 'Explore Secondary results', exact: true })
    .click();
  const inspectionStatus = page
    .getByRole('dialog')
    .getByRole('status')
    .filter({ hasText: 'Refreshing' });
  await expect.poll(() => inspectionStatus.isVisible()).toBe(true);
  expect(await withinBusyRegion(inspectionStatus)).toBe(false);
});

test('primary refresh failures appear while a summary request is still pending', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto('/loading?widgets&summary');
  const primary = page.getByRole('status', {
    name: 'primary count',
    exact: true,
  });
  const secondary = page.getByRole('status', {
    name: 'secondary count',
    exact: true,
  });
  const failPrimary = page.getByRole('button', {
    name: 'Fail primary',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Resolve primary', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Resolve secondary', exact: true })
    .click();
  await page.clock.runFor(50);
  await expect.poll(() => primary.textContent()).toBe('primary: 7');
  await expect.poll(() => secondary.textContent()).toBe('secondary: 7');

  await page.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await page.clock.runFor(50);
  await failPrimary.click();
  await page.clock.runFor(50);
  await expect.poll(() => withinBusyRegion(primary)).toBe(false);
  expect(await withinBusyRegion(secondary)).toBe(true);
  await page.clock.runFor(3000);
  const failure = page.getByRole('alert');
  await expect.poll(() => failure.isVisible()).toBe(true);
  expect(await failure.textContent()).toContain('Couldn’t refresh');
  expect(await primary.textContent()).toBe('primary: 7');
  expect(await withinBusyRegion(secondary)).toBe(true);

  // Retrying the primary request still hides the previous failure immediately.
  await failure.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.clock.runFor(50);
  await expect.poll(() => withinBusyRegion(primary)).toBe(true);
  expect(await failure.count()).toBe(0);
  await page.clock.runFor(3000);
  expect(await failure.count()).toBe(0);
});
