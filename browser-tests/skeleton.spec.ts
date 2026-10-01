import { expect, test } from '@playwright/test';

test('startup skeleton adapts to host width, theme, and reduced motion', async ({
  page,
}) => {
  await page.goto('/skeleton');
  const status = page.getByRole('status', { name: 'Loading fixture app' });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button')).toHaveCount(0);
  const cards = page.locator('.altertable-metric-widget');
  await expect(cards).toHaveCount(3);
  const wide = await cards.evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect().y)
  );
  if (page.viewportSize()!.width >= 800) expect(new Set(wide).size).toBe(1);
  const lightBackground = await status.evaluate(
    element => getComputedStyle(element).backgroundColor
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/skeleton?dark=1&narrow=1');
  await expect(status).toBeVisible();
  const narrow = await cards.evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect().y)
  );
  expect(new Set(narrow).size).toBe(3);
  expect(
    await status.evaluate(element => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  expect(
    await status.evaluate(element => getComputedStyle(element).backgroundColor)
  ).not.toBe(lightBackground);
  expect(
    await page
      .locator('.altertable-skeleton')
      .first()
      .evaluate(element => getComputedStyle(element).animationName)
  ).not.toContain('pulse');
});

test('header and footer slots remain accessible while widget placeholders are hidden', async ({
  page,
}) => {
  await page.goto('/skeleton?header=1&footer=1');
  await expect(
    page.getByRole('heading', { name: 'Activity report' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'About this report' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  await page.goto('/skeleton');
  await expect(
    page.locator('.altertable-data-app-skeleton-header')
  ).toHaveCount(0);
  await expect(
    page.locator('.altertable-data-app-skeleton-footer')
  ).toHaveCount(0);
});
