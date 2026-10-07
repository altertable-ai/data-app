import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('select widgets and custom elements and deliver numbered feedback through the opaque bridge', async ({
  page,
}, testInfo) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame
    .locator('button:visible')
    .filter({ hasText: /^Explore revenue$/ })
    .click({ force: true });
  await expect(frame.locator('#result')).not.toHaveText('Chart clicked');
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Compare with last year');
  await expect(frame.getByRole('combobox')).toHaveCount(0);
  const composer = await frame
    .getByRole('region', { name: 'Annotation editor' })
    .boundingBox();
  const viewport = await page.locator('iframe').boundingBox();
  expect(composer).not.toBeNull();
  expect(composer!.width).toBeLessThanOrEqual(320);
  expect(composer!.x).toBeGreaterThanOrEqual(viewport!.x);
  expect(composer!.x + composer!.width).toBeLessThanOrEqual(
    viewport!.x + viewport!.width
  );
  await page.screenshot({ path: testInfo.outputPath('annotations.png') });
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  const output = page.getByLabel('Annotation drafts', { exact: true });
  const drafts = JSON.parse((await output.textContent()) ?? '[]');
  expect(drafts[0].target.id).toBe('monthly-revenue');
  expect(drafts[0].target.queryNames).toEqual(['revenue']);
  expect(drafts[0].comment).toBe('Compare with last year');
  await frame.locator('[data-annotation-id="intro"]').click({ force: true });
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Make this shorter');
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 2', { exact: true })).toBeVisible();
  // Host drafts outlive replacement of the iframe document.
  await page
    .getByRole('button', { name: 'Change javascript' })
    .click({ position: { x: 4, y: 4 } });
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await frame
    .getByRole('button', { name: 'Explore revenue', exact: true })
    .click({ position: { x: 4, y: 4 } });
  await expect(frame.locator('#result')).toHaveText('Chart clicked');
});

test('failed delivery retains feedback and supports retry; Escape restores interaction', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations&annotation-error');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame
    .locator('[data-annotation-id="customers"]')
    .click({ force: true });
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Show active customers');
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByRole('alert')).toHaveText(
    'Could not save annotation. Try again.'
  );
  await expect(
    frame.getByRole('textbox', { name: 'Annotation text' })
  ).toHaveValue('Show active customers');
  await page.getByRole('button', { name: 'Allow annotations' }).click();
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await frame
    .getByRole('button', { name: 'Annotation selection' })
    .press('Escape');
  await expect(
    frame.getByRole('region', { name: 'Annotation editor' })
  ).toHaveCount(0);
});

test('hosts without annotation capability keep the normal toolbar', async ({
  page,
}) => {
  await page.goto('/bundle-host');
  const frame = page.frameLocator('iframe');
  await expect(
    frame.getByRole('button', { name: 'Custom toolbar action' })
  ).toBeVisible();
  await expect(
    frame.getByRole('button', { name: 'Annotate', exact: true })
  ).toHaveCount(0);
});

test('feedback freezes the displayed filters at selection while results change', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations&annotation-state');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame.locator('[data-annotation-id="revenue"]').click({ force: true });
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Compare with last year');
  await frame
    .locator('button:visible')
    .filter({ hasText: 'Change displayed period' })
    .evaluate(button => (button as HTMLElement).click());
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  const drafts = JSON.parse(
    (await page.getByLabel('Annotation drafts').textContent()) ?? '[]'
  );
  expect(drafts[0].context.displayedInput).toEqual({ period: 'last-30' });
  expect(drafts[0].context.view).toBe('updating');
  expect(drafts[0].target.text).toContain('42');
});

test('host admission failures explain how to recover without losing the comment', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations&annotation-limit');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame.locator('[data-annotation-id="intro"]').click({ force: true });
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Explain this');
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByRole('alert')).toHaveText(
    'Delete an annotation before adding another.'
  );
  await expect(
    frame.getByRole('textbox', { name: 'Annotation text' })
  ).toHaveValue('Explain this');
});

test('keyboard selection opens the floating comment and Enter adds feedback', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  const trigger = frame.getByRole('button', { name: 'Annotate', exact: true });
  await trigger.click();
  const layer = frame.getByRole('button', { name: 'Annotation selection' });
  await expect(layer).toBeFocused();
  await layer.press('ArrowRight');
  await layer.press('Enter');
  const comment = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(comment).toBeFocused();
  await comment.fill('Compare with last year');
  await comment.press('Enter');
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await expect(comment).toHaveCount(0);
});

