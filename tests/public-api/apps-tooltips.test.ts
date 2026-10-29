import { describe, expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

test('keyboard focus preserves descriptions, Escape dismisses, and activation recovers', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const first = page.getByRole('button', { name: 'First', exact: true });
  const tooltip = page.getByRole('tooltip');
  await first.waitFor({ state: 'visible' });
  await page.keyboard.press('Tab');
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  const id = await tooltip.getAttribute('id');
  expect(await first.getAttribute('aria-describedby')).toBe(
    `existing-description ${id}`
  );
  await page.keyboard.press('Escape');
  await expect.poll(() => tooltip.count()).toBe(0);
  expect(await first.getAttribute('aria-describedby')).toBe(
    'existing-description'
  );
  expect(
    await first.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect.poll(() => tooltip.textContent()).toBe('Second hint');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  await first.click();
  await expect.poll(() => tooltip.count()).toBe(0);
  expect(
    await page.getByRole('status', { name: 'Presses' }).textContent()
  ).toBe('1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  await page.getByRole('button', { name: 'Information', exact: true }).focus();
  await expect.poll(() => tooltip.textContent()).toBe('Custom component hint');
});

test('hover delay, safe travel onto content, dismissal, and skip window work together', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const tooltip = page.getByRole('tooltip');
  const first = page.getByRole('button', { name: 'First', exact: true });
  const second = page.getByRole('button', { name: 'Second', exact: true });
  await page.clock.install();
  await first.hover();
  await page.clock.runFor(300);
  expect(await tooltip.count()).toBe(0);
  await page.clock.runFor(250);
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  const box = (await tooltip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 10,
  });
  await page.clock.runFor(1000);
  expect(await tooltip.textContent()).toBe('First hint');
  await second.hover();
  await page.clock.runFor(20);
  await expect.poll(() => tooltip.textContent()).toBe('Second hint');
  expect(
    await tooltip.evaluate(element => getComputedStyle(element).animationName)
  ).toBe('none');
  await page.keyboard.press('Escape');
  await page.mouse.move(1, 1);
  await page.clock.runFor(400);
  await first.hover();
  await page.clock.runFor(300);
  expect(await tooltip.count()).toBe(0);
  await page.mouse.move(1, 1);
  await page.clock.runFor(600);
  expect(await tooltip.count()).toBe(0);
});

test('pressing a control cancels its pending hover without reopening on pointer movement', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const first = page.getByRole('button', { name: 'First', exact: true });
  await page.clock.install();
  await first.hover();
  await page.clock.runFor(200);
  await first.click();
  await page.clock.runFor(600);
  expect(await page.getByRole('tooltip').count()).toBe(0);
  const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.clock.runFor(600);
  expect(await page.getByRole('tooltip').count()).toBe(0);
});

test('keyboard focus keeps a hint open when the pointer leaves', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const first = page.getByRole('button', { name: 'First', exact: true });
  await first.focus();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('First hint');
  await page.clock.install();
  await first.hover();
  await page.clock.runFor(600);
  await page.mouse.move(1, 1, { steps: 10 });
  await page.clock.runFor(200);
  expect(await page.getByRole('tooltip').count()).toBe(1);
  await page.getByRole('tooltip').hover();
  await page.mouse.move(1, 1, { steps: 10 });
  await page.clock.runFor(200);
  expect(await page.getByRole('tooltip').count()).toBe(1);
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('First hint');
  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('Second hint');
});

test('clicking passive hint content preserves trigger focus and tab order', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const first = page.getByRole('button', { name: 'First', exact: true });
  const tooltip = page.getByRole('tooltip');
  await first.focus();
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  await tooltip.click();
  expect(
    await first.evaluate(element => element === document.activeElement)
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Second', exact: true })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await expect.poll(() => tooltip.textContent()).toBe('Second hint');
});

test('provider timing updates affect hover delay and skip duration without remounting controls', async ({
  page,
}) => {
  await page.goto('/tooltips');
  await page.clock.install();
  const first = page.getByRole('button', { name: 'First', exact: true });
  const tooltip = page.getByRole('tooltip');
  await first.focus();
  await expect.poll(() => tooltip.textContent()).toBe('First hint');
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const original = await first.elementHandle();
  await page
    .getByRole('button', { name: 'Use quick hints' })
    .evaluate(element => (element as HTMLButtonElement).click());
  await page.clock.runFor(20);
  expect(
    await original!.evaluate(
      element => element.isConnected && element === document.activeElement
    )
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.mouse.move(1, 1);
  await page.clock.runFor(400);
  await page.getByRole('button', { name: 'Second', exact: true }).hover();
  await page.clock.runFor(20);
  expect(await tooltip.count()).toBe(1);
  expect(await tooltip.textContent()).toBe('Second hint');
  await page.keyboard.press('Escape');
  await page.mouse.move(1, 1);
  await page.clock.runFor(1100);
  await first.hover();
  await page.clock.runFor(50);
  expect(await tooltip.count()).toBe(0);
  await page.clock.runFor(100);
  expect(await tooltip.count()).toBe(1);
  expect(await tooltip.textContent()).toBe('First hint');
});

test('text and disabled controls use a focusable wrapper and standalone tooltips need no setup', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const tooltip = page.getByRole('tooltip');
  const disabled = page.getByLabel('Disabled action', { exact: true });
  await disabled.focus();
  await expect
    .poll(() => tooltip.textContent())
    .toBe('Unavailable until data arrives');
  expect(await disabled.getAttribute('aria-describedby')).toBe(
    await tooltip.getAttribute('id')
  );
  await page.getByLabel('Text trigger', { exact: true }).focus();
  await expect.poll(() => tooltip.textContent()).toBe('Text description');
  await page.getByRole('button', { name: 'Standalone', exact: true }).focus();
  await expect.poll(() => tooltip.textContent()).toBe('Standalone hint');
});

