import { expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { Page } from 'playwright';
import { test } from '@/tests/public-api/browser';
async function act(page: Page, group: string, action: string) {
  await page
    .getByRole('button', { name: new RegExp(`^Explore: ${group}:`) })
    .click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}
async function expectHeading(page: Page, grouping: string) {
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: `Revenue by ${grouping}`, exact: true })
        .count()
    )
    .toBe(1);
}
async function choose(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

test('filter, descend, detail export, up and browser history preserve the exploration context', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  await act(page, 'Europe', 'Filter to this region');
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Region: Europe', exact: true }).count()
    )
    .toBe(1);
  await act(page, 'Europe', 'Break down by countries');
  await expectHeading(page, 'countries');
  const path = page.getByRole('navigation', {
    name: 'Geography exploration',
    exact: true,
  });
  expect(await path.textContent()).toContain('Europe');
  const europeURL = page.url();
  await act(page, 'France', 'View orders');
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(3);
  expect(await detail.textContent()).toContain(
    'France · 2026-09-01–2026-09-30 · Enterprise · Region: Europe'
  );
  const downloaded = page.waitForEvent('download');
  await detail.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloaded;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('SO-1001');
  expect(csv).toContain('SO-1003');
  expect(csv).not.toContain('SO-1002');
  expect(csv).not.toContain('SO-1004');
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expectHeading(page, 'countries');
  await act(page, 'France', 'Break down by customers');
  await expectHeading(page, 'customers');
  expect(await path.textContent()).toContain('France');
  expect(
    await page
      .getByRole('button', { name: /^View orders: Atelier Nord:/ })
      .count()
  ).toBe(1);
  await path.getByRole('button', { name: 'Europe', exact: true }).click();
  await expectHeading(page, 'countries');
  await page.goBack();
  await expectHeading(page, 'customers');
  await page.goForward();
  await expectHeading(page, 'countries');
  await path.getByRole('button', { name: 'All regions', exact: true }).click();
  await expectHeading(page, 'regions');
  expect(
    await page
      .getByRole('button', { name: 'Region: Europe', exact: true })
      .count()
  ).toBe(1);
  await page.goto(europeURL);
  await expectHeading(page, 'countries');
  expect(await path.textContent()).toContain('Europe');
});

test('filter actions retain the currently applied month and clear dependent predicates atomically', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const requests: {
    start: string;
    region: string | null;
    country: string | null;
  }[] = [];
  await page.route('**/api/drill-query', async route => {
    const body = route.request().postDataJSON();
    requests.push(body.params);
    if (body.params.start === '2026-10-01' && body.params.region === null)
      await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/exploration-app');
  await choose(page, 'Country', 'France');
  await expect
    .poll(() => page.getByRole('row', { name: /Europe.*1,000/ }).count())
    .toBe(1);
  await page
    .getByRole('button', { name: 'September Month', exact: true })
    .click();
  await page.getByRole('option', { name: 'October', exact: true }).click();
  await act(page, 'Europe', 'Filter to this region');
  await expect
    .poll(() =>
      requests.some(
        input =>
          input.start === '2026-10-01' &&
          input.region === 'Europe' &&
          input.country === null
      )
    )
    .toBe(true);
  expect(
    requests.some(
      input => input.region === 'Europe' && input.country === 'France'
    )
  ).toBe(false);
  expect(
    await page
      .getByRole('button', { name: 'October Month', exact: true })
      .count()
  ).toBe(1);
  expect(
    await page
      .getByRole('button', { name: 'Country: All', exact: true })
      .count()
  ).toBe(1);
  release();
  await page.goBack();
  await expect
    .poll(() =>
      page.getByRole('button', { name: 'Country: France', exact: true }).count()
    )
    .toBe(1);
  expect(
    await page.getByRole('button', { name: 'Region: All', exact: true }).count()
  ).toBe(1);
});

test('a pending hierarchy transition cannot apply an old row to the new level', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/drill-query', async route => {
    if (route.request().postDataJSON().params.groupBy === 'country') await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/exploration-app');
  await act(page, 'Europe', 'Break down by countries');
  expect(
    await page
      .getByRole('region', { name: 'Revenue by regions', exact: true })
      .getByRole('navigation', { name: 'Geography breakdown' })
      .textContent()
  ).toBe('All regions');
  await page.getByRole('button', { name: /^Explore: Europe:/ }).click();
  expect(
    await page
      .getByRole('menuitem', { name: 'Break down by countries', exact: true })
      .count()
  ).toBe(0);
  await page.keyboard.press('Escape');
  const path = JSON.parse(new URL(page.url()).searchParams.get('geography')!);
  expect(path).toEqual([{ level: 'region', id: 'Europe', label: 'Europe' }]);
  release();
  await expectHeading(page, 'countries');
});

