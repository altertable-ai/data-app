import { describe, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
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
      .poll(() => app.getByText('Loading data').isVisible())
      .toBe(true);

    await expect
      .poll(() =>
        app
          .getByRole('heading', { name: 'Sample counts', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => app.getByText('Total samples', { exact: true }).isVisible())
      .toBe(true);
    await expect
      .poll(() =>
        app
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
        app.getByText('Showing all groups', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByText('Showing all groups while loading group Beta…')
          .isVisible()
      )
      .toBe(true);
    release!();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app.getByText('Showing group Beta', { exact: true }).isVisible()
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
        app.getByText('Showing group Beta', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByText(
            'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.'
          )
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
        app.getByText('Showing group Alpha', { exact: true }).isVisible()
      )
      .toBe(true);
    await group.fill('missing');
    await expect
      .poll(() =>
        app.getByText('No matching groups', { exact: true }).isVisible()
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
        app.getByText('No matching groups', { exact: true }).isVisible()
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
        app.getByText('Couldn’t load results', { exact: true }).isVisible()
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
          .getByText(
            'An earlier query succeeded, but the latest check failed.',
            {
              exact: false,
            }
          )
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

describe('export', () => {
  async function contents(download: import('playwright').Download) {
    const path = await download.path();
    expect(path).not.toBeNull();
    return readFile(path!, 'utf8');
  }

  test('standalone toolbar downloads a UTF-8 CSV with escaped cells', async ({
    page,
  }) => {
    await page.goto('/static');
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('gallery.csv');
    expect(await contents(download)).toBe(
      '\uFEFFName,Count\r\n"München, ""East""",0\r\n"Two\nlines",\r\n\'=1+1,-10\r\n\' +SUM(A1),false\r\n\'@SUM(A1),true\r\n'
    );
  });

  test('embedded toolbar exports displayed results through its host during updates and failures', async ({
    page,
  }) => {
    let release!: () => void;
    let gate = new Promise<void>(resolve => {
      release = resolve;
    });
    let fail = false;
    await page.route('**/api/sql', async route => {
      await gate;
      if (fail)
        await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      else await route.continue();
    });
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() => app.getByText('Loading data').isVisible())
      .toBe(true);
    await expect
      .poll(() => app.getByRole('button', { name: 'Export CSV' }).isDisabled())
      .toBe(true);
    release();
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
      .poll(() => page.locator('iframe').getAttribute('sandbox'))
      .toBe('allow-scripts');

    async function expectExport(filename: string, csv: string) {
      const downloaded = page.waitForEvent('download');
      await app
        .getByRole('button', { name: 'Export CSV', exact: true })
        .click();
      const download = await downloaded;
      expect(download.suggestedFilename()).toBe(filename);
      expect(await contents(download)).toBe(csv);
    }

    await expectExport(
      'sample-counts-all-groups.csv',
      '\uFEFFGroup,Sample count\r\nAlpha,3\r\nBeta,0\r\n'
    );
    gate = new Promise<void>(resolve => {
      release = resolve;
    });
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Beta');
    await expect
      .poll(() =>
        app
          .getByText('Showing all groups while loading group Beta…')
          .isVisible()
      )
      .toBe(true);
    await expectExport(
      'sample-counts-all-groups.csv',
      '\uFEFFGroup,Sample count\r\nAlpha,3\r\nBeta,0\r\n'
    );
    release();
    gate = Promise.resolve();
    await expect
      .poll(() =>
        app.getByText('Showing group Beta', { exact: true }).isVisible()
      )
      .toBe(true);
    fail = true;
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('Alpha');
    await expect
      .poll(() =>
        app
          .getByText(
            'Couldn’t refresh. Showing group Beta while group Alpha is unavailable.'
          )
          .isVisible()
      )
      .toBe(true);
    await expectExport(
      'sample-counts-group-beta.csv',
      '\uFEFFGroup,Sample count\r\nBeta,0\r\n'
    );
    fail = false;
    await app
      .getByRole('searchbox', { name: 'Group', exact: true })
      .fill('missing');
    await expect
      .poll(() =>
        app.getByText('No matching groups', { exact: true }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => app.getByRole('button', { name: 'Export CSV' }).isDisabled())
      .toBe(true);
  });

  test('embedded export failures stay visible and allow retry', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?export-error');
    const app = page.frameLocator('iframe');
    const button = app.getByRole('button', { name: 'Export CSV', exact: true });
    await button.click();
    await expect
      .poll(() => app.getByRole('alert').textContent())
      .toBe('Couldn’t export data.Try again');

    await expect.poll(() => button.isEnabled()).toBe(true);
    await page
      .getByRole('button', { name: 'Allow exports', exact: true })
      .click();
    const downloaded = page.waitForEvent('download');
    await app.getByRole('button', { name: 'Try again', exact: true }).click();
    expect((await downloaded).suggestedFilename()).toBe(
      'sample-counts-all-groups.csv'
    );
    await expect.poll(() => app.getByRole('alert').count()).toBe(0);
    await expect.poll(() => button.isEnabled()).toBe(true);
  });

  for (const embedded of [false, true])
    test(`multiple datasets export CSVs and a ZIP ${embedded ? 'through the iframe host' : 'standalone'}`, async ({
      page,
    }) => {
      await page.goto(embedded ? '/bundle-host' : '/static?multiple-exports');
      const app = embedded ? page.frameLocator('iframe') : page;
      const button = app.getByRole('button', { name: 'Export', exact: true });
      await button.focus();
      await expect
        .poll(() => app.getByRole('tooltip').textContent())
        .toBe('Export data…');
      await button.press('ArrowDown');
      await expect
        .poll(() =>
          app
            .getByRole('option', { name: 'Export Counts CSV', exact: true })
            .evaluate(
              element => element === element.ownerDocument.activeElement
            )
        )
        .toBe(true);
      let downloaded = page.waitForEvent('download');
      await app
        .getByRole('option', { name: 'Export Summary CSV', exact: true })
        .click();
      let download = await downloaded;
      expect(download.suggestedFilename()).toBe('Summary.csv');
      expect(await contents(download)).toBe('\uFEFFTotal\r\n0\r\n');
      await button.click();
      downloaded = page.waitForEvent('download');
      await app
        .getByRole('option', { name: 'Export all ZIP', exact: true })
        .click();
      download = await downloaded;
      expect(download.suggestedFilename()).toBe('gallery.zip');
      const files = unzipSync(await readFile((await download.path())!));
      expect(Object.keys(files)).toEqual(['Counts.csv', 'Summary.csv']);
      expect(Array.from(files['Summary.csv']!.slice(0, 3))).toEqual([
        239, 187, 191,
      ]);
      expect(strFromU8(files['Summary.csv']!)).toBe('Total\r\n0\r\n');
      await button.click();
      downloaded = page.waitForEvent('download');
      await app
        .getByRole('option', { name: 'Export all ZIP', exact: true })
        .click();
      expect((await downloaded).suggestedFilename()).toBe('gallery.zip');
      await button.click();

      await app.getByRole('listbox').press('Escape');
      await expect.poll(() => app.getByRole('listbox').count()).toBe(0);
      await expect
        .poll(() =>
          button.evaluate(
            element => element === element.ownerDocument.activeElement
          )
        )
        .toBe(true);
    });
});

describe('present', () => {
  test('a hosted story enters fullscreen and restores the exploration on close', async ({
    page,
  }) => {
    await page.goto('/starter-data-app');
    const app = page.frameLocator('iframe');
    const launch = app.getByRole('button', {
      name: 'Present story',
      exact: true,
    });
    await launch.click();
    await expect
      .poll(() => page.locator('iframe:fullscreen').isVisible())
      .toBe(true);
    await expect
      .poll(() => app.locator('html:fullscreen').isVisible())
      .toBe(true);
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 3' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() => page.url())
      .toMatch(/present=1.*step=total-samples/);
    await story.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Counts by group' }).isVisible()
      )
      .toBe(true);

    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
    await expect
      .poll(() =>
        launch.evaluate(
          element => element === element.ownerDocument.activeElement
        )
      )
      .toBe(true);
  });

  test('a saved presentation opens without fullscreen or a user gesture', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?present=1&step=counts-by-group');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() =>
        app
          .getByRole('dialog')
          .getByRole('heading', { name: 'Counts by group' })
          .isVisible()
      )
      .toBe(true);
    await expect.poll(() => app.locator(':fullscreen').count()).toBe(0);
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await page.keyboard.press('Escape');
    await expect.poll(() => app.getByRole('dialog').count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });

  test('a host denying fullscreen still allows the story to open and close', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?no-fullscreen=1');
    const app = page.frameLocator('iframe');
    await app
      .getByRole('button', { name: 'Present story', exact: true })
      .click();
    const story = app.getByRole('dialog');
    await expect
      .poll(() =>
        story.getByRole('heading', { name: 'Total samples: 3' }).isVisible()
      )
      .toBe(true);
    await expect.poll(() => page.locator(':fullscreen').count()).toBe(0);
    await story
      .getByRole('button', { name: 'Exit presentation', exact: true })
      .click();
    await expect.poll(() => story.count()).toBe(0);
    await expect.poll(() => page.url()).not.toMatch(/present=1/);
  });
});

describe('runtime-errors', () => {
  test('uncaught React rendering failures hide the app and offer retry', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Crash render' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(() =>
        page
          .frameLocator('iframe')
          .getByRole('button', { name: 'Query', exact: true })
          .isVisible()
      )
      .toBe(true);
  });

  for (const failure of ['syntax', 'execution']) {
    test(`bundle ${failure} failures hide the app`, async ({ page }) => {
      await page.goto(`/bundle-host?broken=1&${failure}=1`);
      await expect
        .poll(() => page.getByRole('alert').textContent())
        .toContain('Could not load');
      await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
    });
  }

  test('delayed exceptions from the app bundle remain fatal', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Crash callback' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
  });

  test('unhandled rejections from the app bundle remain fatal', async ({
    page,
  }) => {
    await page.goto('/bundle-host');
    await page
      .frameLocator('iframe')
      .getByRole('button', { name: 'Reject promise' })
      .click();
    await expect
      .poll(() => page.getByRole('alert').textContent())
      .toContain('Could not load');
    await expect.poll(() => page.locator('iframe').isVisible()).toBe(false);
  });
});

