import { expect, test } from '@playwright/test';

test('styles require explicit injection, respect CSP and install once per document', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/styles');
  const styles = page.locator('style[data-altertable-styles]');
  await expect(styles).toHaveCount(0);
  await expect(page.locator('.altertable-grid')).toHaveCSS('display', 'block');
  await page.getByRole('button', { name: 'Inject styles' }).click();
  await expect(styles).toHaveCount(1);
  expect(
    await styles.evaluate(element => (element as HTMLStyleElement).nonce)
  ).toBe('styles-test');
  await expect(page.locator('.altertable-grid')).toHaveCSS('display', 'grid');
  await page.getByRole('button', { name: 'Inject styles' }).click();
  await expect(styles).toHaveCount(1);
  await page.getByRole('button', { name: 'Style iframe' }).click();
  await expect(
    page.frameLocator('iframe').locator('style[data-altertable-styles]')
  ).toHaveCount(1);
  await expect(styles).toHaveCount(1);
  expect(errors).toEqual([]);
});
