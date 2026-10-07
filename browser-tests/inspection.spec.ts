import { expect, test } from '@playwright/test';

test('repeated subjects and inspected widgets share one sheet', async ({
  page,
}) => {
  await page.goto('/inspection-app');
  await page
    .getByRole('button', { name: 'Explore Summary', exact: true })
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  const sheet = page.getByRole('dialog', { name: 'Summary', exact: true });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: 'Explore Nested count' })
  ).toHaveCount(0);
  await sheet.getByRole('tab', { name: 'Queries', exact: true }).click();
  await expect(sheet).toContainText('SELECT 1 AS count');
  await sheet.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Update result', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Explore Repeated count', exact: true })
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await expect(
    page.getByRole('dialog', { name: 'Repeated count', exact: true })
  ).toContainText('2');
  await page.goBack();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.goForward();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
});

test('inspection headings use foreground color with a closely spaced optically aligned chevron', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(isMobile, 'Hover is a desktop interaction');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/inspection-app');
    if (colorScheme === 'dark')
      await page
        .getByRole('button', { name: 'Switch to dark theme', exact: true })
        .click();
    await expect(page.locator('html')).toHaveCSS('color-scheme', colorScheme);
    const heading = page.getByRole('button', {
      name: 'Explore Repeated count',
      exact: true,
    });
    await heading.hover();
    await expect(heading).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(heading.locator('.altertable-widget-heading-label')).toHaveCSS(
      'text-decoration-line',
      'none'
    );
    const foreground = await heading.evaluate(
      element =>
        getComputedStyle(element.closest('.altertable-data-widget')!).color
    );
    await expect(heading).toHaveCSS('color', foreground);
    const label = await heading
      .locator('.altertable-widget-heading-label')
      .boundingBox();
    const chevron = await heading.locator('svg').boundingBox();
    expect(
      Math.abs(
        label!.y + label!.height / 2 + 1 - (chevron!.y + chevron!.height / 2)
      )
    ).toBeLessThan(1);
    expect(chevron!.x - (label!.x + label!.width)).toBeCloseTo(2, 0);
    await page.screenshot({
      path: testInfo.outputPath(`data-app-heading-${colorScheme}.png`),
    });
  }
});

test('controlled inspection waits for its owner to accept opening and closing', async ({
  page,
}) => {
  await page.goto('/inspection-app?controlled');
  await page
    .getByRole('button', { name: 'Controlled inspection', exact: true })
    .click();
  await expect(page.getByTestId('inspection-requests')).toHaveText('1');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState(null, '', '?controlled&about=controlled');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByTestId('inspection-requests')).toHaveText('2');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept open', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Controlled', exact: true });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(page.getByTestId('inspection-requests')).toHaveText('3');
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole('button', { name: 'Accept close', exact: true })
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
