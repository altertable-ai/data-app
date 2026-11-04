import type { Page } from 'playwright';
import { expect } from 'vitest';

/** Use a scrollable viewport to exercise the floating summary rather than toolbar chips. */
export async function scrollPastToolbar(page: Page) {
  const width = page.viewportSize()!.width;
  await page.setViewportSize({ width, height: 320 });
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  await toolbar.waitFor();
  await scrollPage(page, 'end');
  expect(
    await toolbar.evaluate(element => element.getBoundingClientRect().bottom)
  ).toBeLessThanOrEqual(0);
  await page
    .getByRole('group', { name: 'Active filters', exact: true })
    .waitFor();
}

/** Wheel the page to one edge and wait for each scroll gesture to settle. */
export async function scrollPage(page: Page, edge: 'start' | 'end') {
  // Layout can still grow after a resize, so wheel again until the edge holds.
  for (let attempt = 0; attempt < 5; attempt++) {
    const distance = await page.evaluate(
      edge =>
        edge === 'start'
          ? -window.scrollY
          : document.documentElement.scrollHeight -
            window.innerHeight -
            window.scrollY,
      edge
    );
    if (Math.abs(distance) < 1) return;
    await page.mouse.wheel(0, distance);
    await page.evaluate(
      () =>
        new Promise<void>(resolve => {
          let last = window.scrollY;
          const timer = setInterval(() => {
            if (window.scrollY === last) {
              clearInterval(timer);
              resolve();
            }
            last = window.scrollY;
          }, 100);
        })
    );
  }
}