test('a report formats values, searches all loaded rows and paginates the visible table', async ({
  page,
}) => {
  await page.goto('/static');
  await expect
    .poll(() => page.getByText('12,345', { exact: true }).isVisible())
    .toBe(true);
  await expect
    .poll(() => page.getByText('11.6%', { exact: true }).isVisible())
    .toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Unavailable', exact: true })
        .getByText('—', { exact: true })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Measured zero 0', exact: true })
        .isVisible()
    )
    .toBe(true);
  const search = page.getByRole('searchbox', { name: 'Search groups' });
  await search.fill('Group 9');
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Group 9 9', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Measured zero 0', exact: true }).count()
    )
    .toBe(0);
  await search.fill('missing');
  await expect
    .poll(() =>
      page.getByText('No matching events', { exact: true }).isVisible()
    )
    .toBe(true);
  await search.fill('cafe');
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Café <table> 1234', exact: true })
        .isVisible()
    )
    .toBe(true);
  await search.fill('');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Group 9 9', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('row', { name: 'Café <table> 1234', exact: true }).count()
    )
    .toBe(0);
  await page
    .getByRole('button', { name: 'Previous page', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('row', { name: 'Café <table> 1234', exact: true })
        .isVisible()
    )
    .toBe(true);
});

test('primary and independent sections retain their own displayed input and inspection evidence', async ({
  page,
}) => {
  await page.goto('/declared-app');
  await page
    .getByRole('button', { name: 'Resolve alpha 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Resolve beta', exact: true }).click();
  await expect
    .poll(() =>
      page.getByTestId('secondary').filter({ visible: true }).textContent()
    )
    .toBe('1');
  await page.getByRole('searchbox', { name: 'Version', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Show primary', exact: true }).click();
  await expect
    .poll(() =>
      page.getByTestId('primary').filter({ visible: true }).textContent()
    )
    .toBe('1 for 1');
  await page.getByRole('button', { name: 'Explore Beta', exact: true }).click();
  const inspection = page.getByRole('dialog');
  await expect
    .poll(() => inspection.textContent())
    .toContain('Only the beta section owns this glossary entry.');
  await inspection.getByRole('tab', { name: 'Queries', exact: true }).click();
  await expect.poll(() => inspection.textContent()).toContain('SELECT beta');
  await expect
    .poll(() => inspection.textContent())
    .not.toContain('SELECT alpha');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Resolve alpha 2', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByTestId('primary').filter({ visible: true }).textContent()
    )
    .toBe('2 for 2');
});

test('a bound visualization retains its selected view and displayed data while refreshing', async ({
  page,
}) => {
  await page.goto('/declared-app');
  await page.getByRole('button', { name: 'Show primary', exact: true }).click();
  await page
    .getByRole('button', { name: 'Resolve alpha 1', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByTestId('primary-visual').filter({ visible: true }).textContent()
    )
    .toBe('1');
  await page.getByRole('tab', { name: 'Doubled', exact: true }).click();
  await expect
    .poll(() =>
      page.getByTestId('primary-visual').filter({ visible: true }).textContent()
    )
    .toBe('2');
  await page.getByRole('searchbox', { name: 'Version', exact: true }).fill('2');
  await expect
    .poll(() =>
      page.getByTestId('primary-visual').filter({ visible: true }).textContent()
    )
    .toBe('2');
  await page
    .getByRole('button', { name: 'Resolve alpha 2', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByTestId('primary-visual').filter({ visible: true }).textContent()
    )
    .toBe('4');
});

test('repeated public widgets share one inspection sheet and controlled inspection follows its owner', async ({
  page,
}) => {
  await page.goto('/inspection-app?controlled');
  await page
    .getByRole('button', { name: 'Explore Summary', exact: true })
    .click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Explore Repeated count', exact: true })
    .click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Accept open', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('dialog')
        .getByRole('heading', { name: 'Controlled', exact: true })
        .isVisible()
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Accept close', exact: true }).click();
  await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
});

for (const mode of ['bridge-host', 'bundle-host']) {
  test(`the ${mode} correlates concurrent queries and cancels host work when its caller aborts`, async ({
    page,
  }) => {
    await page.goto(`/${mode}`);
    const app = page.frameLocator('iframe');
    const result = app.locator(
      mode === 'bridge-host' ? '#result' : '#transport-result'
    );
    await app
      .getByRole('button', { name: 'Concurrent queries', exact: true })
      .click();
    await expect
      .poll(async () => JSON.parse((await result.textContent()) || '[]'))
      .toEqual(
        Array.from({ length: 50 }, (_, index) => ({
          period: String(index),
          version: 1,
        }))
      );
    await app
      .getByRole('button', { name: 'Wait for query', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Pending requests', exact: true })
          .textContent()
      )
      .toBe('1');
    await app
      .getByRole('button', { name: 'Cancel query', exact: true })
      .click();
    await expect.poll(() => result.textContent()).toBe('AbortError');
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Cancelled requests', exact: true })
          .textContent()
      )
      .toBe('1');
  });

  test(`the ${mode} rejects messages from another window and from stale sessions`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.addEventListener('message', event => {
        if (event.data?.type === 'bridge:request')
          Object.assign(window, { capturedRequest: event.data });
      });
    });
    await page.goto(`/${mode}`);
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Echo requests', exact: true })
          .textContent()
      )
      .toBe('1');
    const captured = await page.evaluate(() =>
      Reflect.get(window, 'capturedRequest')
    );
    await page.evaluate(
      packet => window.postMessage({ ...packet, id: 'foreign-source' }, '*'),
      captured
    );
    const frame = page.frames().find(frame => frame !== page.mainFrame())!;
    await frame.evaluate(packet => {
      parent.postMessage(
        { ...packet, id: 'stale-session', sessionId: 'old-session' },
        '*'
      );
      if (packet.token)
        parent.postMessage(
          { ...packet, id: 'stale-token', token: 'old-token' },
          '*'
        );
      parent.postMessage(
        { ...packet, id: 'malformed', payload: { period: 1 } },
        '*'
      );
    }, captured);
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() =>
        page
          .getByRole('status', { name: 'Echo requests', exact: true })
          .textContent()
      )
      .toBe('2');
  });
}

