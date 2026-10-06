import { expect, test } from '@playwright/test';

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
  const comment = frame.getByRole('textbox', { name: 'What should change?' });
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
    frame.getByText('Click an element to annotate · Esc to exit')
  ).toBeVisible();
  await annotate.click();
  await expect(
    frame.getByText('Click an element to annotate · Esc to exit')
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Standalone preview' }).click();
  await expect(annotate).toBeDisabled();
});
