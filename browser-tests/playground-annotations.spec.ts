import { expect, test, type Page } from '@playwright/test';

async function openPlayground(page: Page) {
  await page.route('**/__test/playground', async route => {
    const bundle = await page.request.get('/__test/bundle');
    await route.fulfill({
      body: await bundle.text(),
      contentType: 'text/javascript',
    });
  });
  await page.goto('/playground');
  const trigger = page.getByRole('button', { name: 'Annotate', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  return page.frameLocator('iframe');
}
async function addAnnotation(page: Page, id: string, text: string) {
  const frame = page.frameLocator('iframe');
  await frame.locator(`[data-annotation-id="${id}"]`).click();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Send annotations', exact: true })
  ).toBeEnabled();
}
async function review(page: Page) {
  await page
    .getByRole('button', { name: 'Review annotations', exact: true })
    .click();
  return page.getByRole('dialog', { name: 'Review annotations' });
}

test('bottom bar reviews, focuses, hides and deletes saved annotations', async ({
  page,
}, testInfo) => {
  const frame = await openPlayground(page);
  const bar = page.getByRole('toolbar', { name: 'Annotations', exact: true });
  await expect(bar).toHaveCount(0);
  await expect(frame.locator('.altertable-annotation-hint')).toBeVisible();
  await expect(
    frame.getByRole('button', { name: 'Annotate', exact: true })
  ).toHaveCount(0);
  await addAnnotation(page, 'monthly-revenue', 'Compare with last year');
  await addAnnotation(page, 'customers', 'Show active customers');
  await expect(bar).toContainText('Annotating · 2');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Hide annotation pins', exact: true })
    .click();
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Focus annotation', exact: true })
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Show annotation pins', exact: true })
    .click();
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  await expect(
    frame.getByRole('textbox', { name: 'Annotation text' })
  ).toHaveValue('Compare with last year');
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toBeVisible();
  const panel = await review(page);
  await expect(panel.getByLabel('Annotation drafts')).toContainText(
    'Show active customers'
  );
  const row = await panel
    .locator('.altertable-annotation-bar-row')
    .first()
    .boundingBox();
  const remove = await panel
    .getByRole('button', { name: 'Delete annotation 1', exact: true })
    .boundingBox();
  expect(
    Math.abs(remove!.y + remove!.height / 2 - row!.y - row!.height / 2)
  ).toBeLessThan(1);
  await page.screenshot({
    path: testInfo.outputPath('annotation-bar-review.png'),
  });
  await panel
    .getByRole('button', { name: 'Delete annotation 1', exact: true })
    .click();
  await expect(bar).toContainText('Annotating · 1');
  await panel
    .getByRole('button', { name: 'Open annotation 1', exact: true })
    .click();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toHaveValue('Show active customers');
  await input.press('Escape');
  await expect(bar).toHaveCount(0);
  await page.getByRole('button', { name: 'Annotate', exact: true }).click();
  await page
    .getByRole('button', { name: 'Discard all annotations', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', {
    name: 'Discard all pending annotations?',
  });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByRole('button', { name: 'Cancel', exact: true })
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('annotation-discard.png'),
    animations: 'disabled',
  });
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(bar).toContainText('Annotating · 1');
  await page
    .getByRole('button', { name: 'Discard all annotations', exact: true })
    .click();
  await confirmation
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
  await expect(bar).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Annotate', exact: true })
  ).toHaveAttribute('aria-pressed', 'false');
});

test('unsaved input gates batch Send and only dirty edits require two Escapes', async ({
  page,
}) => {
  const frame = await openPlayground(page);
  await addAnnotation(page, 'monthly-revenue', 'Compare last year');
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toHaveValue('Compare last year');
  await expect(
    page.getByRole('button', { name: 'Send annotations', exact: true })
  ).toBeEnabled();
  await input.fill('Unsaved edit');
  await expect(
    page.getByRole('button', { name: 'Send annotations', exact: true })
  ).toBeDisabled();
  await input.press('Escape');
  await expect(
    frame.getByRole('region', { name: 'Annotation editor' })
  ).toHaveCSS('animation-name', 'annotation-shake');
  await expect(input).toHaveValue('Unsaved edit');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await page.getByRole('button', { name: 'Annotate', exact: true }).click();
  const panel = await review(page);
  await panel
    .getByRole('button', { name: 'Open annotation 1', exact: true })
    .click();
  await expect(input).toHaveValue('Compare last year');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
});