test('a host cancels timed-out queries and aborts old work when the iframe reloads', async ({
  page,
}) => {
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect.poll(() => app.locator('#result').textContent()).toBe('timeout');
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Cancelled requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await page
    .getByRole('button', { name: 'Replace iframe', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Cancelled requests', exact: true })
        .textContent()
    )
    .toBe('2');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toContain('"version":1');
});

test('calendar and dimension controls preserve comparisons, measured zero, and URL state', async ({
  page,
}) => {
  await page.goto('/time-app');
  await expect
    .poll(() =>
      page.getByText(/^Displayed period: Mar 4–6, 2026 UTC/).isVisible()
    )
    .toBe(true);
  await page.getByRole('button', { name: /^Choose dates/ }).click();
  await page
    .getByRole('checkbox', {
      name: 'Compare with previous period',
      exact: true,
    })
    .check();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.url()).toContain('compare=previous');
  await page.getByRole('button', { name: 'Region: All', exact: true }).click();
  await page.getByRole('option', { name: 'Europe', exact: true }).click();
  await expect
    .poll(() =>
      page.getByText('Measured events: 0', { exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByText(/^Displayed period: Mar 4–6, 2026 UTC/).isVisible()
    )
    .toBe(true);
  const selected = page.url();
  await page.reload();
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Region: Europe', exact: true })
        .isVisible()
    )
    .toBe(true);
  await expect.poll(() => page.url()).toBe(selected);
  await page.goto('/time-app?start=invalid&end=invalid&region=forged');
  await expect
    .poll(() =>
      page.getByText(/^Displayed period: Mar 4–6, 2026 UTC/).isVisible()
    )
    .toBe(true);
});

test('separate data clients isolate their results and facet choices when an app switches clients', async ({
  page,
}) => {
  await page.goto('/clients');
  const selected = page.getByRole('region', {
    name: 'Selected client',
    exact: true,
  });
  const independent = page.getByRole('region', {
    name: 'Independent client',
    exact: true,
  });
  await page.getByRole('button', { name: 'Resolve A', exact: true }).click();
  await expect
    .poll(() => selected.getByText('A: 11', { exact: true }).isVisible())
    .toBe(true);
  await expect
    .poll(() => independent.getByText('A: 11', { exact: true }).count())
    .toBe(0);
  await page
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'A category', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'B category', exact: true }).count()
    )
    .toBe(0);
  await page
    .getByRole('searchbox', { name: 'Search category values', exact: true })
    .press('Escape');
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page
        .getByRole('dialog', { name: 'Category options', exact: true })
        .count()
    )
    .toBe(0);
  await page
    .getByRole('button', { name: 'Switch client', exact: true })
    .click();
  await expect
    .poll(() => selected.getByText('A: 11', { exact: true }).count())
    .toBe(0);
  await page.getByRole('button', { name: 'Resolve B', exact: true }).click();
  await expect
    .poll(() => selected.getByText('B: 22', { exact: true }).isVisible())
    .toBe(true);
  await expect
    .poll(() => independent.getByText('B: 22', { exact: true }).isVisible())
    .toBe(true);
  await page
    .getByRole('button', { name: 'Category: All', exact: true })
    .click();
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'B category', exact: true }).isVisible()
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByRole('option', { name: 'A category', exact: true }).count()
    )
    .toBe(0);
});