test('hierarchy changes preserve ordinary filters and displayed exports and stories', async ({
  page,
}) => {
  await page.goto('/exploration-app?segment=Self+serve');
  await act(page, 'Europe', 'Break down by countries');
  await expectHeading(page, 'countries');
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('group', { name: 'Page actions', exact: true })
    .getByRole('button', { name: 'Export CSV', exact: true })
    .click();
  const download = await downloaded;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('France,70');
  expect(csv).toContain('Germany,0');
  expect(csv).not.toContain('North America');
  await page
    .getByRole('button', { name: 'Present story', exact: true })
    .click();
  const story = page.getByRole('dialog', {
    name: 'Revenue by countries',
    exact: true,
  });
  await expect.poll(() => story.isVisible()).toBe(true);
  expect(await story.textContent()).toContain('Self serve');
  expect(await story.textContent()).toContain('Europe');
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Geography exploration' })
    .getByRole('button', { name: 'All regions', exact: true })
    .click();
  await expectHeading(page, 'regions');
  expect(
    await page
      .getByRole('button', { name: 'Self serve Segment', exact: true })
      .count()
  ).toBe(1);
});

test('invalid hierarchy links resolve to the validated root rather than querying their predicates', async ({
  page,
}) => {
  const paths: unknown[] = [
    [{ level: 'country', id: 'France', label: 'France' }],
    [{ level: 'region', id: {}, label: 'Europe' }],
    [{ level: 'region', id: 'Europe', label: 'x'.repeat(257) }],
  ];
  const requests: Record<string, unknown>[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/drill-query'))
      requests.push(request.postDataJSON().params);
  });
  for (const path of paths) {
    await page.goto(
      `/exploration-app?geography=${encodeURIComponent(JSON.stringify(path))}`
    );
    await expectHeading(page, 'regions');
    await expect
      .poll(() => new URL(page.url()).searchParams.has('geography'))
      .toBe(false);
  }
  expect(
    requests.every(
      input =>
        input.pathRegion === null &&
        input.pathCountry === null &&
        input.groupBy === 'region'
    )
  ).toBe(true);
});

test('mobile keyboard and table menus offer the same hierarchy actions', async ({
  mobilePage: page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/exploration-app');
  await page.getByRole('button', { name: /^Explore: Europe:/ }).focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Break down by countries', exact: true })
    .click();
  await expectHeading(page, 'countries');
  const navigation = page
    .getByRole('region', { name: 'Revenue by countries', exact: true })
    .getByRole('navigation', {
      name: 'Geography breakdown',
    });
  await expect
    .poll(() =>
      navigation.evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'France actions', exact: true })
    .click();
  await page
    .getByRole('menuitem', { name: 'Break down by customers', exact: true })
    .click();
  await expectHeading(page, 'customers');
  await page
    .getByRole('region', { name: 'Revenue by customers', exact: true })
    .getByRole('navigation', { name: 'Geography breakdown' })
    .getByRole('button', { name: 'Europe', exact: true })
    .click();
  await expectHeading(page, 'countries');
  expect(await page.locator('bun-hmr').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('primary chart actions keep a keyboard-accessible menu for other investigations', async ({
  page,
}) => {
  await page.goto('/exploration-app?primary');
  const chart = page.getByRole('region', {
    name: 'Geographic revenue',
    exact: true,
  });
  const direct = chart.getByRole('button', { name: /^View orders: Europe:/ });
  await direct.click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expect
    .poll(() => direct.evaluate(element => element === document.activeElement))
    .toBe(true);
  const menuTrigger = chart.getByRole('button', {
    name: 'Europe actions',
    exact: true,
  });
  await menuTrigger.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page
        .getByRole('menu', { name: 'Europe actions', exact: true })
        .isVisible()
    )
    .toBe(true);
  expect(
    await page
      .getByRole('menu', { name: 'Europe actions', exact: true })
      .evaluate(element => element.parentElement!.getBoundingClientRect().width)
  ).toBeLessThanOrEqual(340);
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      menuTrigger.evaluate(element => element === document.activeElement)
    )
    .toBe(true);
  await menuTrigger.click();
  await page
    .getByRole('menuitem', { name: 'Break down by countries', exact: true })
    .click();
  await expectHeading(page, 'countries');
});

test('chart actions work inside native inspection sheets and return focus to the source heading', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  const heading = page.getByRole('button', {
    name: 'Explore Revenue by regions',
    exact: true,
  });
  await heading.click();
  const inspection = page.getByRole('dialog', {
    name: 'Revenue by regions',
    exact: true,
  });
  await inspection.getByRole('button', { name: /^Explore: Europe:/ }).click();
  await inspection
    .getByRole('menuitem', { name: 'View orders', exact: true })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Contributing orders',
    exact: true,
  });
  await expect.poll(() => detail.getByRole('row').count()).toBe(4);
  await page.keyboard.press('Escape');
  await expect.poll(() => detail.isVisible()).toBe(false);
  await expect
    .poll(() => heading.evaluate(element => element === document.activeElement))
    .toBe(true);
});