test('click coordinates anchor the badge and the bridge carries a real PNG of the area', async ({
  page,
}, testInfo) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  const widget = frame.locator('[data-annotation-id="monthly-revenue"]');
  const rect = await widget.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  await widget.click({ force: true, position: { x: 30, y: 45 } });
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Move the legend below the chart');
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  const output = page.getByLabel('Annotation drafts', { exact: true });
  await expect(output).toContainText('Move the legend below the chart');
  const annotations = JSON.parse((await output.textContent())!);
  expect(annotations[0].context.cursor).toEqual({
    x: rect.x + 31,
    y: rect.y + 46,
  });
  expect(annotations[0].context.anchor.x).toBeCloseTo(31 / rect.width);
  expect(annotations[0].context.anchor.y).toBeCloseTo(46 / rect.height);
  const screenshot = annotations[0].context.screenshot;
  expect(screenshot.mimeType).toBe('image/png');
  expect(screenshot.width).toBeGreaterThan(0);
  expect(screenshot.height).toBeGreaterThan(0);
  const pixels = Buffer.from(screenshot.dataUrl.split(',')[1], 'base64');
  expect(pixels.byteLength).toBeLessThanOrEqual(262144);
  expect(pixels.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  );
  await writeFile(testInfo.outputPath('captured-widget.png'), pixels);
  const pin = frame.getByRole('button', { name: 'Annotation 1', exact: true });
  const position = await pin.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  const currentRect = await widget.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  expect(position.x).toBeCloseTo(
    currentRect.x + currentRect.width * annotations[0].context.anchor.x,
    0
  );
  expect(position.y).toBeCloseTo(
    currentRect.y + currentRect.height * annotations[0].context.anchor.y,
    0
  );
});

test('blank layout areas are not selectable', async ({ page }) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  const widget = frame.locator('[data-annotation-id="monthly-revenue"]');
  const bounds = await widget.boundingBox();
  const main = frame.locator('.altertable-app-main');
  const root = await main.boundingBox();
  await main.click({
    force: true,
    position: {
      x: bounds!.x - root!.x + 4,
      y: bounds!.y - root!.y + bounds!.height + 10,
    },
  });
  await expect(
    frame.getByRole('textbox', { name: 'Annotation text' })
  ).toHaveCount(0);
  await expect(frame.locator('.altertable-annotation-outline')).toHaveCount(0);
});

test('drag selects a custom screenshot region and reopens its saved outline', async ({
  page,
}, testInfo) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  const main = await frame.locator('.altertable-app-main').boundingBox();
  const iframe = await page.locator('iframe').boundingBox();
  const x = main!.x + 20;
  const y = Math.max(main!.y, iframe!.y) + 80;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 180, y + 100, { steps: 8 });
  await page.mouse.up();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await input.fill('Align this area');
  await input.press('Enter');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
  const drafts = JSON.parse(
    (await page.getByLabel('Annotation drafts').textContent()) ?? '[]'
  );
  expect(drafts[0].target.label).toBe('Selected area');
  expect(drafts[0].context.region.width).toBeGreaterThan(0);
  expect(drafts[0].context.screenshot.width).toBe(180);
  expect(drafts[0].context.screenshot.height).toBe(100);
  await writeFile(
    testInfo.outputPath('captured-region.png'),
    Buffer.from(drafts[0].context.screenshot.dataUrl.split(',')[1], 'base64')
  );
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  await expect(input).toHaveValue('Align this area');
  await expect(frame.locator('.altertable-annotation-outline')).toHaveCSS(
    'border-radius',
    '0px'
  );
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(
    frame.getByRole('button', { name: 'Annotation selection' })
  ).toBeFocused();
  await expect(frame.locator('.altertable-app-layout')).toHaveAttribute(
    'inert',
    ''
  );
});