for (const source of ['bundle', 'url']) {
  test(`an embedded ${source} app queries through the host and restores navigation after reload`, async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/'))
        requests.push(request.frame() === page.mainFrame() ? 'host' : 'app');
    });
    await page.goto(
      `/bundle-host?${source === 'url' ? 'url=1&' : ''}period=last-30#totals`
    );
    const app = page.frameLocator('iframe');
    await expect
      .poll(() => app.locator('#location').textContent())
      .toContain('period=last-30');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() => app.locator('#result').textContent())
      .toContain('"version":1');
    await page
      .getByRole('button', { name: 'Change handler', exact: true })
      .click();
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() => app.locator('#result').textContent())
      .toContain('"version":2');
    if (source === 'bundle') {
      await app
        .getByRole('button', { name: 'Data query', exact: true })
        .click();
      await expect
        .poll(() => app.locator('#result').textContent())
        .toContain('sql-query');
      await app
        .getByRole('button', { name: 'Denied query', exact: true })
        .click();
      await expect
        .poll(() => app.locator('#result').textContent())
        .toBe('{"publicError":true,"code":"forbidden"}');
      expect(requests).toEqual(['host', 'host']);
    }
    await app.getByRole('button', { name: 'Last 7 days', exact: true }).click();
    await expect.poll(() => page.url()).toContain('period=last-7');
    await page.goBack();
    await expect
      .poll(() => app.locator('#location').textContent())
      .toContain('period=last-30');
    await page.goForward();
    await expect
      .poll(() => app.locator('#location').textContent())
      .toContain('period=last-7');
    const frame = page.frames().find(frame => frame !== page.mainFrame())!;
    expect(
      await frame.evaluate(() => {
        try {
          void parent.document;
          return false;
        } catch {
          return true;
        }
      })
    ).toBe(true);
    await frame.evaluate(() => location.reload());
    await expect
      .poll(() => app.locator('#location').textContent())
      .toContain('period=last-7');
    await app.getByRole('button', { name: 'Query', exact: true }).click();
    await expect
      .poll(() => app.locator('#result').textContent())
      .toContain('"version":2');
  });
}

