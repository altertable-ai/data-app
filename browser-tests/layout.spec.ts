import { expect, test } from '@playwright/test';

// These checks set iframe widths explicitly and do not depend on touch input.
test.skip(
  ({ isMobile }) => isMobile,
  'Run geometry checks once per explicit width.'
);

for (const width of [375, 1280]) {
  for (const state of ['ready', 'loading', 'empty', 'error', 'stale']) {
    test(`layout spacing at ${width}px in ${state}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/layout?state=${state}`);
      const app = page.frameLocator('iframe');
      const sections = app.getByTestId('sections');
      await expect(sections).toBeVisible();
      const geometry = await sections.evaluate(element => {
        const gap = parseFloat(getComputedStyle(element).rowGap);
        const body = element.closest('.altertable-app-body')!;
        const main = element.closest('main')!;
        const mainRect = main.getBoundingClientRect();
        const rects = [...element.children].map(child =>
          child.getBoundingClientRect()
        );
        const following = element.nextElementSibling!.getBoundingClientRect();
        return {
          gap,
          gaps: rects
            .slice(1)
            .map((rect, index) => rect.top - rects[index]!.bottom),
          mainGap: parseFloat(getComputedStyle(main).rowGap),
          bodyGap: parseFloat(getComputedStyle(body).rowGap),
          followingGap: following.top - element.getBoundingClientRect().bottom,
          gutter: mainRect.left,
          mainWidth: mainRect.width,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.gap).toBe(geometry.mainGap);
      expect(geometry.bodyGap).toBe(geometry.mainGap);
      expect(Math.abs(geometry.followingGap - geometry.bodyGap)).toBeLessThan(
        1
      );
      for (const gap of geometry.gaps)
        expect(Math.abs(gap - geometry.gap)).toBeLessThan(1);
      expect(geometry.mainWidth).toBeLessThanOrEqual(960);
      expect(geometry.gutter).toBeGreaterThanOrEqual(width <= 600 ? 16 : 24);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
      if (['ready', 'loading', 'stale'].includes(state)) {
        const grid = app.getByTestId('cards');
        await expect(grid).toHaveCSS('gap', `${geometry.gap}px`);
        const rects = await grid.evaluate(element =>
          [...element.children].map(child => {
            const rect = child.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
            };
          })
        );
        if (width < 768) {
          expect(rects[0]!.x).toBe(rects[1]!.x);
          expect(
            Math.abs(rects[1]!.y - rects[0]!.bottom - geometry.gap)
          ).toBeLessThan(1);
        } else {
          expect(rects[0]!.y).toBe(rects[1]!.y);
          expect(
            Math.abs(rects[1]!.x - rects[0]!.right - geometry.gap)
          ).toBeLessThan(1);
          expect(rects[0]!.width).toBeGreaterThan(rects[1]!.width);
        }
      }
      if (state === 'ready')
        await page.screenshot({
          path: test.info().outputPath(`layout-${width}.png`),
        });
    });
  }
}

test('two-column spans collapse before a second track fits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/layout?span&density=spacious');
  const grid = page.frameLocator('iframe').getByTestId('cards');
  for (const [size, threshold] of [
    ['compact', 414],
    ['regular', 510],
    ['wide', 670],
  ] as const) {
    for (const width of [threshold - 1, threshold]) {
      await grid.evaluate(
        (element, options) => {
          element.setAttribute('data-min-item-width', options.size);
          (element as HTMLElement).style.width = `${options.width}px`;
        },
        { size, width }
      );
      const geometry = await grid.evaluate(element => {
        const gridRect = element.getBoundingClientRect();
        const [first, second] = [...element.children].map(child =>
          child.getBoundingClientRect()
        );
        return {
          gridWidth: gridRect.width,
          firstWidth: first!.width,
          secondWidth: second!.width,
          rowGap: second!.top - first!.bottom,
          gap: parseFloat(getComputedStyle(element).gap),
          overflow: element.scrollWidth - element.clientWidth,
        };
      });
      expect(geometry.overflow, `${size} at ${width}px`).toBeLessThan(1);
      expect(Math.abs(geometry.firstWidth - geometry.gridWidth)).toBeLessThan(
        1
      );
      expect(Math.abs(geometry.rowGap - geometry.gap)).toBeLessThan(1);
      if (width < threshold)
        expect(
          Math.abs(geometry.secondWidth - geometry.gridWidth)
        ).toBeLessThan(1);
      else
        expect(
          Math.abs(2 * geometry.secondWidth + geometry.gap - geometry.gridWidth)
        ).toBeLessThan(1);
    }
  }
});

test('spans follow fitting tracks at custom public gap boundaries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/layout?span');
  const grid = page.frameLocator('iframe').getByTestId('cards');
  for (const [size, minimum] of [
    ['compact', 192],
    ['regular', 240],
    ['wide', 320],
  ] as const) {
    for (const columns of [2, 3, 4]) {
      for (const [gapName, gap] of [
        ['sm', 0],
        ['md', 24],
        ['lg', 80],
      ] as const) {
        for (const width of [
          2 * minimum + gap - 1,
          2 * minimum + gap - 0.01,
          2 * minimum + gap,
          3 * minimum + 2 * gap - 1,
          3 * minimum + 2 * gap,
        ]) {
          await grid.evaluate(
            (element, options) => {
              element.setAttribute('data-min-item-width', options.size);
              element.setAttribute('data-columns', String(options.columns));
              element.setAttribute('data-gap', options.gapName);
              const style = (element as HTMLElement).style;
              style.width = `${options.width}px`;
              for (const name of [
                '--atbl-layout-gap',
                '--atbl-space-sm',
                '--atbl-space-md',
              ])
                style.removeProperty(name);
              style.setProperty(
                options.gapName === 'lg'
                  ? '--atbl-layout-gap'
                  : `--atbl-space-${options.gapName}`,
                `${options.gap}px`
              );
            },
            { size, columns, gapName, gap, width }
          );
          const geometry = await grid.evaluate(element => {
            const [first, second] = [...element.children].map(child =>
              child.getBoundingClientRect()
            );
            return {
              first: first!.width,
              second: second!.width,
              columns: getComputedStyle(element).gridTemplateColumns,
              overflow: element.scrollWidth - element.clientWidth,
            };
          });
          const count = Math.min(
            columns,
            Math.floor((width + gap) / (minimum + gap))
          );
          const track = (width - (count - 1) * gap) / count;
          const context = JSON.stringify({
            size,
            columns,
            gapName,
            gap,
            width,
            geometry,
          });
          expect(geometry.overflow, context).toBeLessThan(1);
          expect(geometry.first, context).toBeCloseTo(
            count === 1 ? width : 2 * track + gap,
            0
          );
          expect(geometry.second, context).toBeCloseTo(
            count === 1 || (columns === 3 && count < 3) ? width : track,
            0
          );
        }
      }
    }
  }
});
