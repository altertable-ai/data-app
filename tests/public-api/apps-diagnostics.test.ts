import { mkdir } from 'node:fs/promises';

import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

const screenshotRoot =
  process.env.DATA_APP_SCREENSHOT_DIR ?? '/tmp/data-app-diagnostics';

test('public widget renderers isolate early failures without changing healthy grid and inline layout', async ({
  page,
}) => {
  await page.goto('/diagnostics?scenario=boundaries');
  const frame = page.frameLocator('iframe');
  const grid = frame.getByLabel('Widget grid');
  const widget = frame.getByRole('region', {
    name: 'Spanning widget',
    exact: true,
  });
  await expect
    .poll(() => frame.getByText('Narrative ready').isVisible())
    .toBe(true);
  const gridBounds = (await grid.boundingBox())!;
  const widgetBounds = (await widget.boundingBox())!;
  expect(widgetBounds.width).toBeCloseTo(gridBounds.width, 0);
  const one = (await frame
    .getByText('Inline one', { exact: true })
    .boundingBox())!;
  const two = (await frame
    .getByText('Inline two', { exact: true })
    .boundingBox())!;
  expect(one.y).toBeCloseTo(two.y, 0);
  expect(two.x).toBeGreaterThan(one.x);
  await page.setViewportSize({ width: 900, height: 900 });
  const wrapping = frame.getByLabel('Wrapping grid');
  const last = frame.getByRole('region', {
    name: 'Wrapped three',
    exact: true,
  });
  await expect
    .poll(
      async () =>
        (await last.boundingBox())!.width /
        (await wrapping.boundingBox())!.width
    )
    .toBeCloseTo(1, 2);
  const headingBounds = (await frame
    .getByRole('region', { name: 'Custom heading', exact: true })
    .boundingBox())!;
  await frame.getByRole('button', { name: 'Break renderers' }).click();
  await expect
    .poll(() => frame.getByText('This widget couldn’t render').count())
    .toBe(3);
  const failedHeading = (await frame
    .getByRole('region', { name: 'Widget error', exact: true })
    .boundingBox())!;
  expect(failedHeading.width).toBeCloseTo(headingBounds.width, 0);
  expect(failedHeading.height).toBeCloseTo(headingBounds.height, 0);
  expect(
    await frame
      .getByRole('heading', { name: 'Narrative', exact: true })
      .isVisible()
  ).toBe(true);
  expect(
    await frame.getByText('Static narrative description').isVisible()
  ).toBe(true);
  expect(await frame.getByText('Static narrative footer').isVisible()).toBe(
    true
  );
  await frame.getByRole('button', { name: 'Healthy action 0' }).click();
  expect(
    await frame.getByRole('button', { name: 'Healthy action 1' }).isVisible()
  ).toBe(true);
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  const sent = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('requests')!)
  );
  expect(
    sent[0].report.failures
      .map((failure: { name: string }) => failure.name)
      .sort()
  ).toEqual(['Alternate views', 'Narrative', 'Widget']);
});

test('overflow failures remain visible and repairable after earlier widgets are removed', async ({
  page,
}) => {
  await page.goto('/diagnostics?scenario=overflow');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break all widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  const first = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('requests')!)[0].report
  );
  expect(first.failures).toHaveLength(30);
  expect(first.truncated).toBe(1);
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  await frame.getByRole('button', { name: 'Hide first 30 widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Observed app errors').textContent())
    .toBe('1');
  const banner = page.getByRole('region', { name: 'App errors' });
  await expect.poll(() => banner.isVisible()).toBe(true);
  await frame.getByRole('button', { name: 'Fix error' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('2');
  const latest = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('requests')!).at(-1).report
  );
  expect(latest.failures).toHaveLength(1);
  expect(latest.failures[0].name).toBe('Overflow 31');
  expect(latest.failures[0].message).toContain(
    'Series requires a numeric value'
  );
  expect(latest.truncated).toBe(0);
});

