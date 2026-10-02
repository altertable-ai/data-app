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
    .getByRole('textbox', { name: 'What should change?' })
    .fill('Compare with last year');
  await page.screenshot({ path: testInfo.outputPath('annotations.png') });
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  const output = page.getByLabel('Annotation drafts', { exact: true });
  const drafts = JSON.parse((await output.textContent()) ?? '[]');
  expect(drafts[0].target.id).toBe('monthly-revenue');
  expect(drafts[0].target.queryNames).toEqual(['revenue']);
  expect(drafts[0].comment).toBe('Compare with last year');
  await frame
    .getByRole('combobox', { name: 'Element to annotate' })
    .selectOption('intro');
  await frame
    .getByRole('textbox', { name: 'What should change?' })
    .fill('Make this shorter');
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
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
  await frame
    .getByRole('combobox', { name: 'Element to annotate' })
    .selectOption('customers');
  await frame
    .getByRole('textbox', { name: 'What should change?' })
    .fill('Show active customers');
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
    .click();
  await expect(frame.getByRole('alert')).toHaveText(
    'Could not add feedback. Try again.'
  );
  await expect(
    frame.getByRole('textbox', { name: 'What should change?' })
  ).toHaveValue('Show active customers');
  await page.getByRole('button', { name: 'Allow feedback' }).click();
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
    .click();
  await expect(frame.getByLabel('Annotation 1', { exact: true })).toBeVisible();
  await frame
    .getByRole('combobox', { name: 'Element to annotate' })
    .press('Escape');
  await expect(frame.getByRole('region', { name: 'Annotate app' })).toHaveCount(
    0
  );
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
  await frame
    .getByRole('combobox', { name: 'Element to annotate' })
    .selectOption('revenue');
  await frame
    .getByRole('textbox', { name: 'What should change?' })
    .fill('Compare with last year');
  await frame.getByRole('button', { name: 'Change displayed period' }).click();
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
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
  await frame
    .getByRole('combobox', { name: 'Element to annotate' })
    .selectOption('intro');
  await frame
    .getByRole('textbox', { name: 'What should change?' })
    .fill('Explain this');
  await frame
    .getByRole('button', { name: 'Add feedback', exact: true })
    .click();
  await expect(frame.getByRole('alert')).toHaveText(
    'Remove an annotation before adding more feedback.'
  );
  await expect(
    frame.getByRole('textbox', { name: 'What should change?' })
  ).toHaveValue('Explain this');
});
