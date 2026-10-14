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