test('iframe log delivery follows the current public host logger and can be disabled', async ({
  page,
}) => {
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  const entries: unknown[][] = [
    [1, 'log', 'plain'],
    [1, 'info', 'completed', { rows: 3 }],
    [1, 'warn', 'slow'],
    [1, 'error', 'failed'],
  ];
  await expect
    .poll(() => page.locator('#logs').textContent())
    .toBe(JSON.stringify(entries));
  await page
    .getByRole('button', { name: 'Change handler', exact: true })
    .click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  entries.push(...entries.map(([, ...entry]) => [2, ...entry]));
  await expect
    .poll(() => page.locator('#logs').textContent())
    .toBe(JSON.stringify(entries));
  await page
    .getByRole('button', { name: 'Toggle logging', exact: true })
    .click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toContain('"version":2');
  expect(await page.locator('#logs').textContent()).toBe(
    JSON.stringify(entries)
  );
});

test('a failed embedded app can recover with a corrected bundle and bootstrap failures settle', async ({
  page,
}) => {
  await page.goto('/bundle-host?broken=1');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain('Could not load');
  await page.getByRole('button', { name: 'Fix bundle', exact: true }).click();
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Query', exact: true })
    .click();
  await expect
    .poll(() => page.frameLocator('iframe').locator('#result').textContent())
    .toContain('"version":1');
  await page.goto('/bundle-host?timeout=1');
  await expect
    .poll(() => page.getByRole('alert').textContent())
    .toContain('Could not load');
});