test('removing content and unmounting cancel pending or visible hints', async ({
  page,
}) => {
  await page.goto('/tooltips');
  const tooltip = page.getByRole('tooltip');
  await page.getByRole('button', { name: 'Dynamic', exact: true }).focus();
  await expect.poll(() => tooltip.textContent()).toBe('Dynamic hint');
  // Change content without moving focus or the pointer off the trigger.
  await page
    .getByRole('button', { name: 'Toggle content' })
    .evaluate(element => (element as HTMLButtonElement).click());
  await expect.poll(() => tooltip.count()).toBe(0);
  await page
    .getByRole('button', { name: 'Toggle content' })
    .evaluate(element => (element as HTMLButtonElement).click());
  expect(await tooltip.count()).toBe(0);
  await page.getByRole('button', { name: 'Toggle content' }).focus();
  await page.getByRole('button', { name: 'Dynamic', exact: true }).focus();
  await expect.poll(() => tooltip.textContent()).toBe('Dynamic hint');
  await page.mouse.move(1, 1);
  await page.getByRole('button', { name: 'Toggle content' }).focus();
  await page.clock.install();
  await page.clock.runFor(400);
  await page.getByRole('button', { name: 'Unmountable', exact: true }).hover();
  await page
    .getByRole('button', { name: 'Toggle trigger' })
    .evaluate(element => (element as HTMLButtonElement).click());
  await page.clock.runFor(1000);
  expect(await tooltip.count()).toBe(0);
});

test('unmounting an open hint releases the shared instant-hover window', async ({
  page,
}) => {
  await page.goto('/tooltips');
  await page.clock.install();
  await page.getByRole('button', { name: 'Unmountable', exact: true }).focus();
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('Unmountable hint');
  await page
    .getByRole('button', { name: 'Toggle trigger' })
    .evaluate(element => (element as HTMLButtonElement).click());
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'First', exact: true }).hover();
  await page.clock.runFor(100);
  expect(await page.getByRole('tooltip').count()).toBe(0);
  await page.clock.runFor(500);
  await expect
    .poll(() => page.getByRole('tooltip').textContent())
    .toBe('First hint');
});

test('portals escape clipping and remain inside the native modal top layer', async ({
  page,
}) => {
  await page.goto('/tooltips');
  await page.getByRole('button', { name: 'Portal', exact: true }).focus();
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Portal destination' })
        .getByRole('tooltip')
        .textContent()
    )
    .toBe('Outside the clipping container');
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tooltip dialog' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect
    .poll(() => dialog.getByRole('tooltip').textContent())
    .toBe('Inside the modal');
  const box = (await dialog.getByRole('tooltip').boundingBox())!;
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('[role="tooltip"]') !== null,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    )
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => dialog.getByRole('tooltip').count()).toBe(0);
  expect(await dialog.isVisible()).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => dialog.isVisible()).toBe(false);
});

for (const theme of ['light', 'dark']) {
  describe.each([375, 1280])(`tooltip containment (${theme}, %ipx)`, width => {
    test('long content wraps, flips above the edge, and respects reduced motion', async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/tooltips');
      await page.evaluate(theme => {
        document.documentElement.dataset.atblTheme = theme;
      }, theme);
      const trigger = page.getByRole('button', { name: 'Edge', exact: true });
      await trigger.focus();
      const tooltip = page.getByRole('tooltip');
      await expect.poll(() => tooltip.isVisible()).toBe(true);
      await expect
        .poll(async () => (await tooltip.boundingBox())!.x)
        .toBeGreaterThanOrEqual(11);
      const box = (await tooltip.boundingBox())!;
      const anchor = (await trigger.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width - 11);
      expect(box.y + box.height).toBeLessThan(anchor.y);
      expect(
        await tooltip.evaluate(
          element => element.scrollWidth <= element.clientWidth
        )
      ).toBe(true);
      const styles = await tooltip.evaluate(element => ({
        background: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(element).color,
        animation: getComputedStyle(element).animationName,
      }));
      expect(styles.background).not.toBe(styles.color);
      expect(styles.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(styles.animation).toBe('none');
    });
  });
}

test('touch activation performs the action without leaving a hover hint', async ({
  mobilePage: page,
}) => {
  await page.goto('/tooltips');
  await page.getByRole('button', { name: 'First', exact: true }).tap();
  expect(
    await page.getByRole('status', { name: 'Presses' }).textContent()
  ).toBe('1');
  await page.clock.install();
  await page.clock.runFor(1000);
  expect(await page.getByRole('tooltip').count()).toBe(0);
});
