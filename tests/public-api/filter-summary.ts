import { expect } from 'vitest';
import type { Page } from 'playwright';

/** Use a scrollable viewport to exercise the floating summary rather than toolbar chips. */
export async function scrollPastToolbar(page: Page) {
  const width = page.viewportSize()!.width;
  await page.setViewportSize({ width, height: 320 });
  const toolbar = page.getByRole('group', {
    name: 'View controls',
    exact: true,
  });
  await toolbar.waitFor();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  await expect
    .poll(() =>
      toolbar.evaluate(element => element.getBoundingClientRect().bottom)
    )
    .toBeLessThanOrEqual(0);
  await page
    .getByRole('group', { name: 'Active filters', exact: true })
    .waitFor();
}
