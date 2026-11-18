import { readFile } from 'node:fs/promises';

import { describe, expect } from 'vitest';

import { test, localURL } from '@/tests/public-api/browser';

describe('authoring', () => {
  const failure = { error: 'Fixture unavailable' };

  test('built local server renders interactive React in production mode', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(localURL);
    await expect
      .poll(() =>
        page.getByRole('heading', { name: 'Appearance consumer' }).isVisible()
      )
      .toBe(true);
    await page
      .getByRole('button', { name: 'Apply appearance', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: 'Custom action', exact: true })
          .evaluate(element => getComputedStyle(element).color)
      )
      .toBe('rgb(51, 102, 153)');
    expect(errors).toEqual([]);
  });

  test('local server runs only registered query IDs', async () => {
    function run(id: string, body: unknown) {
      return fetch(new URL(`/api/query/${id}`, localURL), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const result = await run('connection', { limit: 1 });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ rows: [[1]] });
    expect((await run('unknown', { limit: 1 })).status).toBe(404);
    expect((await run('connection', { limit: 10_001 })).status).toBe(400);
    expect(
      (await run('connection', { limit: 1, params: { sql: 'SELECT 1' } }))
        .status
    ).toBe(400);
    expect(
      (
        await fetch(new URL('/api/query/connection', localURL), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://other.example',
          },
          body: JSON.stringify({ limit: 1 }),
        })
      ).status
    ).toBe(403);
  });

  test('hosted cost starter charts services and opens customer detail', async ({
    page,
  }) => {
    const requests: { queryId: string; params?: Record<string, string> }[] = [];
    await page.route('**/api/query', async route => {
      requests.push(route.request().postDataJSON());
      await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: /^Compute.*View customers$/ })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Cost summary' })
          .getByText('$13,200.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
    const chart = app.getByLabel('Costs by service', { exact: true });
    await expect.poll(() => chart.isVisible()).toBe(true);
    expect(
      requests.some(request => request.queryId === 'costsByCustomer')
    ).toBe(false);
    await chart.getByRole('button', { name: /^Compute.*Actions/ }).click();
    await app
      .getByRole('menuitem', { name: 'View customers', exact: true })
      .click();
    const detail = app.getByRole('dialog', {
      name: 'Customer costs',
      exact: true,
    });
    await expect
      .poll(() =>
        detail.getByRole('row', { name: 'Atlas $4,200.00' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        detail.getByRole('row', { name: 'Beacon $2,100.00' }).isVisible()
      )
      .toBe(true);
    expect(
      requests.some(
        request =>
          request.queryId === 'costsByCustomer' &&
          request.params?.serviceName === 'Compute'
      )
    ).toBe(true);
    await detail
      .getByRole('button', { name: 'Explore Cost by customer', exact: true })
      .click();
    const evidence = app.getByRole('dialog', {
      name: 'Cost by customer',
      exact: true,
    });
    await expect
      .poll(() =>
        evidence
          .getByRole('heading', { name: 'Allocated cost', exact: true })
          .isVisible()
      )
      .toBe(true);
    await evidence.getByRole('tab', { name: 'Queries', exact: true }).click();
    await expect
      .poll(() =>
        evidence.getByText('costsByCustomer.sql', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => evidence.getByText('"Compute"', { exact: true }).isVisible())
      .toBe(true);
    await evidence
      .getByRole('button', { name: 'Close panel', exact: true })
      .click();
    await detail
      .getByRole('button', { name: 'Close panel', exact: true })
      .click();
    await chart.getByRole('button', { name: /^Logging.*Actions/ }).click();
    await app
      .getByRole('menuitem', { name: 'View customers', exact: true })
      .click();
    await expect
      .poll(() => detail.getByRole('row', { name: 'Atlas $0.00' }).isVisible())
      .toBe(true);
  });

  test('hosted customer detail retries a failed query', async ({ page }) => {
    let fail = true;
    await page.route('**/api/query', async route => {
      if (route.request().postDataJSON().queryId === 'costsByCustomer' && fail)
        await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    const chart = app.getByLabel('Costs by service', { exact: true });
    await chart.getByRole('button', { name: /^Compute.*Actions/ }).click();
    await app
      .getByRole('menuitem', { name: 'View customers', exact: true })
      .click();
    const detail = app.getByRole('dialog', {
      name: 'Customer costs',
      exact: true,
    });
    await expect.poll(() => detail.getByRole('alert').isVisible()).toBe(true);
    fail = false;
    await detail.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() =>
        detail.getByRole('row', { name: 'Cedar $900.00' }).isVisible()
      )
      .toBe(true);
  });

  test('local cost starter supports responsive customer drill-down', async ({
    mobilePage: page,
  }) => {
    await page.goto('/local-data-app');
    const chart = page.getByLabel('Costs by service', { exact: true });
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: /^Storage.*View customers$/ })
          .isVisible()
      )
      .toBe(true);
    await chart.getByRole('button', { name: /^Storage.*Actions/ }).click();
    await page
      .getByRole('menuitem', { name: 'View customers', exact: true })
      .click();
    const detail = page.getByRole('dialog', {
      name: 'Customer costs',
      exact: true,
    });
    await expect
      .poll(() =>
        detail.getByRole('row', { name: 'Beacon $2,800.00' }).isVisible()
      )
      .toBe(true);
  });

  test('focused host fixture keeps export and presentation snapshots covered', async ({
    page,
  }) => {
    let fail = false;
    const requests: { queryId: string; groupName: string }[] = [];
    await page.route('**/api/query', async route => {
      const payload = route.request().postDataJSON() as {
        queryId: string;
        params: { groupName: string };
      };
      requests.push({
        queryId: payload.queryId,
        groupName: payload.params.groupName,
      });
      if (fail) await route.fulfill({ status: 503, json: failure });
      else await route.continue();
    });
    await page.goto('/starter-authoring-features');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() => app.getByRole('row', { name: 'Alpha 2,200,000' }).isVisible())
      .toBe(true);
    await expect
      .poll(() =>
        page
          .getByRole('button', { name: 'Export CSV', exact: true })
          .isEnabled()
      )
      .toBe(true);

    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Beta');
    await expect
      .poll(() => app.getByRole('row', { name: 'Beta 0' }).isVisible())
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Sample total' })
          .getByText('0', { exact: true })
          .isVisible()
      )
      .toBe(true);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const downloadPath = await (await download).path();
    const csv = await readFile(downloadPath!, 'utf8');
    expect(csv).toContain('Beta,0');
    expect(csv).not.toContain('Alpha');

    fail = true;
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Alpha');
    await expect
      .poll(() =>
        app
          .getByRole('alert')
          .filter({
            hasText:
              'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.',
          })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => app.getByRole('row', { name: 'Beta 0' }).isVisible())
      .toBe(true);
    await expect
      .poll(() => app.getByRole('row', { name: 'Alpha 2,200,000' }).count())
      .toBe(0);

    const queryCountBeforeStory = requests.length;
    await page
      .getByRole('button', { name: 'Present story', exact: true })
      .click();
    const story = app.getByRole('dialog', {
      description: 'Demonstration values for group Beta.',
      exact: true,
    });
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 0' }).isVisible()
      )
      .toBe(true);
    expect(requests.length).toBe(queryCountBeforeStory);
    await story.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Counts by group' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => story.getByRole('row', { name: 'Beta 0' }).isVisible())
      .toBe(true);
    await expect
      .poll(() => story.getByRole('row', { name: 'Alpha 2,200,000' }).count())
      .toBe(0);
    await expect
      .poll(() =>
        story.getByRole('button', { name: 'Explore sources' }).isVisible()
      )
      .toBe(true);
  });

  test('hosted overview recovers from a query failure', async ({ page }) => {
    let fail = true;
    await page.route('**/api/query', async route => {
      if (fail) await route.fulfill({ status: 503, json: failure });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    const overview = app.getByRole('region', {
      name: 'Cost overview',
      exact: true,
    });
    await expect.poll(() => overview.getByRole('alert').isVisible()).toBe(true);
    fail = false;
    await overview.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: /^Compute.*View customers$/ })
          .isVisible()
      )
      .toBe(true);
  });

  test('empty customer allocations keep the overview available', async ({
    page,
  }) => {
    await page.route('**/api/query', async route => {
      if (route.request().postDataJSON().queryId !== 'costsByCustomer')
        return route.continue();
      const response = await route.fetch();
      const result = await response.json();
      await route.fulfill({ response, json: { ...result, rows: [] } });
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await app
      .getByRole('button', { name: /^Networking.*View customers$/ })
      .click();
    const detail = app.getByRole('dialog', {
      name: 'Customer costs',
      exact: true,
    });
    await expect
      .poll(() =>
        detail.getByText('No customer allocations', { exact: true }).isVisible()
      )
      .toBe(true);
    await detail
      .getByRole('button', { name: 'Close panel', exact: true })
      .click();
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Cost summary', exact: true })
          .getByText('$13,200.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
  });
});
