import { readFile } from 'node:fs/promises';

import { describe, expect } from 'vitest';

import { test, localURL } from '@/tests/public-api/browser';

describe('authoring', () => {
  const failure = { error: 'Fixture unavailable' };

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

  test('hosted standalone starter presents measured values, zero, and empty states', async ({
    page,
  }) => {
    const requests: {
      queryId: string;
      limit: number;
      host: boolean;
      params: { groupName?: string; limit?: number };
    }[] = [];
    await page.route('**/api/query', async route => {
      requests.push({
        ...route.request().postDataJSON(),
        host: route.request().frame() === page.mainFrame(),
      });
      await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');

    await expect
      .poll(() => app.getByRole('row', { name: 'Alpha 2,200,000' }).isVisible())
      .toBe(true);
    await expect
      .poll(() => app.getByRole('row', { name: 'Beta 0' }).isVisible())
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Sample total' })
          .getByText('2.2M', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => page.getByRole('button', { name: 'Export CSV' }).count())
      .toBe(0);
    await expect
      .poll(() => page.getByRole('button', { name: 'Present story' }).count())
      .toBe(0);

    const group = app.getByRole('searchbox', { name: 'Group', exact: true });
    await group.fill('Beta');
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

    await group.fill('missing');
    await expect
      .poll(() =>
        app.getByText('No matching groups', { exact: true }).isVisible()
      )
      .toBe(true);

    expect(requests.map(request => request.queryId)).toContain(
      'sampleCountsByGroup'
    );
    expect(requests.map(request => request.queryId)).toContain('sampleTotal');
    expect(requests.every(request => request.host)).toBe(true);
    expect(
      requests
        .filter(request => request.queryId === 'sampleCountsByGroup')
        .every(request => request.limit === 10 && request.params.limit === 10)
    ).toBe(true);
    expect(
      requests
        .filter(request => request.queryId === 'sampleTotal')
        .every(request => request.limit === 1)
    ).toBe(true);
  });

  test('hosted starter recovers from an initial query failure', async ({
    page,
  }) => {
    let fail = true;
    await page.route('**/api/query', async route => {
      if (fail) await route.fulfill({ status: 503, json: failure });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    const overview = app.getByRole('region', {
      name: 'Sample overview',
      exact: true,
    });
    await expect.poll(() => overview.getByRole('alert').isVisible()).toBe(true);

    fail = false;
    await overview.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() => app.getByRole('row', { name: 'Alpha 2,200,000' }).isVisible())
      .toBe(true);
    await expect
      .poll(() => overview.getByText('2.2M', { exact: true }).isVisible())
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

  test('local standalone starter matches the hosted exploration states', async ({
    page,
  }) => {
    await page.goto('/local-data-app');
    await expect
      .poll(() =>
        page.getByRole('row', { name: 'Alpha 2,200,000' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => page.getByRole('button', { name: 'Export CSV' }).count())
      .toBe(0);

    const group = page.getByRole('searchbox', { name: 'Group', exact: true });
    await group.fill('Beta');
    await expect
      .poll(() => page.getByRole('row', { name: 'Beta 0' }).isVisible())
      .toBe(true);
    await expect
      .poll(() =>
        page
          .getByRole('region', { name: 'Sample total' })
          .getByText('0', { exact: true })
          .isVisible()
      )
      .toBe(true);

    await group.fill('missing');
    await expect
      .poll(() =>
        page.getByText('No matching groups', { exact: true }).isVisible()
      )
      .toBe(true);
  });
});
