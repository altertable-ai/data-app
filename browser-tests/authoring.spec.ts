import { expect, test } from '@playwright/test';

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
  await expect(app.getByText('Loading data')).toBeVisible();
  await expect(
    app.locator('.altertable-skeleton[data-inline]').first()
  ).toHaveCSS('vertical-align', 'middle');
  await expect(
    app.getByRole('heading', { name: 'Sample counts', exact: true })
  ).toBeVisible();
  await expect(app.getByText('Total samples', { exact: true })).toBeVisible();
  await expect(
    app.getByText('Sum of the fixture counts in the selected groups.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    app.getByRole('heading', { name: 'Counts by group', exact: true })
  ).toBeVisible();
  await expect(app.getByText('Alpha: 3', { exact: true })).toHaveCount(0);
  await expect(
    app.getByRole('button', { name: 'Present story', exact: true })
  ).toBeDisabled();
  const stableActions = ['Explore data', 'Export CSV', 'Present story'].map(
    name => app.getByRole('button', { name, exact: true })
  );
  await expect(stableActions[1]!).toBeDisabled();
  const loadingPositions = await Promise.all(
    stableActions.map(action => action.boundingBox())
  );
  release!();
  gate = Promise.resolve();
  await expect(
    app.getByText('Alpha: 3', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  await expect(
    app.getByText('Beta: 0', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  await expect(stableActions[1]!).toBeEnabled();
  await expect(stableActions[2]!).toBeEnabled();
  expect(
    await Promise.all(stableActions.map(action => action.boundingBox()))
  ).toEqual(loadingPositions);
  await expect(app.locator('style[data-altertable-styles]')).toHaveCount(1);
  const width = await app
    .locator('html')
    .evaluate(element => element.clientWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const queryCountBeforeStory = requests.length;
  await app.getByRole('button', { name: 'Present story', exact: true }).click();
  const story = app.getByRole('dialog');
  await expect(
    story.getByRole('heading', { name: 'Alpha has 3 samples', exact: true })
  ).toBeVisible();
  await story.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(
    story.getByRole('heading', { name: 'Beta has 0 samples', exact: true })
  ).toBeVisible();
  await expect(
    story.getByRole('button', { name: 'Explore sources', exact: true })
  ).toBeVisible();
  await expect(story).toHaveCSS('opacity', '1');
  await page
    .locator('iframe')
    .screenshot({ path: test.info().outputPath('story.png') });
  await test.info().attach('Presented story', {
    path: test.info().outputPath('story.png'),
    contentType: 'image/png',
  });
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  expect(requests.length).toBe(queryCountBeforeStory);
  async function selectGroup(value: string) {
    await app.getByRole('button', { name: /^Group:/ }).click();
    if (value === '') {
      await app.getByRole('option', { name: 'Empty', exact: true }).click();
      return;
    }
    const search = app.getByRole('searchbox', { name: 'Search group values' });
    await search.fill(value);
    await search.press('Enter');
  }
  gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await selectGroup('Beta');
  await expect(
    app.getByText('Showing all groups', { exact: true })
  ).toBeVisible();
  await expect(
    app.getByText('Showing all groups while loading group Beta…')
  ).toBeVisible();
  release!();
  gate = Promise.resolve();
  await expect(app.getByText('Showing Beta', { exact: true })).toBeVisible();
  await expect(
    app.getByText('Alpha: 3', { exact: true }).filter({ visible: true })
  ).toHaveCount(0);
  fail = true;
  await selectGroup('Alpha');
  await expect(app.getByText('Showing Beta', { exact: true })).toBeVisible();
  await expect(
    app.getByText(
      'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.'
    )
  ).toBeVisible();
  await app.getByRole('button', { name: 'Present story', exact: true }).click();
  await expect(
    story.getByRole('heading', { name: 'Beta has 0 samples', exact: true })
  ).toBeVisible();
  await expect(story).toHaveAccessibleDescription(
    'Demonstration values for Beta.'
  );
  await story
    .getByRole('button', { name: 'Exit presentation', exact: true })
    .click();
  fail = false;
  await app.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(app.getByText('Showing Alpha', { exact: true })).toBeVisible();
  await selectGroup('missing');
  await expect(
    app.getByText('No matching groups', { exact: true })
  ).toBeVisible();
  await expect(
    app.getByRole('button', { name: 'Present story', exact: true })
  ).toBeDisabled();
  await selectGroup("O'Reilly");
  await expect.poll(() => requests.at(-1)?.statement).toContain("O''Reilly");
  await expect(
    app.getByText('No matching groups', { exact: true })
  ).toBeVisible();
  await selectGroup('');
  await expect(
    app.getByText('Alpha: 3', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  const before = requests.length;
  await app.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(before);
  await expect(
    app.getByText('Beta: 0', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  expect(
    requests.every(
      request =>
        request.host &&
        request.limit === 10 &&
        request.statement.includes('LIMIT 10')
    )
  ).toBe(true);
  await expect(
    app.getByRole('button', { name: 'Refresh data', exact: true })
  ).toBeVisible();
  await page.locator('iframe').screenshot({
    path: test.info().outputPath('example.png'),
  });
  await test.info().attach('Rendered example', {
    path: test.info().outputPath('example.png'),
    contentType: 'image/png',
  });
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
  await expect(
    app.getByText('Couldn’t load results', { exact: true })
  ).toBeVisible();
  await expect(
    app.getByRole('button', { name: 'Export CSV', exact: true })
  ).toBeDisabled();
  await expect(
    app.getByRole('button', { name: 'Present story', exact: true })
  ).toBeDisabled();
  fail = false;
  await app.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    app.getByText('Alpha: 3', { exact: true }).filter({ visible: true })
  ).toBeVisible();
});

test('local starter mounts, queries its server, refreshes and retries a failed check', async ({
  page,
  baseURL,
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
          error: { code: 'source_unavailable', message: 'Fixture unavailable' },
        },
      });
    else await route.continue();
  });
  const local = new URL(baseURL!);
  local.port = String(Number(local.port) + 2);
  await page.goto(local.href);
  await expect(
    page.getByRole('heading', { name: 'Checking connection…', exact: true })
  ).toBeVisible();
  release();
  gate = Promise.resolve();
  await expect(
    page.getByRole('heading', { name: 'Connected', exact: true })
  ).toBeVisible();
  await expect(page.locator('style[data-altertable-styles]')).toHaveCount(1);
  fail = true;
  await page
    .getByRole('button', { name: 'Check connection', exact: true })
    .click();
  await expect(
    page.getByText('An earlier query succeeded, but the latest check failed.', {
      exact: false,
    })
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Connected', exact: true })
  ).toBeVisible();
  fail = true;
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Connection not verified', exact: true })
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Connected', exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('example.png'),
    fullPage: true,
  });
  await test.info().attach('Rendered example', {
    path: test.info().outputPath('example.png'),
    contentType: 'image/png',
  });
  expect(errors).toEqual([]);
});
