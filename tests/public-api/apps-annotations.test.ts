import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

test('a host without annotation capability preserves the normal reader toolbar', async ({
  page,
}) => {
  await page.goto('/annotations-host');
  const app = page.frameLocator('iframe');
  await expect
    .poll(() =>
      app
        .getByRole('heading', { name: 'Revenue by month', exact: true })
        .isVisible()
    )
    .toBe(true);
  expect(
    await app.getByRole('button', { name: 'Annotate', exact: true }).count()
  ).toBe(0);
});

for (const failure of [false, true]) {
  test(`a reader delivers screenshot-backed feedback through the opaque bridge${failure ? ' after retrying a rejected draft' : ''}`, async ({
    page,
  }) => {
    await page.goto(
      `/annotations-host?annotations${failure ? '&annotation-error' : ''}`
    );
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: 'Annotate', exact: true }).click();
    const selection = app.getByRole('button', {
      name: 'Annotation selection',
      exact: true,
    });
    await selection.press('ArrowRight');
    await selection.press('Enter');
    const comment = app.getByRole('textbox', {
      name: 'Annotation text',
      exact: true,
    });
    await comment.fill('Compare with last year');
    await app
      .getByRole('button', { name: 'Add annotation', exact: true })
      .click();
    if (failure) {
      await expect
        .poll(() => app.getByRole('alert').textContent())
        .toContain('Could not save annotation. Try again.');
      expect(await comment.inputValue()).toBe('Compare with last year');
      await page
        .getByRole('button', { name: 'Allow annotations', exact: true })
        .click();
      await app
        .getByRole('button', { name: 'Add annotation', exact: true })
        .click();
    }
    const output = page.getByRole('status', {
      name: 'Annotation drafts',
      exact: true,
    });
    await expect
      .poll(async () => JSON.parse((await output.textContent()) || '[]').length)
      .toBe(1);
    const [draft] = JSON.parse((await output.textContent())!);
    expect(draft.comment).toBe('Compare with last year');
    expect(draft.target.label).toBeTruthy();
    expect(draft.context.screenshot).toMatchObject({
      mimeType: 'image/png',
      dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
    });
    expect(draft.context.screenshot.width).toBeGreaterThan(0);
    expect(draft.context.screenshot.height).toBeGreaterThan(0);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Annotation 1', exact: true })
          .isVisible()
      )
      .toBe(true);
    await selection.press('Escape');
    await page
      .getByRole('button', { name: 'Replace app', exact: true })
      .click();
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Annotation 1', exact: true })
          .isVisible()
      )
      .toBe(true);
  });
}

test('feedback retains the displayed input while a newer filter is still loading', async ({
  page,
}) => {
  await page.goto('/annotations-host?annotations&annotation-state');
  const app = page.frameLocator('iframe');
  await expect
    .poll(() =>
      app
        .getByRole('status')
        .filter({ hasText: /Showing last-30/ })
        .isVisible()
    )
    .toBe(true);
  await app.getByRole('button', { name: 'Annotate', exact: true }).click();
  const selection = app.getByRole('button', {
    name: 'Annotation selection',
    exact: true,
  });
  await selection.press('ArrowRight');
  await selection.press('Enter');
  await app
    .getByRole('textbox', { name: 'Annotation text', exact: true })
    .fill('Keep this displayed period');
  await app
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  const output = page.getByRole('status', {
    name: 'Annotation drafts',
    exact: true,
  });
  await expect
    .poll(async () => JSON.parse((await output.textContent()) || '[]').length)
    .toBe(1);
  const [draft] = JSON.parse((await output.textContent())!);
  expect(draft.context.displayedInput).toEqual({ period: 'last-30' });
  expect(draft.context.view).toBe('updating');
  expect(draft.target.text).toContain('42');
});
