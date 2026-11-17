import type { Locator } from 'playwright';
import { expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

async function clickAt(button: Locator) {
  const box = (await button.boundingBox())!;
  await button
    .page()
    .mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

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
  await page.goto('/diagnostics');
  const frame = page.frameLocator('iframe');
  await expect.poll(() => frame.getByText('Chart ready').count()).toBe(2);
  const widget = frame.getByRole('region', { name: 'Revenue', exact: true });
  const dimensions = await widget.boundingBox();
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
  await frame.getByRole('button', { name: 'Hide failed widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Observed app errors').textContent())
    .toBe('4');
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).isVisible())
    .toBe(true);
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
    .poll(() => page.getByLabel('Observed app errors').textContent())
    .not.toBe('0');
  expect(await page.getByLabel('Repair delivery status').textContent()).toBe(
    'idle'
  );
  expect(await page.getByLabel('Repair requests').textContent()).toBe('3');
  await page.getByRole('button', { name: 'Recreate viewer' }).click();
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await page.reload();
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).count())
    .toBe(1);
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
      .poll(() => page.getByLabel('Repair delivery status').textContent())
      .toBe('failed');
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

test('multiple host and widget buttons cannot bypass shared serialization', async ({
  page,
}) => {
  await page.goto('/diagnostics');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByLabel('Repair requests').textContent())
    .toBe('1');
  await expect
    .poll(() => page.getByLabel('Repair delivery status').textContent())
    .toBe('accepted');
  // Rapid clicks land wherever the buttons were, even after one becomes disabled.
  const targets = [];
  for (const button of [
    page.getByRole('button', { name: 'Fix errors' }),
    frame.getByRole('button', { name: 'Fix error' }).first(),
    frame.getByRole('button', { name: 'Fix error' }).last(),
  ])
    targets.push((await button.boundingBox())!);
  for (const box of targets)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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

test('an unsupported host cannot request repairs from the host or widgets', async ({
  page,
}) => {
  await page.goto('/diagnostics?unsupported');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect
    .poll(() => page.getByRole('region', { name: 'App errors' }).count())
    .toBe(1);
  expect(await page.getByLabel('Repair delivery status').textContent()).toBe(
    'unsupported'
  );
  expect(
    await page.getByRole('button', { name: 'Fix errors' }).isDisabled()
  ).toBe(true);
  expect(
    await frame.getByRole('button', { name: 'Fix error' }).first().isDisabled()
  ).toBe(true);
  expect(await page.getByLabel('Repair requests').textContent()).toBe('0');
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
      .getByRole('region', { name: 'Revenue', exact: true })
      .boundingBox();
    await frame.getByRole('button', { name: 'Break widgets' }).click();
    const error = frame.getByRole('region', { name: 'Revenue error' });
    await expect.poll(() => error.isVisible()).toBe(true);
    const after = await frame
      .getByRole('region', { name: 'Revenue', exact: true })
      .boundingBox();
    expect(before!.width).toBe(260);
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
  }
});

test('a repair request stays pending until the host accepts or rejects it', async ({
  page,
}) => {
  await page.goto('/diagnostics?controlled-delivery');
  const frame = page.frameLocator('iframe');
  const status = page.getByLabel('Repair delivery status');
  const fix = page.getByRole('button', { name: 'Fix errors', exact: true });
  await frame.getByRole('button', { name: 'Break widgets' }).click();
  await expect.poll(() => status.textContent()).toBe('pending');
  expect(await fix.isDisabled()).toBe(true);
  // Native disabled controls cannot issue another request when clicked.
  await clickAt(fix);
  expect(await page.getByLabel('Repair requests').textContent()).toBe('1');
  await page
    .getByRole('button', { name: 'Accept repair request', exact: true })
    .click();
  await expect.poll(() => status.textContent()).toBe('accepted');
  expect(await fix.isEnabled()).toBe(true);
  await fix.click();
  await expect.poll(() => status.textContent()).toBe('pending');
  expect(await page.getByLabel('Repair requests').textContent()).toBe('2');
  await page
    .getByRole('button', { name: 'Reject repair request', exact: true })
    .click();
  await expect.poll(() => status.textContent()).toBe('failed');
  expect(await fix.isEnabled()).toBe(true);
  await frame.getByRole('button', { name: 'Hide failed widgets' }).click();
  await frame.getByRole('button', { name: 'Healthy clicks 0' }).click();
  expect(
    await frame.getByRole('button', { name: 'Healthy clicks 1' }).isVisible()
  ).toBe(true);
});