for (const width of [375, 1280]) {
  test(`a report remains readable at ${width}px while loading, empty, failed, ready and stale`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let respond: ((data: number[] | null) => void) | undefined;
    await page.route('**/layout-data/activity', async route => {
      const data = await new Promise<number[] | null>(resolve => {
        respond = resolve;
      });
      if (data === null)
        await route.fulfill({
          status: 503,
          json: {
            error: { code: 'unavailable', message: 'Activity unavailable' },
          },
        });
      else
        await route.fulfill({
          json: {
            data,
            requestId: 'activity',
            queriedAt: '2026-10-07T00:00:00Z',
            queryIds: [],
            queries: [],
          },
        });
    });
    async function readable() {
      await expect
        .poll(() =>
          page.getByRole('heading', { name: 'Activity overview' }).isVisible()
        )
        .toBe(true);
      const geometry = await page.getByRole('main').evaluate(element => {
        const rect = element.getBoundingClientRect();
        const sections = element.querySelector(
          '[aria-label="Report sections"]'
        )!;
        const children = [...sections.children].map(child =>
          child.getBoundingClientRect()
        );
        return {
          left: rect.left,
          right: rect.right,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          gaps: children
            .slice(1)
            .map((child, index) => child.top - children[index]!.bottom),
        };
      });
      expect(geometry.left).toBeGreaterThan(0);
      expect(geometry.right).toBeLessThan(geometry.width);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
      expect(geometry.gaps.every(gap => gap > 0)).toBe(true);
    }
    await page.goto('/layout');
    await expect
      .poll(() => page.getByText('Loading data', { exact: true }).isVisible())
      .toBe(true);
    await readable();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!(null);
    await expect
      .poll(() =>
        page.getByText('Couldn’t load results', { exact: true }).isVisible()
      )
      .toBe(true);
    await readable();
    respond = undefined;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!([]);
    await expect
      .poll(() => page.getByText('No activity', { exact: true }).isVisible())
      .toBe(true);
    await readable();
    respond = undefined;
    await page
      .getByRole('button', { name: 'Refresh data', exact: true })
      .click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    respond!([42]);
    const cards = page.getByLabel('Activity cards');
    await expect.poll(() => cards.isVisible()).toBe(true);
    await readable();
    const positions = await cards.evaluate(element =>
      [...element.children].map(child => {
        const rect = child.getBoundingClientRect();
        return {
          left: rect.left,
          width: rect.width,
          top: rect.top,
          bottom: rect.bottom,
        };
      })
    );
    expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
    if (width === 375)
      expect(Math.abs(positions[0]!.width - positions[1]!.width)).toBeLessThan(
        1
      );
    else expect(positions[0]!.width).toBeGreaterThan(positions[1]!.width);
    respond = undefined;
    await page
      .getByRole('button', { name: 'Refresh data', exact: true })
      .click();
    await expect.poll(() => Boolean(respond)).toBe(true);
    await readable();
    expect(await cards.getByText('42', { exact: true }).count()).toBe(2);
    respond!(null);
    await expect
      .poll(() => page.getByText(/Couldn’t refresh/).isVisible())
      .toBe(true);
    await readable();
    expect(await cards.getByText('42', { exact: true }).count()).toBe(2);
  });
}

