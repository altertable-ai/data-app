import { expect } from 'vitest';
import { test } from '@/tests/public-api/browser';

const europeAction = 'View orders: Europe';
test('drill records show scoped content without a toolbar and preserve dashboard search and pagination', async ({
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
  expect(
    await detail
      .getByRole('button', { name: 'Refresh details', exact: true })
      .count()
  ).toBe(0);
  expect(
    await detail
      .getByRole('button', { name: 'Export CSV', exact: true })
      .count()
  ).toBe(0);
  expect(
    await detail
      .getByRole('button', { name: 'Present story', exact: true })
      .count()
  ).toBe(0);
  expect(await detail.textContent()).toContain('SO-1001');
  expect(await detail.textContent()).not.toContain('SO-1004');
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

test('detail loading, retry, and empty results remain scoped', async ({
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
  expect(attempts).toBeGreaterThanOrEqual(2);
  fail = false;
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'View contributing orders', exact: true })
        .evaluate(element => element === document.activeElement)
    )
    .toBe(true);
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

test('mobile chart drilling displays scoped detail content without page actions', async ({
  mobilePage: page,
}) => {
  await page.goto('/drill-app');
  await page.getByRole('button', { name: /^View orders: Europe:/ }).click();
  const detail = page.getByRole('dialog', { name: 'Contributing orders' });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  expect(
    await detail
      .getByRole('group', { name: 'Detail actions', exact: true })
      .count()
  ).toBe(0);
  expect(await detail.textContent()).toContain(
    'Europe · 2026-09-01–2026-09-30 · Enterprise'
  );
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

test('metric inspection opens Records first and retains glossary, queries, and shared tab links', async ({
  page,
}) => {
  let records = 0;
  page.on('request', request => {
    if (
      request.url().endsWith('/api/drill-query') &&
      request.postDataJSON().statement.includes('SELECT id, customer')
    )
      records++;
  });
  await page.goto('/drill-app');
  const metric = page.getByRole('region', { name: 'Net revenue', exact: true });
  expect(records).toBe(0);
  await metric
    .getByRole('button', { name: 'Explore Net revenue', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Net revenue',
    exact: true,
  });
  expect(await inspection.getByRole('tab').allTextContents()).toEqual([
    'Records',
    'Glossary',
    'Queries',
  ]);
  expect(
    await inspection
      .getByRole('tab', { name: 'Records', exact: true })
      .getAttribute('aria-selected')
  ).toBe('true');
  await expect.poll(() => inspection.getByRole('row').count()).toBe(5);
  expect(await inspection.innerText()).toContain('SO-1001');
  const shared = page.url();
  expect(new URL(shared).searchParams.get('tab')).toBe('records');
  expect(new URL(shared).searchParams.has('detail')).toBe(false);
  await inspection.getByRole('tab', { name: 'Glossary', exact: true }).click();
  expect(await inspection.innerText()).toContain(
    'Order amount minus discounts and refunds'
  );
  await inspection.getByRole('tab', { name: 'Queries', exact: true }).click();
  expect(await inspection.innerText()).toContain('SELECT');
  await page.keyboard.press('Escape');
  await inspection.waitFor({ state: 'hidden' });
  await page.goto(shared);
  await expect.poll(() => inspection.getByRole('row').count()).toBe(5);
  expect(
    await inspection
      .getByRole('tab', { name: 'Records', exact: true })
      .getAttribute('aria-selected')
  ).toBe('true');
});

test('record tabs query the displayed metric scope while the dashboard is updating', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/drill-query', async route => {
    const body = route.request().postDataJSON();
    if (
      body.params.start === '2026-10-01' &&
      body.statement.startsWith('WITH regions')
    )
      await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/drill-app');
  await page
    .getByRole('button', { name: 'Explore Net revenue', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'September Month', exact: true })
    .click();
  await page.getByRole('option', { name: 'October', exact: true }).click();
  await page
    .getByRole('button', { name: 'Explore Net revenue', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Net revenue',
    exact: true,
  });
  await expect.poll(() => inspection.getByRole('row').count()).toBe(5);
  expect(await inspection.innerText()).toContain('SO-1001');
  expect(await inspection.innerText()).not.toContain('SO-2001');
  release();
});

test('record requests cancel when leaving their tab or closing inspection', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let started = 0;
  let aborted = 0;
  page.on('requestfailed', request => {
    if (
      request.url().endsWith('/api/drill-query') &&
      request.postDataJSON().statement.includes('SELECT id, customer')
    )
      aborted++;
  });
  await page.route('**/api/drill-query', async route => {
    if (
      route.request().postDataJSON().statement.includes('SELECT id, customer')
    ) {
      started++;
      await gate;
    }
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/drill-app');
    await page
      .getByRole('button', { name: 'Explore Net revenue', exact: true })
      .click();
    const inspection = page.getByRole('dialog', {
      name: 'Net revenue',
      exact: true,
    });
    await expect.poll(() => started).toBe(1);
    await inspection
      .getByRole('tab', { name: 'Glossary', exact: true })
      .click();
    await expect.poll(() => aborted).toBe(1);
    await inspection.getByRole('tab', { name: 'Records', exact: true }).click();
    await expect.poll(() => started).toBe(2);
    await page.keyboard.press('Escape');
    await inspection.waitFor({ state: 'hidden' });
    await expect.poll(() => aborted).toBe(2);
  } finally {
    release();
  }
});

test('record tabs retain the app destination registry for nested row drills', async ({
  page,
}) => {
  await page.goto('/drill-app');
  await page
    .getByRole('button', { name: 'Explore Net revenue', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Net revenue',
    exact: true,
  });
  await inspection
    .getByRole('button', { name: 'View region orders: SO-1001', exact: true })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  expect(await detail.innerText()).toContain('Europe · 2026-09-01–2026-09-30');
  expect(new URL(page.url()).searchParams.get('detail')).toBe('orders');
  expect(new URL(page.url()).searchParams.has('about')).toBe(false);
});

test('nested replacement details return focus to the original dashboard trigger', async ({
  page,
}) => {
  await page.goto('/drill-app');
  const origin = page.getByRole('button', {
    name: 'View contributing orders',
    exact: true,
  });
  await origin.click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(5);
  const nested = detail.getByRole('button', {
    name: 'View region orders: SO-1001',
    exact: true,
  });
  await nested.click();
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'hidden' });
  await expect
    .poll(() => origin.evaluate(element => element === document.activeElement))
    .toBe(true);
});
