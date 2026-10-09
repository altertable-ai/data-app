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
    const revenueCard = await app
      .getByRole('region', { name: 'Revenue by month', exact: true })
      .boundingBox();
    await app.getByRole('button', { name: 'Annotate', exact: true }).click();
    const selection = app.getByRole('button', {
      name: 'Annotation selection',
      exact: true,
    });
    await selection.press('ArrowRight');
    await selection.dispatchEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    });
    expect(
      await app.getByRole('textbox', { name: 'Annotation text' }).count()
    ).toBe(0);
    await selection.press('Enter');
    const comment = app.getByRole('textbox', {
      name: 'Annotation text',
      exact: true,
    });
    await comment.fill('Compare with last year');
    await comment.dispatchEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    });
    expect(await comment.inputValue()).toBe('Compare with last year');
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
      await page.mouse.click(
        revenueCard!.x + revenueCard!.width / 2,
        revenueCard!.y + revenueCard!.height / 2
      );
      await comment.fill('Compare with last year');
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

test('Mod+Enter sends only from the focused annotation input and preserves drafts for retry', async ({
  page,
}) => {
  await page.goto(
    '/annotations-host?annotations&annotation-send&annotation-send-error'
  );
  const app = page.frameLocator('iframe');
  const modifier = await page.evaluate(() =>
    /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent)
      ? 'Meta'
      : 'Control'
  );
  await page.getByRole('button', { name: 'Annotate', exact: true }).click();
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
  await comment.press('Enter');
  const send = page.getByRole('button', {
    name: 'Send annotations',
    exact: true,
  });
  await expect.poll(() => send.isEnabled()).toBe(true);
  await send.hover();
  await expect
    .poll(() => page.getByRole('tooltip').locator('kbd').textContent())
    .toBe(modifier === 'Meta' ? '⌘↩' : 'Ctrl+Enter');
  await selection.press('ArrowRight');
  await selection.press(`${modifier}+Enter`);
  await send.press(`${modifier}+Enter`);
  await app
    .getByRole('button', { name: 'Annotation 1', exact: true })
    .press('Enter');
  expect(await comment.getAttribute('aria-keyshortcuts')).toBe(
    'Enter Meta+Enter Control+Enter'
  );
  await comment.fill('Unsaved edit');
  await expect.poll(() => send.isDisabled()).toBe(true);
  await comment.press(`${modifier}+Enter`);
  expect(await comment.inputValue()).toBe('Unsaved edit');
  await comment.fill('Compare with last year');
  await expect.poll(() => send.isEnabled()).toBe(true);
  await comment.press(`${modifier}+Enter`);
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toBe('Could not send annotations. Try again.');
  expect(await comment.inputValue()).toBe('Compare with last year');
  expect(
    await page.getByRole('status', { name: 'Send attempts' }).textContent()
  ).toBe('1');
  expect(await app.getByRole('dialog').count()).toBe(0);
  const drafts = page.getByRole('status', {
    name: 'Annotation drafts',
    exact: true,
  });
  const snapshot = JSON.parse((await drafts.textContent())!);
  expect(snapshot).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Allow submission', exact: true })
    .click();
  await app.getByRole('button', { name: 'Annotation 1', exact: true }).click();
  await comment.press(`${modifier}+Enter`);
  await expect
    .poll(async () => JSON.parse((await drafts.textContent())!))
    .toEqual([]);
  expect(
    await page.getByRole('status', { name: 'Send attempts' }).textContent()
  ).toBe('2');
  expect(
    JSON.parse(
      (await page
        .getByRole('status', { name: 'Submitted annotations' })
        .textContent())!
    )
  ).toEqual(snapshot);
});

test('narrative cards sharing evidence remain separate whole-card annotation targets', async ({
  page,
}) => {
  await page.goto('/annotations-host?annotations');
  const app = page.frameLocator('iframe');
  const narrative = app.getByRole('region', {
    name: 'Average trip duration',
    exact: true,
  });
  const card = await narrative.boundingBox();
  expect(card).toBeTruthy();
  await app.getByRole('button', { name: 'Annotate', exact: true }).click();
  await page.mouse.click(card!.x + card!.width / 2, card!.y + card!.height / 2);
  const comment = app.getByRole('textbox', {
    name: 'Annotation text',
    exact: true,
  });
  await comment.fill('Explain this duration');
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
  expect(draft.target.label).toBe('Average trip duration');
  expect(draft.target.kind).toBe('widget');
  expect(draft.target.queryNames).toEqual(['revenue']);
  expect(draft.context.rect.width).toBeCloseTo(card!.width, 0);
  expect(draft.context.rect.height).toBeCloseTo(card!.height, 0);
});

test('outside clicks cancel unfinished edits and require a second click to select another card', async ({
  page,
}) => {
  await page.goto('/annotations-host?annotations');
  const app = page.frameLocator('iframe');
  const card = await app
    .getByRole('region', { name: 'Customers', exact: true })
    .boundingBox();
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
  await comment.fill('Saved feedback');
  await app
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  await app.getByRole('button', { name: 'Annotation 1', exact: true }).click();
  await comment.fill('Unfinished edit');
  await comment.click();
  expect(await comment.inputValue()).toBe('Unfinished edit');
  await page.mouse.click(card!.x + card!.width / 2, card!.y + card!.height / 2);
  await expect.poll(() => comment.count()).toBe(0);
  await page.mouse.click(card!.x + card!.width / 2, card!.y + card!.height / 2);
  await expect.poll(() => comment.inputValue()).toBe('');
  await comment.fill('Unfinished new comment');
  await page
    .getByRole('button', { name: 'Allow annotations', exact: true })
    .click();
  await expect.poll(() => comment.count()).toBe(0);
  const drafts = JSON.parse(
    (await page
      .getByRole('status', { name: 'Annotation drafts', exact: true })
      .textContent())!
  );
  expect(drafts).toHaveLength(1);
  expect(drafts[0].comment).toBe('Saved feedback');
});