test('a report explicitly installs styles under CSP and can style another document independently', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/styles');
  const grid = page.getByLabel('Report grid');
  await expect.poll(() => grid.count()).toBe(1);
  expect(
    await grid.evaluate(element => getComputedStyle(element).display)
  ).toBe('block');
  await page
    .getByRole('button', { name: 'Style other report', exact: true })
    .click();
  const other = page.frameLocator('iframe').getByLabel('Report grid');
  await expect
    .poll(() => other.evaluate(element => getComputedStyle(element).display))
    .toBe('grid');
  expect(
    await grid.evaluate(element => getComputedStyle(element).display)
  ).toBe('block');
  await page.getByRole('button', { name: 'Style report', exact: true }).click();
  await expect
    .poll(() => grid.evaluate(element => getComputedStyle(element).display))
    .toBe('grid');
  await page.getByRole('button', { name: 'Style report', exact: true }).click();
  expect(await page.locator('#identity').textContent()).toBe(
    'Reused stylesheet'
  );
  expect(errors).toEqual([]);
});

test('a report formats missing values, precise ratios, localized numbers and calendar ranges without ambiguity', async ({
  page,
}) => {
  await page.goto('/static');
  for (const row of [
    'Rounded number 12.35',
    'Negative zero 0',
    'Compact count 12.3K',
    'Fractional count —',
    'Negative count —',
    'Nonfinite value —',
    'Custom missing label Unknown',
    'Small ratio 0.12%',
    'Tiny positive ratio <0.01%',
    'Tiny negative ratio >−0.01%',
    'Measured zero ratio 0%',
    'Currency $12.50',
    'Localized number 1.234,5',
    'Same month Sep 25–27, 2026',
    'Cross month Aug 30–Sep 28, 2026',
    'Cross year Dec 30, 2025–Jan 2, 2026',
    'Single day Sep 28, 2026',
    'Singular label 1 event',
    'Plural label 0 events',
  ]) {
    await expect
      .poll(() => page.getByRole('row', { name: row, exact: true }).isVisible())
      .toBe(true);
  }
});

