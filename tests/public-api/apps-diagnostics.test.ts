import { mkdir, readFile } from 'node:fs/promises';

import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

const screenshotRoot =
  process.env.DATA_APP_SCREENSHOT_DIR ?? '/tmp/data-app-diagnostics';

test('independent widget and operation failures share latest repair report and preserve layout', async ({
  page,
}) => {
  await page.goto('/diagnostics');
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
    .poll(() =>
      page.getByRole('button', { name: 'Fix all errors' }).isEnabled()
    )
    .toBe(true);
  await page.getByText('View diagnostics').click();
  const banner = page.getByRole('region', { name: 'App errors' });
  await expect.poll(() => banner.textContent()).toContain('revenue');
  await expect.poll(() => banner.textContent()).toContain('retention');
  await expect.poll(() => banner.textContent()).toContain('render: Revenue');
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
  const source = await readFile(
    new URL('./fixtures/diagnostics-app.tsx', import.meta.url),
    'utf8'
  );
  const throwLine =
    source
      .split('\n')
      .findIndex(line =>
        line.includes("throw new Error('Series requires a numeric value')")
      ) + 1;
  for (const request of sent) {
    const renders = request.report.failures.filter(
      (failure: { kind: string }) => failure.kind === 'render'
    );
    expect(renders).toHaveLength(2);
    for (const failure of renders) {
      expect(failure.source.file).toBe('diagnostics-app.tsx');
      expect(failure.source.line).toBe(throwLine);
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
  await page.getByText('View diagnostics').click();
  await mkdir(screenshotRoot, { recursive: true });
  await page.locator('.diagnostics-preview').screenshot({
    path: `${screenshotRoot}/diagnostics-light.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.setViewportSize({ width: 375, height: 1100 });
  await expect
    .poll(() => frame.locator('html').getAttribute('data-atbl-theme'))
    .toBe('dark');
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
    .poll(() => page.getByRole('region', { name: 'App errors' }).textContent())
    .toContain('4 app errors');
  await page.getByRole('button', { name: 'Fix all errors' }).click();
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
        .poll(() =>
          page.getByRole('button', { name: 'Fix all errors' }).isEnabled()
        )
        .toBe(true);
      await page.getByRole('button', { name: 'Next revision' }).click();
    }
  }
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).textContent())
    .toContain('Automatic repair limit reached');
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
    .toContain('Automatic repair limit reached');
  expect(await page.getByLabel('Repair requests').textContent()).toBe('3');
  await page.getByRole('button', { name: 'Fix all errors' }).click();
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
    await page.getByRole('button', { name: 'Fix all errors' }).click();
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
  await page.goto('/diagnostics');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Fix all errors' }).isEnabled()
    )
    .toBe(true);
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Fix all errors' }).isEnabled()
    )
    .toBe(true);
  await Promise.all([
    page.getByRole('button', { name: 'Fix all errors' }).click({ force: true }),
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
    .poll(() =>
      page.getByRole('button', { name: 'Fix all errors' }).isEnabled()
    )
    .toBe(true);
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
    .toContain('Copy the diagnostics below');
  expect(
    await page.getByRole('button', { name: 'Fix all errors' }).isDisabled()
  ).toBe(true);
  expect(
    await frame.getByRole('button', { name: 'Fix error' }).first().isDisabled()
  ).toBe(true);
  expect(await page.getByLabel('Repair requests').textContent()).toBe('0');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByText('View diagnostics').click();
  const copy = page.getByRole('button', { name: 'Copy diagnostics' });
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"coverage":');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const report = JSON.parse(copied);
  expect(report.failures).toHaveLength(6);
  expect(report.coverage.join(' ')).toContain('Unvisited');
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
  await expect.poll(() => banner.textContent()).toContain('4 app errors');
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

for (const map of ['missing', 'invalid', 'unmapped']) {
  test(`repair preserves generated locations when the source map is ${map}`, async ({
    page,
  }) => {
    await page.goto(`/diagnostics?map=${map}`);
    const frame = page.frameLocator('iframe');
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    await expect
      .poll(() => page.getByLabel('Repair requests').textContent())
      .toBe('1');
    const sent = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('requests')!)
    );
    const renders = sent[0].report.failures.filter(
      (failure: { kind: string }) => failure.kind === 'render'
    );
    expect(renders).toHaveLength(2);
    for (const failure of renders)
      expect(failure.source.file).toMatch(/^altertable-data-app-.*\.js$/);
  });
}

test('clipboard rejection keeps a selectable complete report for manual recovery', async ({
  page,
}) => {
  await page.goto('/diagnostics?unsupported');
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Break widgets' })
    .click();
  await page.getByText('View diagnostics').click();
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
  expect(report.coverage.length).toBeGreaterThan(0);
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
