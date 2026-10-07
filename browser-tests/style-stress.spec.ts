import { expect, test } from '@playwright/test';

for (const width of [320, 375, 768, 1280]) {
  for (const enlarged of [false, true]) {
    test(`controls and exact values stay contained at ${width}px${enlarged ? ' with enlarged text' : ''}`, async ({
      page,
      isMobile,
    }) => {
      test.skip(
        isMobile,
        'Explicit viewport sizes cover responsive text stress.'
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/style-stress${enlarged ? '?dark' : ''}`);
      if (enlarged)
        await page.addStyleTag({ content: 'html { font-size: 150%; }' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
      const controls = page.locator('.altertable-variable-bar');
      const escaped = await controls.evaluate(element => {
        const outer = element.getBoundingClientRect();
        return [...element.children]
          .filter(child => {
            const inner = child.getBoundingClientRect();
            return (
              inner.width > 0 &&
              (inner.left < outer.left - 1 || inner.right > outer.right + 1)
            );
          })
          .map(child => child.className);
      });
      expect(escaped).toEqual([]);
      const wrapper = page.locator('.altertable-data-table-scroll');
      expect(
        await wrapper.evaluate(
          element => element.scrollWidth > element.clientWidth
        )
      ).toBe(true);
      await page
        .getByRole('button', {
          name: 'Choose dates Reporting dates, compared with previous period',
          exact: true,
        })
        .press('Enter');
      const popover = page.locator('.altertable-date-range-popover');
      await expect(popover).toBeVisible();
      const bounds = await popover.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      await page.keyboard.press('Escape');
      await expect(popover).not.toBeVisible();
      await page
        .getByRole('button', {
          name: 'Toggle the value loading state without removing its heading',
        })
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'A precisely formatted amount with an exceptionally long descriptive label',
        })
      ).toBeVisible();
      await expect(
        page.locator('.altertable-metric-value > .altertable-skeleton')
      ).toBeVisible();
      await page
        .getByRole('button', {
          name: 'Toggle the value loading state without removing its heading',
        })
        .click();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1
        )
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/style-stress-${width}-${enlarged ? 'enlarged' : 'default'}.png`,
        fullPage: true,
      });
    });
  }
}

test('shared selected paint overrides real menu and date-preset surfaces', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-09-30T12:00:00Z'));
  await page.goto('/style-stress');
  await page.addStyleTag({
    content: ':root { --atbl-control-selected-surface: #123456; }',
  });
  const trigger = page.getByRole('button', {
    name: /^Organization and geographic reporting region:/,
  });
  await trigger.click();
  const option = page.getByRole('option').first();
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await expect(option).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await page.getByRole('dialog').getByRole('searchbox').press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.altertable-combobox-popover')).toHaveCount(0);
  const dates = page.getByRole('button', {
    name: 'Choose dates Reporting dates, compared with previous period',
    exact: true,
  });
  await dates.press('Enter');
  await expect(page.locator('.altertable-date-range-popover')).toBeVisible();
  const preset = page.locator('.altertable-date-range-preset').first();
  await preset.click();
  await dates.press('Enter');
  await expect(preset).toHaveAttribute('aria-current', 'true');
  await expect(preset).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});