test('independent widget and operation failures share latest repair report and preserve layout', async ({
  page,
}) => {
  await page.goto('/diagnostics?progress');
  const frame = page.frameLocator('iframe');
  await expect.poll(() => frame.getByText('Chart ready').count()).toBe(2);
  const widget = frame.locator('.altertable-data-widget').first();
  const dimensions = await widget.boundingBox();
  const heading = await frame
    .getByRole('heading', { name: 'Revenue', exact: true })
    .elementHandle();
  const footer = await frame.getByText('USD · Updated today').elementHandle();
  const neighbor = await frame
    .getByText('Neighbor below the widgets')
    .boundingBox();
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => frame.getByText('This widget couldn’t render').count())
    .toBe(2);
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  const error = await widget.boundingBox();
  expect(await heading!.evaluate(node => node.isConnected)).toBe(true);
  expect(await footer!.evaluate(node => node.isConnected)).toBe(true);
  const after = await frame
    .getByText('Neighbor below the widgets')
    .boundingBox();
  expect(error!.height).toBeCloseTo(dimensions!.height, 0);
  expect(error!.width).toBeCloseTo(dimensions!.width, 0);
  expect(after!.y - error!.y).toBeCloseTo(neighbor!.y - dimensions!.y, 0);
  await expect
    .poll(() =>
      frame.getByRole('heading', { name: 'Revenue', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() => frame.getByText('Monthly revenue by channel').isVisible())
    .toBe(true);
  await expect
    .poll(() => frame.getByText('USD · Updated today').isVisible())
    .toBe(true);
  await frame.getByRole('button', { name: 'Healthy clicks 0' }).click();
  await expect
    .poll(() => frame.getByRole('button', { name: 'Healthy clicks 1' }).count())
    .toBe(1);
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  const banner = page.getByRole('region', { name: 'App errors' });
  const copyBounds = (await banner
    .getByRole('button', { name: 'Copy diagnostics', exact: true })
    .boundingBox())!;
  const fixBounds = (await banner
    .getByRole('button', { name: 'Fix errors', exact: true })
    .boundingBox())!;
  expect(fixBounds.x).toBeGreaterThanOrEqual(copyBounds.x + copyBounds.width);
  expect(fixBounds.y).toBe(copyBounds.y);
  await expect
    .poll(() =>
      banner
        .getByRole('status', { name: 'Repair request status' })
        .textContent()
    )
    .toContain('Preparing a fix');
  expect(await banner.textContent()).toContain(
    'You can keep using the rest of the app.'
  );
  expect(await banner.textContent()).not.toContain('Repair request accepted');
  expect(await banner.getByText('View diagnostics').count()).toBe(0);
  // Keyboard activation of the widget uses the same whole-report request.
  const repair = frame.getByRole('button', { name: 'Fix error' }).first();
  await repair.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('2');
  const sent = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('requests')!)
  );
  expect(sent[1].report.failures).toHaveLength(6);
  expect(sent[1].context.automatic).toBe(false);
  for (const request of sent) {
    const renders = request.report.failures.filter(
      (failure: { kind: string }) => failure.kind === 'render'
    );
    expect(renders).toHaveLength(2);
    for (const failure of renders) {
      expect(failure.source.file).toMatch(/^altertable-data-app-.*\.js$/);
      expect(failure.source.line).toBeGreaterThan(0);
      expect(failure.source.column).toBeGreaterThan(0);
    }
  }
  expect(
    sent[1].report.failures.every(
      (failure: { source?: { file: string; line: number; column: number } }) =>
        failure.source?.line &&
        failure.source?.column &&
        !failure.source.file.includes('/')
    )
  ).toBe(true);
  await expect.poll(() => repair.isEnabled()).toBe(true);
  await mkdir(screenshotRoot, { recursive: true });
  await banner.screenshot({
    path: `${screenshotRoot}/diagnostics-banner-light.png`,
    animations: 'disabled',
  });
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-light.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'working', exact: true }).click();
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.setViewportSize({ width: 375, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await banner
      .getByRole('progressbar', { name: 'Repair in progress' })
      .evaluate(node => getComputedStyle(node).animationName)
  ).toBe('none');
  await expect
    .poll(() => frame.locator('html').getAttribute('data-atbl-theme'))
    .toBe('dark');
  await banner.screenshot({
    path: `${screenshotRoot}/diagnostics-banner-dark-narrow.png`,
    animations: 'disabled',
  });
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-dark-narrow.png`,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await frame.getByRole('button', { name: 'Hide failed widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Observed app errors').textContent())
    .toBe('4');
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).isVisible())
    .toBe(true);
  await page.getByRole('button', { name: 'review', exact: true }).click();
  await page.getByRole('button', { name: 'Fix errors' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('3');
  const latest = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('requests')!).at(-1)
  );
  expect(latest.report.failures).toHaveLength(4);
  expect(
    latest.report.failures.every(
      (failure: { kind: string }) => failure.kind !== 'render'
    )
  ).toBe(true);
});

test('fourth failing revision and recreated/reloaded viewers keep automatic allowance', async ({
  page,
}) => {
  await page.goto('/diagnostics');
  const frame = page.frameLocator('iframe');
  for (let revision = 1; revision <= 4; revision++) {
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    await expect
      .poll(() => page.getByRole('region', { name: 'App errors' }).count())
      .toBe(1);
    if (revision < 4) {
      await expect
        .poll(() => page.getByLabel('Repair requests').textContent())
        .toBe(`${revision}`);
      await expect
        .poll(() => page.getByLabel('Repair delivery status').textContent())
        .toBe('accepted');
      await page.getByRole('button', { name: 'Next revision' }).click();
    }
  }
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).textContent())
    .toContain('Automatic fixes are paused');
  expect(await page.getByLabel('Repair requests').textContent()).toBe('3');
  await mkdir(screenshotRoot, { recursive: true });
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-limit.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Recreate viewer' }).click();
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await page.reload();
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).textContent())
    .toContain('Automatic fixes are paused');
  expect(await page.getByLabel('Repair requests').textContent()).toBe('3');
  await page.getByRole('button', { name: 'Fix errors' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('4');
  await expect
    .poll(() =>
      frame.getByRole('button', { name: 'Fix error' }).first().isDisabled()
    )
    .toBe(true);
});

for (const failure of ['save-failure', 'delivery-failure']) {
  test(`failed ${failure} does not loop and keeps manual recovery`, async ({
    page,
  }) => {
    await page.goto(`/diagnostics?${failure}`);
    const frame = page.frameLocator('iframe');
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    await expect
      .poll(() =>
        page.getByRole('region', { name: 'App errors' }).textContent()
      )
      .toContain('could not be saved or delivered');
    const before = failure === 'save-failure' ? '0' : '1';
    expect(await page.getByLabel('Repair requests').textContent()).toBe(before);
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    await page.getByRole('button', { name: 'Fix errors' }).click();
    await expect
      .poll(() => page.getByLabel('Repair requests').textContent())
      .toBe(failure === 'save-failure' ? '1' : '2');
    expect(
      await page.evaluate(
        () => JSON.parse(sessionStorage.getItem('repair')!).automaticRequests
      )
    ).toBe(1);
  });
}

test('multiple banner and widget buttons cannot bypass shared serialization', async ({
  page,
}) => {
  await page.goto('/diagnostics?progress');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  await page.getByRole('button', { name: 'review', exact: true }).click();
  await Promise.all([
    page.getByRole('button', { name: 'Fix errors' }).click({ force: true }),
    frame
      .getByRole('button', { name: 'Fix error' })
      .first()
      .click({ force: true }),
    frame
      .getByRole('button', { name: 'Fix error' })
      .last()
      .click({ force: true }),
  ]);
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  expect(await page.getByLabel('Repair requests').textContent()).toBe('2');
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('repair')!).automaticRequests
    )
  ).toBe(1);
});

test('unsupported host exposes diagnostics and a manual recovery instruction', async ({
  page,
}) => {
  await page.goto('/diagnostics?unsupported');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).textContent())
    .toContain('Copy the diagnostics into your agent');
  expect(
    await page.getByRole('button', { name: 'Fix errors' }).isDisabled()
  ).toBe(true);
  expect(
    await frame.getByRole('button', { name: 'Fix error' }).first().isDisabled()
  ).toBe(true);
  expect(await page.getByLabel('Repair requests').textContent()).toBe('0');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const copy = page.getByRole('button', { name: 'Copy diagnostics' });
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"failures":');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const report = JSON.parse(copied);
  expect(report.failures).toHaveLength(6);
  expect(report.pending).toBe(0);
  expect(report.truncated).toBe(0);
  expect(JSON.stringify(report)).not.toContain('sourcesContent');
  const banner = page.getByRole('region', { name: 'App errors' });
  expect(await banner.textContent()).not.toContain('Live SDK operations');
  expect(await banner.textContent()).not.toContain('Diagnostics copied.');
  await mkdir(screenshotRoot, { recursive: true });
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-copy-light.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.setViewportSize({ width: 375, height: 1100 });
  await expect
    .poll(() => frame.locator('html').getAttribute('data-atbl-theme'))
    .toBe('dark');
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-copy-dark-narrow.png`,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await frame.getByRole('button', { name: 'Hide failed widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Observed app errors').textContent())
    .toBe('4');

  await copy.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .not.toBe(copied);
  const latest = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText())
  );
  expect(latest.failures).toHaveLength(4);
  expect(await page.getByLabel('Repair requests').textContent()).toBe('0');
});