test('annotation layer blocks app controls and Escape closes only the open editor', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  const layer = frame.getByRole('button', { name: 'Annotation selection' });
  await expect(layer).toBeFocused();
  await expect(frame.locator('.altertable-app-layout')).toHaveAttribute(
    'inert',
    ''
  );
  const action = frame
    .locator('button:visible')
    .filter({ hasText: /^Explore revenue$/ });
  expect(
    await action.evaluate(button => {
      (button as HTMLElement).focus();
      return document.activeElement === button;
    })
  ).toBe(false);
  await frame
    .locator('button:visible')
    .filter({ hasText: /^Explore revenue$/ })
    .click({ force: true });
  await expect(frame.locator('#result')).not.toHaveText('Chart clicked');
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toBeFocused();
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(layer).toBeFocused();
  await layer.press('ArrowRight');
  await layer.press('Enter');
  await expect(input).toBeFocused();
  await input.fill('Change this');
  await input.press('Escape');
  await expect(input).toHaveValue('Change this');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(layer).toBeFocused();
  await layer.press('Escape');
  await expect(layer).toHaveCount(0);
  await expect(frame.locator('.altertable-app-layout')).not.toHaveAttribute(
    'inert'
  );
  await expect(
    frame.getByRole('button', { name: 'Annotate', exact: true })
  ).toBeFocused();
});

test('custom areas support keyboard selection and Escape cancels only the area', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  const layer = frame.getByRole('button', { name: 'Annotation selection' });
  await layer.press('Shift+Enter');
  await expect(frame.locator('[data-selecting]')).toBeVisible();
  await layer.press('Escape');
  await expect(frame.locator('[data-selecting]')).toHaveCount(0);
  await expect(layer).toBeFocused();
  await layer.press('Shift+Enter');
  await layer.press('ArrowRight');
  await layer.press('Shift+ArrowDown');
  await layer.press('Enter');
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toBeFocused();
  await input.fill('Space this area evenly');
  await input.press('Enter');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
  const drafts = JSON.parse(
    (await page.getByLabel('Annotation drafts').textContent()) ?? '[]'
  );
  expect(drafts[0].context.screenshot.width).toBe(110);
  expect(drafts[0].context.screenshot.height).toBe(80);
  expect(drafts[0].context.region).toBeDefined();
});

test('custom areas can be selected with two clicks instead of dragging', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame.getByRole('button', { name: 'Select area', exact: true }).click();
  const main = await frame.locator('.altertable-app-main').boundingBox();
  await page.mouse.click(main!.x + 20, main!.y + 90);
  await page.mouse.click(main!.x + 170, main!.y + 170);
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await input.fill('Tidy this area');
  await input.press('Enter');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
  const drafts = JSON.parse(
    (await page.getByLabel('Annotation drafts').textContent()) ?? '[]'
  );
  expect(drafts[0].context.screenshot.width).toBe(150);
  expect(drafts[0].context.screenshot.height).toBe(80);
});

test('screenshot failure preserves annotation text and retry recaptures the area', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.locator('body').evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      'toDataURL'
    )!;
    Object.defineProperty(window, 'restoreScreenshotCapture', {
      configurable: true,
      value: () => {
        Object.defineProperty(
          HTMLCanvasElement.prototype,
          'toDataURL',
          original
        );
      },
    });
    HTMLCanvasElement.prototype.toDataURL = () => {
      throw new Error('Screenshot unavailable');
    };
  });
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame
    .locator('[data-annotation-id="customers"]')
    .click({ force: true });
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await input.fill('Show active customers');
  await expect(frame.getByRole('alert')).toHaveText(
    'Screenshot capture failed. Your text is preserved.'
  );
  await expect(
    frame.getByRole('button', { name: 'Add annotation', exact: true })
  ).toBeDisabled();
  await frame.locator('body').evaluate(() => {
    (
      window as unknown as Window & { restoreScreenshotCapture: () => void }
    ).restoreScreenshotCapture();
  });
  await frame.getByRole('button', { name: 'Retry screenshot' }).click();
  await expect(input).toHaveValue('Show active customers');
  await expect(
    frame.getByRole('button', { name: 'Add annotation', exact: true })
  ).toBeEnabled();
  await input.press('Enter');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
});

test('an open editor blocks background selection and uses a dashed widget outline', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame
    .locator('[data-annotation-id="customers"]')
    .click({ force: true });
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await input.fill('Keep this draft');
  const outline = frame.locator('.altertable-annotation-outline');
  const initial = await outline.boundingBox();
  await frame
    .locator('[data-annotation-id="monthly-revenue"]')
    .click({ force: true });
  await expect(input).toHaveValue('Keep this draft');
  await expect(input).toBeFocused();
  await expect(outline).toHaveCSS('border-style', 'dashed');
  expect(await outline.boundingBox()).toEqual(initial);
  await expect(
    frame.getByRole('button', { name: 'Select area', exact: true })
  ).toHaveCount(0);
});