test('annotation mode scrolls by wheel and page keys while selected geometry follows the card', async ({
  page,
}) => {
  await page.goto('/annotations-host?annotations&annotation-scroll');
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
  const before = await app
    .getByRole('region', { name: 'Annotation editor', exact: true })
    .boundingBox();
  const layer = await selection.boundingBox();
  await page.mouse.move(layer!.x + 10, layer!.y + layer!.height / 2);
  await page.mouse.wheel(0, 60);
  await expect
    .poll(
      async () =>
        (await app
          .getByRole('region', { name: 'Annotation editor', exact: true })
          .boundingBox())!.y
    )
    .toBeLessThan(before!.y - 20);
  await comment.press('Escape');
  const frame = page.frames().find(frame => frame.parentFrame());
  const scrollY = await frame!.evaluate(() => window.scrollY);
  await selection.press('PageDown');
  await expect
    .poll(() => frame!.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrollY + 100);
});

for (const [title, expectedId] of [
  ['Trip narrative', undefined],
  ['Explicit narrative', 'explicit-narrative'],
] as const) {
  test(`${title} has a whole-card target without evidence`, async ({
    page,
  }) => {
    await page.goto('/annotations-host?annotations');
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: 'Annotate', exact: true }).click();
    const selection = app.getByRole('button', {
      name: 'Annotation selection',
      exact: true,
    });
    await selection.press('Home');
    for (let index = 0; index < (title === 'Trip narrative' ? 3 : 4); index++)
      await selection.press('ArrowRight');
    await selection.press('Enter');
    await app
      .getByRole('textbox', { name: 'Annotation text', exact: true })
      .fill('Narrative feedback');
    await app
      .getByRole('button', { name: 'Add annotation', exact: true })
      .click();
    const drafts = page.getByRole('status', {
      name: 'Annotation drafts',
      exact: true,
    });
    await expect
      .poll(async () => JSON.parse((await drafts.textContent()) || '[]').length)
      .toBe(1);
    const [draft] = JSON.parse((await drafts.textContent())!);
    expect(draft.target.label).toBe(title);
    expect(draft.target.id).toBeTruthy();
    if (expectedId) expect(draft.target.id).toBe(expectedId);
  });
}

test('touch panning scrolls in annotation mode without creating a region', async ({
  mobilePage: page,
}) => {
  await page.goto('/annotations-host?annotations&annotation-scroll');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Annotate', exact: true }).click();
  const selection = app.getByRole('button', {
    name: 'Annotation selection',
    exact: true,
  });
  const layer = await selection.boundingBox();
  const client = await page.context().newCDPSession(page);
  const x = layer!.x + layer!.width / 2;
  const y = layer!.y + layer!.height - 60;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let distance = 20; distance <= 200; distance += 20) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - distance }],
    });
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  const frame = page.frames().find(frame => frame.parentFrame())!;
  await expect
    .poll(() => frame.evaluate(() => window.scrollY))
    .toBeGreaterThan(50);
  expect(
    await app
      .getByRole('textbox', { name: 'Annotation text', exact: true })
      .count()
  ).toBe(0);
  await selection.press('Home');
  await selection.press('Enter');
  await app
    .getByRole('textbox', { name: 'Annotation text', exact: true })
    .press('Escape');
  await page.touchscreen.tap(layer!.x + 80, layer!.y + 130);
  await expect
    .poll(() =>
      app.getByRole('textbox', { name: 'Annotation text', exact: true }).count()
    )
    .toBe(1);
});

test('mouse region selection and saved pins follow the report while scrolling', async ({
  page,
}) => {
  await page.goto('/annotations-host?annotations&annotation-scroll');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Annotate', exact: true }).click();
  const layer = await app
    .getByRole('button', { name: 'Annotation selection', exact: true })
    .boundingBox();
  await page.mouse.move(layer!.x + 30, layer!.y + 130);
  await page.mouse.down();
  await page.mouse.move(layer!.x + 180, layer!.y + 200, { steps: 5 });
  await page.mouse.up();
  await app
    .getByRole('textbox', { name: 'Annotation text', exact: true })
    .fill('Change this area');
  await app
    .getByRole('button', { name: 'Add annotation', exact: true })
    .click();
  const pin = app.getByRole('button', { name: 'Annotation 1', exact: true });
  await expect.poll(() => pin.isVisible()).toBe(true);
  const before = await pin.boundingBox();
  await page.mouse.move(layer!.x + 10, layer!.y + 300);
  await page.mouse.wheel(0, 60);
  await expect
    .poll(async () => (await pin.boundingBox())!.y)
    .toBeCloseTo(before!.y - 60, 0);
  await pin.click();
  await expect
    .poll(() =>
      app
        .getByRole('textbox', { name: 'Annotation text', exact: true })
        .inputValue()
    )
    .toBe('Change this area');
  const drafts = JSON.parse(
    (await page
      .getByRole('status', { name: 'Annotation drafts', exact: true })
      .textContent())!
  );
  expect(drafts[0].context.region).toBeTruthy();
});
