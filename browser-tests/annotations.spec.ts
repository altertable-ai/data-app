import { expect, test } from '@playwright/test';

test('select widgets and custom elements and deliver numbered feedback through the opaque bridge', async ({
  page,
}, testInfo) => {
  await page.goto('/bundle-host?annotations');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame
    .getByRole('button', { name: 'Explore revenue', exact: true })
    .click();
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
  await frame.locator('[data-annotation-id="intro"]').click();
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Make this shorter');
  await frame
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 2', { exact: true })).toBeVisible();
  // Host drafts outlive replacement of the iframe document.
  await page.getByRole('button', { name: 'Change javascript' }).click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await frame
    .getByRole('button', { name: 'Explore revenue', exact: true })
    .click();
  await expect(frame.locator('#result')).toHaveText('Chart clicked');
});

test('failed delivery retains feedback and supports retry; Escape restores interaction', async ({
  page,
}) => {
  await page.goto('/bundle-host?annotations&annotation-error');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Annotate', exact: true }).click();
  await frame.locator('[data-annotation-id="customers"]').click();
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
    .getByRole('button', { name: 'Annotate', exact: true })
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
  await frame.locator('[data-annotation-id="revenue"]').click();
  await frame
    .getByRole('textbox', { name: 'Annotation text' })
    .fill('Compare with last year');
  await frame.getByRole('button', { name: 'Change displayed period' }).click();
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
  await frame.locator('[data-annotation-id="intro"]').click();
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
  await trigger.press('Tab');
  await trigger.press('Enter');
  const comment = frame.getByRole('textbox', { name: 'Annotation text' });
  await expect(comment).toBeFocused();
  await comment.fill('Compare with last year');
  await comment.press('Enter');
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await expect(comment).toHaveCount(0);
});
