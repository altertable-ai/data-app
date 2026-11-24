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
    const widget = main.getByRole('region', {
      name: 'Busiest day',
      exact: true,
    });
    expect(await widget.getByText('Day 2 in West').isVisible()).toBe(true);
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

  test('opens and closes widget inspection without restoring or rewriting the incoming URL', async ({
    page,
  }) => {
    await serveData(page);
    await page.goto(
      '/focused-widget?widget=event-log&about=event-data&tab=glossary'
    );
    await expect.poll(() => widgetState(page)).toBe('ready');
    const originalUrl = page.url();
    expect(await page.getByRole('dialog').count()).toBe(0);
    await page.getByRole('button', { name: 'Explore Event log' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close panel' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    expect(page.url()).toBe(originalUrl);
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

  test('reports a failed data request and retries only the selected view', async ({
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
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect
      .poll(() => requests.map(request => request.operation))
      .toEqual(['activity', 'activity']);
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
    const finish = page.getByRole('button', { name: 'Finish drawing' });
    await finish.waitFor();
    expect(await widgetState(page)).toBe('loading');
    await finish.click();
    await expect.poll(() => widgetState(page)).toBe('ready');
    expect(await page.getByText('Chart total 7').isVisible()).toBe(true);
  });

  test('keeps a single status element when a rendered widget suspends again', async ({
    page,
  }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=suspending');
    await expect.poll(() => widgetState(page)).toBe('ready');
    await page.getByRole('button', { name: 'Reload chart' }).click();
    await expect.poll(() => widgetState(page)).toBe('loading');
    expect(
      await page.locator('[data-focused-widget="suspending"]').count()
    ).toBe(1);
    await page.keyboard.press('Escape');
    await expect.poll(() => widgetState(page)).toBe('ready');
    expect(await page.getByText('Chart reloaded').isVisible()).toBe(true);
  });

  test('reports an asynchronous drawing failure', async ({ page }) => {
    await serveData(page);
    await page.goto('/focused-widget?widget=custom');
    await page.getByRole('button', { name: 'Fail drawing' }).click();
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

  test('receives a focused widget ID from the hosted app URL', async ({
    page,
  }) => {
    await page.goto('/starter-data-app?widget=samples-by-group');
    const app = page.frameLocator('iframe');
    await expect
      .poll(() => app.getByRole('main').getAttribute('data-widget-state'))
      .toBe('ready');
    expect(
      await app.getByRole('region', { name: 'Samples by group' }).isVisible()
    ).toBe(true);
  });
});