test('a failing consumer logger cannot interrupt iframe queries', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app
    .getByRole('button', { name: 'Write failing logs', exact: true })
    .click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toBe('App continued after logging');
  await page.getByRole('button', { name: 'Break logger', exact: true }).click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toContain('"version":1');
  expect(await page.locator('#logs').textContent()).toBe('[]');
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Break logger', exact: true }).click();
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await expect
    .poll(async () => JSON.parse((await page.locator('#logs').textContent())!))
    .toHaveLength(4);
});

test('foreign and malformed iframe log messages cannot invoke the host logger', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener('message', event => {
      if (event.data?.type === 'runtime:log')
        Object.assign(window, { capturedLog: event.data });
    });
  });
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Write logs', exact: true }).click();
  await expect
    .poll(async () => JSON.parse((await page.locator('#logs').textContent())!))
    .toHaveLength(4);
  const original = await page.locator('#logs').textContent();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(Reflect.get(window, 'capturedLog')))
    )
    .toBe(true);
  const packet = await page.evaluate(() => Reflect.get(window, 'capturedLog'));
  await page.evaluate(value => window.postMessage(value, '*'), packet);
  const frame = page.frames().find(frame => frame !== page.mainFrame())!;
  await frame.evaluate(value => {
    parent.postMessage({ ...value, sessionId: 'old-session' }, '*');
    parent.postMessage(
      { ...value, payload: { method: 'constructor', args: ['failed'] } },
      '*'
    );
    parent.postMessage(
      { ...value, payload: { method: 'error', args: 'failed' } },
      '*'
    );
  }, packet);
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toContain('"version":1');
  expect(await page.locator('#logs').textContent()).toBe(original);
});

test('an overloaded iframe rejects excess work, releases cancelled requests and settles pending work on disposal', async ({
  page,
}) => {
  await page.goto('/bridge-host');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: 'Flood queries', exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole('status', { name: 'Pending requests', exact: true })
          .textContent()
      )
    )
    .toBeGreaterThan(0);
  await app.getByRole('button', { name: 'Cancel query', exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse((await app.locator('#result').textContent()) || '[]').length
    )
    .toBe(200);
  const results: string[] = JSON.parse(
    (await app.locator('#result').textContent())!
  );
  expect(results).toContain('bridge_busy');
  expect(results).toContain('AbortError');
  expect(
    results.every(result => result === 'bridge_busy' || result === 'AbortError')
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('0');
  await app.getByRole('button', { name: 'Query', exact: true }).click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toContain('"version":1');
  await app
    .getByRole('button', { name: 'Wait for query', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('1');
  await app
    .getByRole('button', { name: 'Dispose transport', exact: true })
    .click();
  await expect
    .poll(() => app.locator('#result').textContent())
    .toBe('bridge_closed');
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Pending requests', exact: true })
        .textContent()
    )
    .toBe('0');
});
