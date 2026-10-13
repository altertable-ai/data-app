import { expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { test } from '@/tests/public-api/browser';

const europeAction = 'View orders: Europe';
test('drill records reconcile with revenue, export their scope, and preserve dashboard search and pagination', async ({
  page,
}) => {
  await page.goto('/drill-app');
  await page.getByRole('searchbox', { name: 'Search regions' }).fill('Europe');
  await page.getByRole('button', { name: europeAction, exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  expect(await detail.textContent()).toContain(
    'Europe · 2026-09-01–2026-09-30 · Enterprise'
  );
  const downloaded = page.waitForEvent('download');
  await detail.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloaded;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain(
    'SO-1001,Atelier Nord,France,2026-09-12,paid,1200,200,0,1000'
  );
  expect(csv).toContain(
    'SO-1002,Werkhaus,Germany,2026-09-18,paid,600,100,100,400'
  );
  expect(csv).toContain(
    'SO-1003,Atelier Nord,France,2026-09-20,refunded,300,0,300,0'
  );
  expect(csv).not.toContain('SO-1004');
  expect(csv).not.toContain('SO-1005');
  expect(csv).not.toContain('SO-1006');
  expect(csv).not.toContain('SO-2001');
  expect(download.suggestedFilename()).toContain(
    'europe-2026-09-01-2026-09-30-enterprise'
  );
  const detailURL = page.url();
  await page.goBack();
  await expect.poll(() => detail.isVisible()).toBe(false);
  expect(
    await page.getByRole('searchbox', { name: 'Search regions' }).inputValue()
  ).toBe('Europe');
  await page.goForward();
  await expect.poll(() => detail.isVisible()).toBe(true);
  await detail.getByRole('button', { name: 'Close panel' }).click();
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: europeAction, exact: true })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await page.getByRole('searchbox', { name: 'Search regions' }).fill('');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await page.getByRole('button', { name: europeAction, exact: true }).click();
  await expect.poll(() => detail.isVisible()).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  expect(
    await page.getByText('Page 2 of 6', { exact: true }).textContent()
  ).toBe('Page 2 of 6');
  await page.goto(detailURL);
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
});

test('drilling during an overview refresh uses the displayed input and freezes the detail scope', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/drill-query', async route => {
    const body = route.request().postDataJSON() as {
      statement: string;
      params: { start: string };
    };
    if (
      body.statement.startsWith('WITH regions') &&
      body.params.start === '2026-10-01'
    )
      await gate;
    await route.continue();
  });
  await page.goto('/drill-app');
  await page.getByRole('searchbox', { name: 'Search regions' }).fill('Europe');
  await expect
    .poll(() => page.getByRole('row', { name: /Europe.*1,400/ }).count())
    .toBe(1);
  await page
    .getByRole('button', { name: 'September Month', exact: true })
    .click();
  await page.getByRole('option', { name: 'October', exact: true }).click();
  await page.getByRole('button', { name: europeAction, exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  expect(await detail.textContent()).toContain('2026-09-01–2026-09-30');
  release();
  await detail.getByRole('button', { name: 'Refresh details' }).click();
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expect
    .poll(() => page.getByRole('row', { name: /Europe.*500/ }).count())
    .toBe(1);
  await page.getByRole('button', { name: europeAction, exact: true }).click();
  await expect.poll(() => detail.getByRole('row').count()).toBe(2);
  expect(await detail.textContent()).toContain('SO-2001');
});

test('detail loading, retry, stale errors, and empty results remain scoped', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let attempts = 0;
  let fail = true;
  await page.route('**/api/drill-query', async route => {
    if (
      route.request().postDataJSON().statement.includes('SELECT id, customer')
    ) {
      attempts++;
      await gate;
      if (fail) {
        await route.fulfill({ status: 503, body: 'Unavailable' });
        return;
      }
    }
    await route.continue();
  });
  await page.goto('/drill-app');
  await page
    .getByRole('button', { name: 'View contributing orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect
    .poll(() =>
      detail
        .getByRole('button', { name: 'Export CSV', exact: true })
        .isDisabled()
    )
    .toBe(true);
  release();
  await expect
    .poll(() =>
      detail.getByRole('button', { name: 'Retry', exact: true }).isVisible()
    )
    .toBe(true);
  fail = false;
  await detail.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => detail.getByRole('row').count()).toBe(5);
  expect(await detail.textContent()).toContain(
    'All regions · 2026-09-01–2026-09-30 · Enterprise'
  );
  fail = true;
  await detail.getByRole('button', { name: 'Refresh details' }).click();
  await expect
    .poll(() =>
      detail.getByRole('button', { name: 'Retry', exact: true }).isVisible()
    )
    .toBe(true);
  expect(await detail.getByRole('row').count()).toBe(5);
  expect(
    await detail
      .getByRole('button', { name: 'Export CSV', exact: true })
      .isEnabled()
  ).toBe(true);
  expect(attempts).toBeGreaterThanOrEqual(3);
  fail = false;
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  const asia = page.getByRole('button', { name: /^View orders: Asia:/ });
  await asia.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      detail.getByText('No contributing orders', { exact: true }).isVisible()
    )
    .toBe(true);
  expect(await detail.textContent()).toContain(
    'Asia · 2026-09-01–2026-09-30 · Enterprise'
  );
});