test('a terminal hierarchy falls back to its remaining action when the primary descent is unavailable', async ({
  page,
}) => {
  await page.goto('/exploration-app?primary=descend');
  await page
    .getByRole('button', { name: /^Break down by countries: Europe:/ })
    .click();
  await expectHeading(page, 'countries');
  await page
    .getByRole('button', { name: /^Break down by customers: France:/ })
    .click();
  await expectHeading(page, 'customers');
  await page
    .getByRole('button', { name: /^View orders: Atelier Nord:/ })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Contributing orders', exact: true })
        .getByRole('row')
        .count()
    )
    .toBe(3);
});

test('widget breakdown context provides a visible way back at each level and in inspection', async ({
  page,
}) => {
  await page.goto('/exploration-app');
  const root = page.getByRole('region', {
    name: 'Revenue by regions',
    exact: true,
  });
  const trigger = root.getByRole('button', { name: /^Explore: Europe:/ });
  expect(await trigger.getAttribute('aria-haspopup')).toBe('menu');
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Europe actions', exact: true });
  await menu.waitFor();
  const labelBounds = (await trigger
    .getByText('Europe', { exact: true })
    .boundingBox())!;
  await expect
    .poll(async () => {
      const bounds = (await menu.boundingBox())!;
      return Math.abs(
        bounds.x + bounds.width / 2 - labelBounds.x - labelBounds.width / 2
      );
    })
    .toBeLessThan(2);
  await page.keyboard.press('Escape');

  expect(
    await root
      .getByRole('navigation', { name: 'Geography breakdown' })
      .textContent()
  ).toBe('All regions');
  await act(page, 'Europe', 'Break down by countries');
  await expectHeading(page, 'countries');
  const countries = page.getByRole('region', {
    name: 'Revenue by countries',
    exact: true,
  });
  const local = countries.getByRole('navigation', {
    name: 'Geography breakdown',
  });
  expect(await local.textContent()).toContain('All regions');
  expect(
    await page
      .getByRole('button', { name: 'Up one level', exact: true })
      .count()
  ).toBe(0);
  expect(await local.textContent()).not.toContain('Breakdown:');
  expect(await local.textContent()).toContain('Europe');
  await act(page, 'France', 'Break down by customers');
  await expectHeading(page, 'customers');
  const customers = page.getByRole('region', {
    name: 'Revenue by customers',
    exact: true,
  });
  expect(
    await customers
      .getByRole('navigation', { name: 'Geography breakdown' })
      .textContent()
  ).toContain('France');
  await page
    .getByRole('button', { name: 'Explore Revenue by customers', exact: true })
    .click();
  const inspection = page.getByRole('dialog', {
    name: 'Revenue by customers',
    exact: true,
  });
  await inspection
    .getByRole('navigation', { name: 'Geography breakdown' })
    .getByRole('button', { name: 'Europe', exact: true })
    .click();
  await expectHeading(page, 'countries');
  await page.keyboard.press('Escape');
  await local.getByRole('button', { name: 'All regions', exact: true }).click();
  await expectHeading(page, 'regions');
});