test('clipboard rejection keeps a selectable complete report for manual recovery', async ({
  page,
}) => {
  await page.goto('/diagnostics?unsupported');
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Break widgets' })
    .click();
  await page.context().grantPermissions([]);
  await page.getByRole('button', { name: 'Copy diagnostics' }).click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Diagnostic clipboard status' })
        .textContent()
    )
    .toContain('Couldn’t copy.');
  const report = JSON.parse(
    (await page.locator('.atbl-repair-banner pre').textContent())!
  );
  expect(report.failures).toHaveLength(6);
  expect(report.pending).toBe(0);
  expect(report.truncated).toBe(0);
});

test('explicit widget widths remain stable when rendering fails at wide and narrow widths', async ({
  page,
}) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/diagnostics?fixed-width');
    const frame = page.frameLocator('iframe');
    await expect.poll(() => frame.getByText('Chart ready').count()).toBe(2);
    const before = await frame
      .locator('.altertable-data-widget')
      .first()
      .boundingBox();
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    const error = frame.getByRole('region', { name: 'Revenue error' });
    await expect.poll(() => error.isVisible()).toBe(true);
    const after = await frame
      .locator('.altertable-data-widget')
      .first()
      .boundingBox();
    expect(before!.width).toBe(260);
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
  }
});

test('preparation stays loading after acceptance and transitions to activity, review and completion', async ({
  page,
}) => {
  await page.goto('/diagnostics?progress&controlled-delivery');
  const frame = page.frameLocator('iframe');
  const banner = page.getByRole('region', { name: 'App errors' });
  const status = banner.getByLabel('Repair request status');
  const loading = banner.getByRole('progressbar', {
    name: 'Repair in progress',
  });
  const fix = banner.getByRole('button', { name: 'Fix errors', exact: true });
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('pending');
  expect(await status.textContent()).toContain('Preparing a fix');
  expect(await loading.isVisible()).toBe(true);
  expect(await fix.isDisabled()).toBe(true);
  await page
    .getByRole('button', { name: 'Accept repair request', exact: true })
    .click();
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  expect(await status.textContent()).toContain('Preparing a fix');
  expect(await loading.isVisible()).toBe(true);
  expect(await fix.isDisabled()).toBe(true);
  expect(
    await banner
      .getByRole('button', { name: 'Copy diagnostics', exact: true })
      .isEnabled()
  ).toBe(true);
  // Native disabled controls cannot issue another request, including forced clicks.
  await fix.click({ force: true });
  expect(await page.getByLabel('Repair requests').textContent()).toBe('1');
  await page.getByRole('button', { name: 'working', exact: true }).click();
  await expect.poll(() => status.textContent()).toContain('Updating your app');
  expect(await loading.isVisible()).toBe(true);
  expect(await fix.isDisabled()).toBe(true);
  await page.getByRole('button', { name: 'review', exact: true }).click();
  await expect
    .poll(() => status.textContent())
    .toContain('The app still needs attention');
  expect(await loading.count()).toBe(0);
  expect(await fix.isEnabled()).toBe(true);
  await fix.click();
  expect(await fix.isDisabled()).toBe(true);
  await fix.click({ force: true });
  expect(await page.getByLabel('Repair requests').textContent()).toBe('2');
  await expect.poll(() => status.textContent()).toContain('Preparing a fix');
  expect(await loading.isVisible()).toBe(true);
  await page.getByRole('button', { name: 'loading', exact: true }).click();
  expect(await status.textContent()).toContain('Preparing a fix');
  expect(await fix.isDisabled()).toBe(true);
  await page
    .getByRole('button', { name: 'Reject repair request', exact: true })
    .click();
  await expect
    .poll(() => status.textContent())
    .toContain('Couldn’t request a fix');
  expect(await loading.count()).toBe(0);
  expect(await fix.isEnabled()).toBe(true);
  await fix.click();
  await expect.poll(() => status.textContent()).toContain('Preparing a fix');
  expect(await loading.isVisible()).toBe(true);
  await page
    .getByRole('button', { name: 'Accept repair request', exact: true })
    .click();
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  expect(await status.textContent()).toContain('Preparing a fix');
  expect(await loading.isVisible()).toBe(true);
  await page.getByRole('button', { name: 'working', exact: true }).click();
  await expect.poll(() => status.textContent()).toContain('Updating your app');
  expect(await loading.isVisible()).toBe(true);
  await frame.getByRole('button', { name: 'Healthy clicks 0' }).click();
  expect(
    await frame.getByRole('button', { name: 'Healthy clicks 1' }).isVisible()
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Finish update', exact: true })
    .click();
  await expect.poll(() => banner.count()).toBe(0);
});

test('elapsed time starts with preparation, continues through activity and revisions, and resets for a retry', async ({
  page,
}) => {
  await page.goto('/diagnostics?progress&controlled-delivery&automatic-limit');
  const frame = page.frameLocator('iframe');
  await expect.poll(() => frame.getByText('Chart ready').count()).toBe(2);
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Fix errors', exact: true }).isEnabled()
    )
    .toBe(true);
  const now = new Date('2026-10-27T10:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  const banner = page.getByRole('region', { name: 'App errors' });
  const status = banner.getByLabel('Repair request status');
  const fix = banner.getByRole('button', { name: 'Fix errors', exact: true });
  const accept = page.getByRole('button', {
    name: 'Accept repair request',
    exact: true,
  });
  await fix.click();
  await expect.poll(() => status.textContent()).toContain('Preparing a fix');
  expect(await banner.getByText(/\d+s elapsed/).count()).toBe(0);
  await page.clock.runFor(999);
  expect(await banner.getByText(/\d+s elapsed/).count()).toBe(0);
  await page.clock.runFor(1);
  expect(
    await banner.getByText('1s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await accept.click();
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  await page.clock.runFor(2000);
  expect(await status.textContent()).toContain('Preparing a fix');
  expect(
    await banner.getByText('3s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await page.getByRole('button', { name: 'working', exact: true }).click();
  expect(
    await banner.getByText('3s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await page.clock.runFor(1000);
  expect(
    await banner.getByText('4s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await page.getByRole('button', { name: 'review', exact: true }).click();
  expect(await banner.getByText(/\d+s elapsed/).count()).toBe(0);
  await fix.click();
  await expect.poll(() => status.textContent()).toContain('Preparing a fix');
  expect(await banner.getByText(/\d+s elapsed/).count()).toBe(0);
  await page.clock.runFor(999);
  expect(await banner.getByText(/\d+s elapsed/).count()).toBe(0);
  await page.clock.runFor(1);
  expect(
    await banner.getByText('1s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await accept.click();
  await page.getByRole('button', { name: 'building', exact: true }).click();
  expect(await fix.isDisabled()).toBe(true);
  expect(
    await banner.getByText('1s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Next revision', exact: true })
    .click();
  await expect.poll(() => frame.getByText('Chart ready').count()).toBe(2);
  await page.getByRole('button', { name: 'loading', exact: true }).click();
  expect(await fix.isDisabled()).toBe(true);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await banner
    .getByRole('button', { name: 'Copy diagnostics', exact: true })
    .click();
  await expect
    .poll(
      async () =>
        JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
          .failures.length
    )
    .toBe(6);
  expect(
    await banner.getByText('1s elapsed', { exact: true }).isVisible()
  ).toBe(true);
  expect(await banner.textContent()).not.toContain('0s elapsed');
  await page
    .getByRole('button', { name: 'Finish update', exact: true })
    .click();
  await expect.poll(() => banner.count()).toBe(0);
});
