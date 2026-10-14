import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

for (const chart of ['line', 'area', 'pie']) {
  test(`${chart} items share detail menus, primary actions, and keyboard focus recovery`, async ({
    page,
  }) => {
    await page.goto(`/exploration-app?chart=${chart}`);
    const trigger = page.getByRole('button', { name: /^Explore: Europe:/ });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu', {
      name: 'Europe actions',
      exact: true,
    });
    await menu.waitFor();
    await expect
      .poll(() =>
        menu.evaluate(element => element.contains(document.activeElement))
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        trigger.evaluate(element => element === document.activeElement)
      )
      .toBe(true);
    await trigger.click();
    await page
      .getByRole('menuitem', { name: 'View orders', exact: true })
      .click();
    const detail = page.getByRole('dialog', {
      name: 'Contributing orders',
      exact: true,
    });
    await expect.poll(() => detail.getByRole('row').count()).toBe(4);
    await page.keyboard.press('Escape');
    await detail.waitFor({ state: 'hidden' });
    await expect
      .poll(() =>
        trigger.evaluate(element => element === document.activeElement)
      )
      .toBe(true);

    await page.goto(`/exploration-app?chart=${chart}&primary`);
    await page.getByRole('button', { name: /^View orders: Europe:/ }).click();
    await expect.poll(() => detail.getByRole('row').count()).toBe(4);
    await page.keyboard.press('Escape');
    await detail.waitFor({ state: 'hidden' });
    const more = page
      .getByRole('region', { name: 'Geographic revenue', exact: true })
      .getByRole('button', {
        name: 'Europe actions',
        exact: true,
      });
    await more.click();
    await menu.waitFor();
    await expect
      .poll(() =>
        menu.evaluate(element => element.contains(document.activeElement))
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect
      .poll(() => more.evaluate(element => element === document.activeElement))
      .toBe(true);

    await page.goto(`/exploration-app?chart=${chart}&readonly`);
    const inert = page.getByRole('button', { name: /^Europe:/ });
    await expect.poll(() => inert.getAttribute('tabindex')).toBe('-1');
    await inert.click();
    expect(await page.getByRole('dialog').count()).toBe(0);
    expect(await page.getByRole('menu').count()).toBe(0);
  });
}

test('pie slices activate the same menu and primary detail as their legend controls', async ({
  page,
  mobilePage,
}) => {
  for (const current of [page, mobilePage]) {
    for (const primary of [false, true]) {
      await current.goto(
        `/exploration-app?chart=pie${primary ? '&primary' : ''}`
      );
      const chart = current.getByRole('region', {
        name: 'Geographic revenue',
        exact: true,
      });
      const legend = chart.getByRole('button', {
        name: primary ? /^View orders: Europe:/ : /^Explore: Europe:/,
      });
      await legend.waitFor();
      await chart.scrollIntoViewIfNeeded();
      // Activate an interior point in the first visible slice, using its public SVG geometry.
      const slice = chart.locator('svg').first().locator('path').first();
      const point = await slice.evaluate(element => {
        const path = element as SVGPathElement;
        const svg = path.ownerSVGElement!;
        const box = path.getBBox();
        const candidate = svg.createSVGPoint();
        for (let x = box.x + 1; x < box.x + box.width; x += 5) {
          for (let y = box.y + 1; y < box.y + box.height; y += 5) {
            candidate.x = x;
            candidate.y = y;
            if (path.isPointInFill(candidate)) {
              const screen = candidate.matrixTransform(svg.getScreenCTM()!);
              return { x: screen.x, y: screen.y };
            }
          }
        }
        throw new Error('No visible slice interior');
      });
      if (current === mobilePage)
        await current.touchscreen.tap(point.x, point.y);
      else await current.mouse.click(point.x, point.y);
      const detail = current.getByRole('dialog', {
        name: 'Contributing orders',
        exact: true,
      });
      if (!primary) {
        const menu = current.getByRole('menu', {
          name: 'Europe actions',
          exact: true,
        });
        await expect
          .poll(() =>
            menu.evaluate(element => element.contains(document.activeElement))
          )
          .toBe(true);
        await current.keyboard.press('Escape');
        await expect
          .poll(() =>
            legend.evaluate(element => element === document.activeElement)
          )
          .toBe(true);
        await legend.click();
        await current
          .getByRole('menuitem', { name: 'View orders', exact: true })
          .click();
      }
      await expect.poll(() => detail.getByRole('row').count()).toBe(4);
      await current.keyboard.press('Escape');
      await detail.waitFor({ state: 'hidden' });
      await expect
        .poll(() =>
          legend.evaluate(element => element === document.activeElement)
        )
        .toBe(true);
    }
  }
});
