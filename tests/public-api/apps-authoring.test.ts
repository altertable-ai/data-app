import { describe, expect } from 'vitest';
import { test, localURL } from '@/tests/public-api/browser';

describe('authoring', () => {
  const failure = { error: 'Fixture unavailable' };

  test('single-file hosted example queries through the host and preserves displayed filters', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests: { statement: string; limit: number; host: boolean }[] = [];
    let fail = false;
    let release: (() => void) | undefined;
    let gate = new Promise<void>(resolve => {
      release = resolve;
    });
    await page.route('**/api/sql', async route => {
      const payload = route.request().postDataJSON();
      requests.push({
        ...payload,
        host: route.request().frame() === page.mainFrame(),
      });
      await gate;
      if (fail) await route.fulfill({ status: 503, json: failure });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('group', { name: 'Page actions', exact: true })
          .filter({ hasText: 'Loading data' })
          .isVisible()
      )
      .toBe(true);

    await expect
      .poll(() =>
        app
          .getByRole('heading', { name: 'Sample counts', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('heading', { name: 'Total samples', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Total samples', exact: true })
          .getByText('Sum of the fixture counts in the selected groups.', {
            exact: true,
          })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('heading', { name: 'Counts by group', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app.getByRole('row', { name: 'Alpha 3', exact: true }).count()
      )
      .toBe(0);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Present story', exact: true })
          .isDisabled()
      )
      .toBe(true);
    const stableActions = ['Explore data', 'Export CSV', 'Present story'].map(
      name => app.getByRole('button', { name, exact: true })
    );
    await expect.poll(() => stableActions[1]!.isDisabled()).toBe(true);

    release!();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Alpha 3', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Beta 0', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
    await expect.poll(() => stableActions[1]!.isEnabled()).toBe(true);
    await expect.poll(() => stableActions[2]!.isEnabled()).toBe(true);

    const width = await app
      .locator('html')
      .evaluate(element => element.clientWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const queryCountBeforeStory = requests.length;
    await app
      .getByRole('button', { name: 'Present story', exact: true })
      .click();
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story
          .getByRole('heading', { name: 'Total samples: 3', exact: true })
          .isVisible()
      )
      .toBe(true);
    await story.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect
      .poll(() =>
        story
          .getByRole('heading', { name: 'Counts by group', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        story
          .getByRole('button', { name: 'Explore sources', exact: true })
          .isVisible()
      )
      .toBe(true);

    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    expect(requests.length).toBe(queryCountBeforeStory);
    const group = app.getByRole('searchbox', { name: 'Group', exact: true });
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    await group.fill('Beta');
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('Showing all groups', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('status')
          .filter({ hasText: 'Showing all groups while loading group Beta…' })
          .isVisible()
      )
      .toBe(true);
    release!();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('Showing group Beta', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Alpha 3', exact: true })
          .filter({ visible: true })
          .count()
      )
      .toBe(0);
    fail = true;
    await group.fill('Alpha');
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('Showing group Beta', { exact: true })
          .isVisible()
      )
      .toBe(true);
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
    await app
      .getByRole('button', { name: 'Present story', exact: true })
      .click();
    await expect
      .poll(() =>
        story
          .getByRole('heading', { name: 'Total samples: 0', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        story.evaluate(element =>
          (element.getAttribute('aria-describedby') ?? '')
            .split(' ')
            .map(
              id => element.ownerDocument.getElementById(id)?.textContent ?? ''
            )
            .join(' ')
        )
      )
      .toBe('Demonstration values for group Beta.');
    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    fail = false;
    await app.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('Showing group Alpha', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await group.fill('missing');
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('No matching groups', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Present story', exact: true })
          .isDisabled()
      )
      .toBe(true);
    await group.fill("O'Reilly");
    await expect.poll(() => requests.at(-1)?.statement).toContain("O''Reilly");
    await expect
      .poll(() =>
        app
          .getByRole('main')
          .getByText('No matching groups', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await group.fill('');
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Alpha 3', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
    const before = requests.length;
    await app
      .getByRole('button', { name: 'Refresh data', exact: true })
      .click();
    await expect.poll(() => requests.length).toBeGreaterThan(before);
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Beta 0', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
    expect(
      requests.every(
        request =>
          request.host &&
          request.limit === 10 &&
          request.statement.includes('LIMIT 10')
      )
    ).toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Refresh data', exact: true })
          .isVisible()
      )
      .toBe(true);

    expect(errors).toEqual([]);
  });

  test('hosted initial query error recovers by retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/sql', async route => {
      if (fail) await route.fulfill({ status: 503, json: failure });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('alert')
          .filter({ hasText: 'Couldn’t load results' })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Export CSV', exact: true })
          .isDisabled()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('button', { name: 'Present story', exact: true })
          .isDisabled()
      )
      .toBe(true);
    fail = false;
    await app.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('row', { name: 'Alpha 3', exact: true })
          .filter({ visible: true })
          .isVisible()
      )
      .toBe(true);
  });

  test('local starter mounts, queries its server, refreshes and retries a failed check', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let fail = false;
    let release!: () => void;
    let gate = new Promise<void>(resolve => {
      release = resolve;
    });
    await page.route('**/api/data/connection', async route => {
      await gate;
      if (fail)
        await route.fulfill({
          status: 503,
          json: {
            error: {
              code: 'source_unavailable',
              message: 'Fixture unavailable',
            },
          },
        });
      else await route.continue();
    });
    await page.goto(localURL);
    await expect
      .poll(() =>
        page
          .getByRole('heading', { name: 'Checking connection…', exact: true })
          .isVisible()
      )
      .toBe(true);
    release();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        page
          .getByRole('heading', { name: 'Connected', exact: true })
          .isVisible()
      )
      .toBe(true);

    fail = true;
    await page
      .getByRole('button', { name: 'Check connection', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('alert')
          .filter({
            hasText: 'An earlier query succeeded, but the latest check failed.',
          })
          .isVisible()
      )
      .toBe(true);
    fail = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('heading', { name: 'Connected', exact: true })
          .isVisible()
      )
      .toBe(true);
    fail = true;
    await page.reload();
    await expect
      .poll(() =>
        page
          .getByRole('heading', {
            name: 'Connection not verified',
            exact: true,
          })
          .isVisible()
      )
      .toBe(true);
    fail = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('heading', { name: 'Connected', exact: true })
          .isVisible()
      )
      .toBe(true);

    expect(errors).toEqual([]);
  });
});