test('invalid detail links never execute a detail query and close safely', async ({
  page,
}) => {
  let detailRequests = 0;
  page.on('request', request => {
    if (
      request.url().endsWith('/api/drill-query') &&
      request.postData()?.includes('SELECT id, customer')
    )
      detailRequests++;
  });
  for (const input of [
    'not-json',
    JSON.stringify({
      start: '2026-09-01',
      end: '2026-09-30',
      segment: 'Enterprise',
      region: 'Unknown',
    }),
  ]) {
    await page.goto(
      `/drill-app?detail=orders&detailInput=${encodeURIComponent(input)}`
    );
    const panel = page.getByRole('dialog', { name: 'Cannot open details' });
    await expect.poll(() => panel.isVisible()).toBe(true);
    await panel.getByRole('button', { name: 'Close panel' }).click();
    await expect.poll(() => panel.isVisible()).toBe(false);
    expect(new URL(page.url()).searchParams.has('detail')).toBe(false);
  }
  expect(detailRequests).toBe(0);
});

test('closing a loading detail aborts its request and unmounts its query', async ({
  page,
}) => {
  let requests = 0;
  let aborted = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  page.on('requestfailed', request => {
    if (request.url().endsWith('/api/drill-query')) aborted = true;
  });
  await page.route('**/api/drill-query', async route => {
    if (
      route.request().postDataJSON().statement.includes('SELECT id, customer')
    ) {
      requests++;
      await gate;
    }
    await route.continue().catch(() => {});
  });
  await page.goto('/drill-app');
  await page
    .getByRole('button', { name: 'View contributing orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => requests).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.count()).toBe(0);
  await expect.poll(() => aborted).toBe(true);
  release();
  expect(requests).toBe(1);
});

test('mobile chart drilling presents only destination findings and retains the scope', async ({
  mobilePage: page,
}) => {
  await page.goto('/drill-app');
  await page.getByRole('button', { name: /^View orders: Europe:/ }).click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await detail
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const story = page.getByRole('dialog', {
    name: '$1400 net revenue',
    exact: true,
  });
  await expect.poll(() => story.isVisible()).toBe(true);
  expect(await page.getByRole('dialog').filter({ visible: true }).count()).toBe(
    2
  );
  expect(await story.textContent()).toContain(
    'Europe · 2026-09-01–2026-09-30 · Enterprise'
  );
  expect(
    await page
      .getByRole('dialog', { name: 'Revenue by region', exact: true })
      .count()
  ).toBe(0);
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await detail.getByRole('button', { name: 'Close panel' }).click();
  await expect.poll(() => detail.isVisible()).toBe(false);
});

test('an invalid link after an open detail does not retain a hidden destination', async ({
  page,
}) => {
  await page.goto('/drill-app');
  await page
    .getByRole('button', { name: 'View contributing orders', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Contributing orders' })
        .getByRole('row')
        .count()
    )
    .toBe(5);
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set('detail', 'missing');
    history.pushState(null, '', url);
    dispatchEvent(new PopStateEvent('popstate'));
  });
  const invalid = page.getByRole('dialog', { name: 'Cannot open details' });
  await invalid.getByRole('button', { name: 'Close panel' }).click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
});

test('closing a detail preserves a request still used by another dashboard section', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/api/drill-query', async route => {
    if (
      route.request().postDataJSON().statement.includes('SELECT id, customer')
    ) {
      requests++;
      await gate;
    }
    await route.continue();
  });
  await page.goto('/drill-app?shared');
  await page
    .getByRole('button', { name: 'View contributing orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => requests).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.count()).toBe(0);
  release();
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Shared orders', exact: true })
        .first()
        .getByRole('row')
        .count()
    )
    .toBe(5);
  expect(requests).toBe(1);
});

test('alternate visualization renderers receive the same scoped drill action', async ({
  page,
}) => {
  await page.goto('/drill-app?alternate');
  await page.getByRole('tab', { name: 'Records', exact: true }).click();
  await page
    .getByRole('button', { name: 'Investigate Europe', exact: true })
    .click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  expect(await detail.textContent()).toContain(
    'Europe · 2026-09-01–2026-09-30 · Enterprise'
  );
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  expect(
    await page.getByRole('tab', { name: 'Records', selected: true }).count()
  ).toBe(1);
});
