import type { Page } from 'playwright';
import { describe, expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

async function serveData(
  page: Page,
  { activity = [3, 4], status = 200, hold = false } = {}
) {
  const requests: { operation: string; input: unknown }[] = [];
  const { promise, resolve: release } = Promise.withResolvers<void>();
  await page.route('**/focused-widget-data/*', async route => {
    const operation = new URL(route.request().url()).pathname
      .split('/')
      .at(-1)!;
    requests.push({ operation, input: route.request().postDataJSON() });
    if (hold) await promise;
    await route.fulfill({
      status,
      json:
        status === 200
          ? {
              data: operation === 'activity' ? activity : 1200,
              requestId: operation,
              queriedAt: '2026-11-24T00:00:00Z',
              queryIds: [],
              queries: [],
            }
          : {},
    });
  });
  return { requests, release };
}

function widgetState(page: Page) {
  return page.getByRole('main').getAttribute('data-widget-state');
}

describe('widget URL', () => {
  test.for([
    { state: 'loading', widget: 'event-log', hold: true },
    { state: 'loading', widget: 'custom' },
    { state: 'empty', widget: 'event-log', activity: [] },
    { state: 'error', widget: 'event-log', status: 503 },
    { state: 'invalid-target', widget: 'missing-widget' },
  ])(
    'keeps $widget ($state) in a compact capture area',
    async ({ state, widget, ...response }, { page }) => {
      const { release } = await serveData(page, response);
      const main = page.getByRole('main');
      try {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`/focused-widget?widget=${widget}`);
        await expect.poll(() => widgetState(page)).toBe(state);
        if (state === 'loading')
          await main.getByText('Loading widget').waitFor();
        expect(await main.boundingBox()).toMatchObject({
          x: 0,
          y: 0,
          width: 1280,
          height: 240,
        });
        await page.setViewportSize({ width: 375, height: 700 });
        expect(await main.boundingBox()).toMatchObject({
          width: 375,
          height: 240,
        });
      } finally {
        release();
      }
    }
  );

  test('selects a widget outside the dashboard layout and queries only its view with the URL filters', async ({
    page,
  }) => {
    const { requests, release } = await serveData(page, { hold: true });
    const params = new URLSearchParams({
      widget: 'busiest-day',
      region: 'West',
      about: 'event-data',
      tab: 'records',
      details: JSON.stringify([
        { id: 'region-detail', input: { region: 'East' } },
      ]),
    });
    await page.goto(`/focused-widget?${params}`);
    const main = page.getByRole('main');
    await expect.poll(() => widgetState(page)).toBe('loading');
    expect(await main.getAttribute('aria-busy')).toBe('true');
    release();
    await expect.poll(() => widgetState(page)).toBe('ready');
    expect(await main.getByText('Day 2 in West').isVisible()).toBe(true);
    expect(await main.getByText('Busiest day').count()).toBe(0);
    expect(await page.getByRole('dialog').count()).toBe(0);
    expect(await page.getByText('Activity overview').count()).toBe(0);
    expect(
      await page.locator('body').getAttribute('data-dashboard-mounted')
    ).toBeNull();
    expect(await page.getByRole('region', { name: 'Event log' }).count()).toBe(
      0
    );
    expect(await main.getAttribute('data-focused-widget')).toBe('busiest-day');
    expect(requests).toEqual([
      { operation: 'activity', input: { region: 'West' } },
    ]);
  });

  test('shows every table row without a frame, inspection, or pagination', async ({
    page,
  }) => {
    await serveData(page);
    await page.goto(
      '/focused-widget?widget=event-log&about=event-data&tab=glossary'
    );
    await expect.poll(() => widgetState(page)).toBe('ready');
    const main = page.getByRole('main');
    expect(await main.getByRole('row').count()).toBe(3);
    expect(await main.getByRole('button').count()).toBe(0);
    expect(await main.getByRole('searchbox').count()).toBe(0);
    expect(await main.getByText('Event log').count()).toBe(0);
    expect(await page.getByRole('dialog').count()).toBe(0);
  });

  test('rejects unknown, empty, repeated, and evidence IDs before requesting data', async ({
    page,
  }) => {
    const { requests } = await serveData(page);
    for (const target of [
      'missing-chart',
      '',
      'event-log&widget=event-log',
      'event-data',
      'different-annotation',
    ]) {
      await page.goto(`/focused-widget?widget=${target}`);
      await expect.poll(() => widgetState(page)).toBe('invalid-target');
      expect(
        await page
          .getByRole('alert')
          .getByText('Widget unavailable')
          .isVisible()
      ).toBe(true);
    }
    expect(requests).toEqual([]);
  });

  test('rejects duplicate registered IDs before mounting either route', async ({
    page,
  }) => {
    const { requests } = await serveData(page);
    for (const query of ['duplicate', 'duplicate&widget=event-log']) {
      const error = page.waitForEvent('console', {
        predicate: message =>
          message.type() === 'error' &&
          message.text().includes('Duplicate widget ID'),
      });
      await page.goto(`/focused-widget?${query}`);
      expect((await error).text()).toContain(
        'Duplicate widget ID “event-log”.'
      );
    }
    expect(requests).toEqual([]);
  });

  test('shows the owning view’s empty result without losing the widget ID', async ({
    page,
  }) => {
    const { requests } = await serveData(page, { activity: [] });
    await page.goto('/focused-widget?widget=event-log');
    await expect.poll(() => widgetState(page)).toBe('empty');
    expect(await page.getByText('No activity').isVisible()).toBe(true);
    expect(
      await page.getByRole('main').getAttribute('data-focused-widget')
    ).toBe('event-log');
    expect(requests.map(request => request.operation)).toEqual(['activity']);
  });

  test('reports a failed data request without exposing a retry control', async ({
    page,
  }) => {
    const { requests } = await serveData(page, { status: 503 });
    await page.goto('/focused-widget?widget=event-log');
    await expect.poll(() => widgetState(page)).toBe('error');
    expect(
      await page
        .getByRole('alert')
        .getByText('Couldn’t load results')
        .isVisible()
    ).toBe(true);
    expect(await page.getByRole('button', { name: 'Retry' }).count()).toBe(0);
    expect(requests.map(request => request.operation)).toEqual(['activity']);
  });

  test('reports a failing chart renderer', async ({ page }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=broken');
    await expect.poll(() => widgetState(page)).toBe('error');
    expect(
      await page
        .getByRole('alert')
        .getByText('This widget couldn’t render')
        .isVisible()
    ).toBe(true);
  });

  test('waits for custom rendering after data has loaded', async ({ page }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=custom');
    await page.locator('#chart-drawing').waitFor({ state: 'attached' });
    expect(
      await page.getByRole('button', { name: 'Finish drawing' }).count()
    ).toBe(0);
    expect(await widgetState(page)).toBe('loading');
    await page.evaluate(() =>
      window.dispatchEvent(new Event('fixture-finish-drawing'))
    );
    await expect.poll(() => widgetState(page)).toBe('ready');
    expect(await page.getByText('Chart total 7').isVisible()).toBe(true);
  });

  test('keeps a single status element when a rendered widget suspends again', async ({
    page,
  }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=suspending');
    await expect.poll(() => widgetState(page)).toBe('ready');
    await page.evaluate(() =>
      window.dispatchEvent(new Event('fixture-reload-chart'))
    );
    await expect.poll(() => widgetState(page)).toBe('loading');
    expect(
      await page.locator('[data-focused-widget="suspending"]').count()
    ).toBe(1);
    await page.evaluate(() =>
      window.dispatchEvent(new Event('fixture-resume-chart'))
    );
    await expect.poll(() => widgetState(page)).toBe('ready');
    expect(await page.getByText('Chart reloaded').isVisible()).toBe(true);
  });

  test('reports an asynchronous drawing failure', async ({ page }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=custom');
    await page.locator('#chart-drawing').waitFor({ state: 'attached' });
    await page.evaluate(() =>
      window.dispatchEvent(new Event('fixture-fail-drawing'))
    );
    await expect.poll(() => widgetState(page)).toBe('error');
    expect(
      await page
        .getByRole('alert')
        .getByText('This widget couldn’t finish rendering')
        .isVisible()
    ).toBe(true);
  });

  test('renders the dashboard when widget selection is absent', async ({
    page,
  }) => {
    await serveData(page);
    await page.goto('/focused-widget');
    await page
      .getByRole('region', { name: 'Revenue' })
      .getByText('1200')
      .waitFor();
    expect(
      await page.getByRole('heading', { name: 'Sales report' }).isVisible()
    ).toBe(true);
    expect(
      await page.getByRole('region', { name: 'Event log' }).isVisible()
    ).toBe(true);
    expect(await widgetState(page)).toBeNull();
  });

  test('applies a focused theme override without changing the dashboard theme', async ({
    page,
  }) => {
    await serveData(page);
    await page.emulateMedia({ colorScheme: 'light' });
    function theme() {
      return page.locator('html').getAttribute('data-atbl-theme');
    }
    await page.goto('/focused-widget?widget=event-log&theme=dark');
    await expect.poll(theme).toBe('dark');
    await page.goto('/focused-widget?widget=event-log&theme=dark&theme=light');
    await expect.poll(theme).toBe('light');
    await page.goto('/focused-widget?theme=dark');
    await expect.poll(theme).toBe('light');
  });

  test('publishes the fitted widget to the host and resets when navigation changes the target', async ({
    page,
  }) => {
    await page.goto(
      '/starter-data-app?widget=samples-by-group&content-sizing&capture-state'
    );
    const capture = page.getByTestId('widget-capture-state');
    await expect
      .poll(() => capture.textContent())
      .toMatch(/"state":"ready","widgetId":"samples-by-group"/);
    const report = JSON.parse((await capture.textContent()) ?? 'null');
    expect(report.height).toBe(
      await page.locator('iframe').evaluate(frame => frame.clientHeight)
    );

    await page.evaluate(() => {
      const url = new URL(location.href);
      url.searchParams.set('widget', 'missing-widget');
      history.pushState(null, '', url);
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect
      .poll(() => capture.textContent())
      .toMatch('{"state":"invalid-target"}');
    await page.evaluate(() => history.back());
    await expect
      .poll(() => capture.textContent())
      .toMatch(/"state":"ready","widgetId":"samples-by-group"/);
  });

  test('clears ready while a filter change reloads the same widget', async ({
    page,
  }) => {
    const { promise, resolve } = Promise.withResolvers<void>();
    await page.route('**/api/query', async route => {
      if (route.request().postDataJSON().params.groupName === 'Beta') {
        await promise;
        await route.fulfill({ status: 503 });
      } else {
        await route.continue();
      }
    });
    const capture = page.getByTestId('widget-capture-state');
    try {
      await page.goto(
        '/starter-data-app?widget=samples-by-group&content-sizing&capture-state'
      );
      await expect
        .poll(() => capture.textContent())
        .toContain('"state":"ready"');
      await page.evaluate(() => {
        const url = new URL(location.href);
        url.searchParams.set('group', 'Beta');
        history.pushState(null, '', url);
        dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect
        .poll(() => capture.textContent())
        .toBe('{"state":"loading","widgetId":"samples-by-group"}');
      resolve();
      await expect
        .poll(() => capture.textContent())
        .toBe('{"state":"error","widgetId":"samples-by-group"}');
    } finally {
      resolve();
    }
  });

  test('keeps capture pending when the frame cannot apply content sizing', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?widget=samples-by-group&capture-state');
    const main = page.frameLocator('iframe').getByRole('main');
    await expect
      .poll(() => main.getAttribute('data-widget-state'))
      .toBe('ready');
    await expect
      .poll(() => page.getByTestId('widget-capture-state').textContent())
      .toBe('{"state":"loading","widgetId":"samples-by-group"}');
  });

  test('receives a focused widget ID from the hosted app URL', async ({
    page,
  }) => {
    await page.goto(
      '/starter-data-app?widget=samples-by-group&theme=light&content-sizing'
    );
    const app = page.frameLocator('iframe');
    await expect
      .poll(() => app.getByRole('main').getAttribute('data-widget-state'))
      .toBe('ready');
    expect(
      await app
        .getByRole('region', { name: 'Sample counts by group' })
        .isVisible()
    ).toBe(true);
    expect(await app.locator('html').getAttribute('data-atbl-theme')).toBe(
      'light'
    );
    function captureFitsFrame() {
      return app.getByRole('main').evaluate(main => {
        const { x, y, width, height } = main.getBoundingClientRect();
        return (
          x === 0 &&
          y === 0 &&
          width === window.innerWidth &&
          height <= window.innerHeight &&
          window.innerHeight - height < 2
        );
      });
    }
    await expect.poll(captureFitsFrame).toBe(true);
    const topTick = app.getByText('2k', { exact: true });
    function tickIsInsidePlotSvg() {
      return topTick.evaluate(tick => {
        const svg = tick.closest('svg')!;
        return (
          tick.getBoundingClientRect().top >= svg.getBoundingClientRect().top
        );
      });
    }
    await expect.poll(tickIsInsidePlotSvg).toBe(true);
    expect(await app.getByRole('img', { name: /^Alpha:/ }).isVisible()).toBe(
      true
    );
    expect(await app.getByRole('button').count()).toBe(0);
    expect(
      await app.getByText('Samples by group', { exact: true }).count()
    ).toBe(0);
  });
});
