import { expect, test, type Locator } from '@playwright/test';

test('playground top navigation owns annotation mode and previews feedback', async ({
  page,
}, testInfo) => {
  // Use deterministic widget content; the production Orders playground uses the
  // same shell and bridge with seeded data from the dev runner.
  await page.route('**/__test/playground', async route => {
    const bundle = await page.request.get('/__test/bundle');
    await route.fulfill({
      body: await bundle.text(),
      contentType: 'text/javascript',
    });
  });
  await page.goto('/playground');
  const frame = page.frameLocator('iframe');
  const annotate = page.getByRole('button', { name: 'Annotate', exact: true });
  await expect(annotate).toBeEnabled();
  await expect(
    frame.getByRole('button', { name: 'Annotate', exact: true })
  ).toHaveCount(0);
  await annotate.click();
  await expect(annotate).toHaveAttribute('aria-pressed', 'true');
  await frame
    .getByRole('button', { name: 'Explore revenue', exact: true })
    .click();
  const comment = frame.getByRole('textbox', { name: 'Annotation text' });
  await comment.fill('Compare with last year');
  await page.screenshot({
    path: testInfo.outputPath('playground-annotation.png'),
  });
  await comment.press('Enter');
  await expect(page.getByLabel('Annotation drafts')).toContainText(
    'Compare with last year'
  );
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await frame.locator('[data-annotation-id="intro"]').click();
  await comment.press('Escape');
  await expect(annotate).toHaveAttribute('aria-pressed', 'false');
  await expect(comment).toHaveCount(0);
  await annotate.click();
  await expect(
    frame.getByText('Point at an item to annotate · Esc to exit')
  ).toBeVisible();
  await annotate.click();
  await expect(
    frame.getByText('Point at an item to annotate · Esc to exit')
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Standalone preview' }).click();
  await expect(annotate).toBeDisabled();
});

test('annotations reopen, save, delete, count, hide and protect drafts with Escape', async ({
  page,
}, testInfo) => {
  await page.route('**/__test/playground', async route => {
    const bundle = await page.request.get('/__test/bundle');
    await route.fulfill({
      body: await bundle.text(),
      contentType: 'text/javascript',
    });
  });
  await page.goto('/playground');
  const frame = page.frameLocator('iframe');
  const trigger = page.getByRole('button', { name: 'Annotate', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.focus();
  await expect(page.getByRole('tooltip')).toContainText(
    'Point at items to change the data app'
  );
  await expect(page.getByRole('tooltip').locator('kbd')).toHaveCount(1);
  const modifier = await page.evaluate(() =>
    /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent)
      ? 'Meta'
      : 'Control'
  );
  await trigger.press(`${modifier}+Shift+.`);
  await expect(trigger).toHaveAttribute('aria-pressed', 'true');
  await expect(frame.locator('.altertable-annotation-hint kbd')).toHaveText(
    'Esc'
  );
  await frame.locator('[data-annotation-id="monthly-revenue"]').click();
  const comment = frame.getByRole('textbox', { name: 'Annotation text' });
  await comment.fill('Compare last year');
  await comment.press('Escape');
  await expect(
    frame.getByRole('region', { name: 'Annotation editor' })
  ).toHaveCSS('animation-name', 'annotation-shake');
  await expect(comment).toHaveValue('Compare last year');
  await expect(trigger).toHaveAttribute('aria-pressed', 'true');
  await comment.press('Escape');
  await expect(comment).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-pressed', 'false');
  await trigger.click();
  await frame.locator('[data-annotation-id="monthly-revenue"]').click();
  await comment.fill('Compare last year');
  await comment.press('Enter');
  await expect(page.getByLabel('1 annotations', { exact: true })).toHaveText(
    '1'
  );
  await expect(page.getByLabel('Annotation drafts')).toContainText(
    'Compare last year'
  );
  await trigger.click();
  await expect(page.getByLabel('Annotation drafts')).toHaveCount(0);
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  await expect(trigger).toHaveAttribute('aria-pressed', 'true');
  await expect(comment).toHaveValue('Compare last year');
  await expect(
    frame.getByRole('button', { name: 'Cancel annotation' })
  ).toHaveCount(0);
  expect(
    await comment.evaluate(element => getComputedStyle(element).outlineStyle)
  ).toBe('none');
  await comment.press('Escape');
  await expect(comment).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-pressed', 'false');
  await trigger.click();
  await frame
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .click();
  await expect(comment).toHaveValue('Compare last year');
  await comment.fill('Compare last quarter');
  await frame.getByRole('button', { name: 'Save annotation' }).click();
  await expect(page.getByLabel('Annotation drafts')).toContainText(
    'Compare last quarter'
  );
  await expect(
    page.getByRole('button', { name: 'Open annotation 1' })
  ).toHaveCount(1);
  await frame
    .getByRole('button', { name: 'Last 7 days', exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Open annotation 1' }).click();
  await expect(comment).toHaveValue('Compare last quarter');
  await expect(
    frame.locator('[data-annotation-id="monthly-revenue"]')
  ).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath('annotation-editing.png'),
  });
  await comment.press(`${modifier}+Shift+.`);
  await expect(trigger).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Annotation drafts')).toHaveCount(0);
  await trigger.press(`${modifier}+Shift+.`);
  await expect(trigger).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Open annotation 1' }).click();
  await expect(comment).toHaveValue('Compare last quarter');
  await page.getByRole('button', { name: 'Delete annotation 1' }).click();
  await expect(comment).toHaveCount(0);
  await expect(
    frame.getByRole('button', { name: 'Annotation 1', exact: true })
  ).toHaveCount(0);
  await expect(page.getByLabel('1 annotations', { exact: true })).toHaveCount(
    0
  );
});

test('floating annotations invert the app theme and retain only unsaved changes', async ({
  page,
}, testInfo) => {
  await page.route('**/__test/playground', async route => {
    const bundle = await page.request.get('/__test/bundle');
    await route.fulfill({
      body: await bundle.text(),
      contentType: 'text/javascript',
    });
  });
  await page.goto('/playground');
  const frame = page.frameLocator('iframe');
  const trigger = page.getByRole('button', { name: 'Annotate', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const widget = frame.locator('[data-annotation-id="monthly-revenue"]');
  await widget.click();
  const editor = frame.getByRole('region', { name: 'Annotation editor' });
  const input = frame.getByRole('textbox', { name: 'Annotation text' });
  function colorOf(element: Locator) {
    return element.evaluate(node => getComputedStyle(node).color);
  }
  await expect(editor).toHaveCSS('background-color', await colorOf(widget));
  await expect(editor.locator('.altertable-annotation-icon')).toHaveCount(1);
  await expect(
    frame.getByRole('button', { name: 'Add annotation', exact: true })
  ).toHaveCSS('border-radius', '50%');
  await expect(widget).toHaveCSS('cursor', /data:image\/svg\+xml/);
  await input.fill('Compare last year');
  await input.press('Enter');
  const panel = page.getByLabel('Annotation drafts');
  await expect(panel.locator('strong')).toHaveText('Revenue by month');
  await expect(panel).toHaveCSS(
    'background-color',
    await colorOf(page.locator('.playground-host'))
  );
  await page.getByRole('button', { name: 'Open annotation 1' }).click();
  const darkBackground = await editor.evaluate(
    node => getComputedStyle(node).backgroundColor
  );
  await page.screenshot({
    path: testInfo.outputPath('annotations-on-dark.png'),
  });
  await page
    .getByRole('button', { name: 'Switch to light theme', exact: true })
    .click();
  await expect
    .poll(() => editor.evaluate(node => getComputedStyle(node).backgroundColor))
    .not.toBe(darkBackground);
  await expect(editor).toHaveCSS('background-color', await colorOf(widget));
  await expect(panel).toHaveCSS(
    'background-color',
    await colorOf(page.locator('.playground-host'))
  );
  await page.screenshot({
    path: testInfo.outputPath('annotations-on-light.png'),
  });
  await input.fill('Unsaved edit');
  await input.press('Escape');
  await expect(input).toHaveValue('Unsaved edit');
  await expect(editor).toHaveCSS('animation-name', 'annotation-shake');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await trigger.click();
  await page.getByRole('button', { name: 'Open annotation 1' }).click();
  await expect(input).toHaveValue('Compare last year');
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-pressed', 'false');
});