test('batch Send calls outer host API, preserves drafts on failure and retries the snapshot', async ({
  page,
}, testInfo) => {
  const submitted: unknown[] = [];
  let allowSubmission = false;
  await page.route('**/api/annotations', async route => {
    submitted.push(route.request().postDataJSON());
    await route.fulfill({
      status: allowSubmission ? 200 : 503,
      contentType: 'application/json',
      body: JSON.stringify({ acceptedCount: 2 }),
    });
  });
  const frame = await openPlayground(page);
  await addAnnotation(page, 'monthly-revenue', 'Compare with last year');
  await addAnnotation(page, 'customers', 'Show active customers');
  const send = page.getByRole('button', {
    name: 'Send annotations',
    exact: true,
  });
  await send.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Could not send annotations. Try again.'
  );
  await expect(
    page.getByRole('toolbar', { name: 'Annotations', exact: true })
  ).toContainText('Annotating · 2');
  await expect(
    frame.getByRole('button', { name: 'Annotation 2', exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('annotation-send-retry.png'),
  });
  allowSubmission = true;
  await send.click();
  await expect(page.getByLabel('Annotation submission')).toHaveText(
    'Sent 2 annotations to the preview host.'
  );
  await expect(
    page.getByRole('toolbar', { name: 'Annotations', exact: true })
  ).toHaveCount(0);
  expect(submitted).toHaveLength(2);
  expect(submitted[1]).toEqual(submitted[0]);
  const batch = submitted[0] as {
    annotations: {
      id: string;
      comment: string;
      target: { id: string; queryNames: string[] };
    }[];
  };
  expect(batch.annotations.map(annotation => annotation.comment)).toEqual([
    'Compare with last year',
    'Show active customers',
  ]);
  expect(batch.annotations[0]!.target.queryNames).toEqual(['revenue']);
  await page.getByRole('button', { name: 'Annotate', exact: true }).click();
  await expect(
    page.getByRole('toolbar', { name: 'Annotations', exact: true })
  ).toHaveCount(0);
});

test('bar matches inverse theme, stays within viewport and moves by keyboard', async ({
  page,
}, testInfo) => {
  const frame = await openPlayground(page);
  await addAnnotation(page, 'monthly-revenue', 'Compare last year');
  const bar = page.getByRole('toolbar', { name: 'Annotations', exact: true });
  const viewport = page.viewportSize()!;
  const before = await bar.boundingBox();
  expect(before!.y).toBeGreaterThan(viewport.height / 2);
  expect(before!.x).toBeGreaterThanOrEqual(0);
  expect(before!.x + before!.width).toBeLessThanOrEqual(viewport.width);
  await page
    .getByRole('button', { name: 'Move annotation bar', exact: true })
    .press('ArrowUp');
  const after = await bar.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y - 10, 0);
  await expect(bar).toHaveCSS('background-color', 'rgb(242, 243, 244)');
  await page.screenshot({
    path: testInfo.outputPath('annotation-bar-dark.png'),
  });
  await page
    .getByRole('button', { name: 'Switch to light theme', exact: true })
    .click();
  await expect(bar).toHaveCSS('background-color', 'rgb(32, 35, 38)');
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toHaveAttribute(
    'placeholder',
    'Describe what to change…'
  );
  await expect(
    frame.getByRole('button', { name: 'Save annotation', exact: true })
  ).toHaveCSS('border-radius', '50%');
  await page.screenshot({
    path: testInfo.outputPath('annotation-bar-light.png'),
  });
});

test('submission locks editor mutations until the host responds', async ({
  page,
}) => {
  let finishRequest: (() => Promise<void>) | undefined;
  let requestArrived: (() => void) | undefined;
  const received = new Promise<void>(resolve => {
    requestArrived = resolve;
  });
  await page.route('**/api/annotations', async route => {
    finishRequest = () => route.fulfill({ status: 503, body: 'Try again' });
    requestArrived?.();
  });
  const frame = await openPlayground(page);
  await addAnnotation(page, 'monthly-revenue', 'Compare last year');
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(input).toHaveValue('Compare last year');
  await page
    .getByRole('button', { name: 'Send annotations', exact: true })
    .click();
  await received;
  await expect(input).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Discard all annotations', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Exit annotation mode', exact: true })
  ).toBeDisabled();
  await finishRequest!();
  await expect(page.getByRole('alert')).toHaveText(
    'Could not send annotations. Try again.'
  );
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue('Compare last year');
});

test('hovering never shifts controls and both themes keep readable contrast', async ({
  page,
}) => {
  await openPlayground(page);
  await addAnnotation(page, 'monthly-revenue', 'Compare last year');
  const bar = page.getByRole('toolbar', { name: 'Annotations', exact: true });
  function luminance(channels: number[]) {
    const rgb = channels.map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  }
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page
        .getByRole('button', { name: 'Switch to light theme', exact: true })
        .click();
    const buttons = bar.getByRole('button');
    const before = await buttons.evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })
    );
    for (const button of await buttons.all()) {
      await button.hover();
      const after = await buttons.evaluateAll(elements =>
        elements.map(element => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        })
      );
      expect(after).toEqual(before);
      const colors = await button.evaluate(element => {
        const style = getComputedStyle(element);
        const parent = element.closest('[role=toolbar]')!;
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d')!;
        context.fillStyle = getComputedStyle(parent).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = style.backgroundColor;
        context.fillRect(0, 0, 1, 1);
        const background = [...context.getImageData(0, 0, 1, 1).data].slice(
          0,
          3
        );
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = style.color;
        context.fillRect(0, 0, 1, 1);
        const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(
          0,
          3
        );
        return {
          label: element.getAttribute('aria-label'),
          foreground,
          background,
        };
      });
      const first = luminance(colors.foreground);
      const second = luminance(colors.background);
      expect(
        (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
        JSON.stringify({ theme, ...colors })
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});
