import { describe, expect } from 'vitest';

import { test } from '@/tests/public-api/browser';

type QueryRequest = {
  queryId: string;
  params?: Record<string, string | number>;
};

function requestCount(requests: QueryRequest[], queryId: string) {
  return requests.filter(request => request.queryId === queryId).length;
}

describe('infrastructure cost dashboard', () => {
  test('hosted dashboard keeps its scoped charts, summary, breakdown, and detail aligned', async ({
    page,
  }) => {
    const requests: QueryRequest[] = [];
    await page.route('**/api/query', async route => {
      requests.push(route.request().postDataJSON() as QueryRequest);
      await route.continue();
    });
    await page.goto('/cost-dashboard');
    const app = page.frameLocator('iframe');

    const trend = app.getByRole('region', {
      name: 'Costs over time',
      exact: true,
    });
    const breakdown = app.getByLabel('Costs by service', { exact: true });
    const mix = app.getByRole('application', {
      name: 'Service mix by customer',
      exact: true,
    });
    await expect.poll(() => trend.isVisible()).toBe(true);
    await expect.poll(() => breakdown.isVisible()).toBe(true);
    await expect.poll(() => mix.isVisible()).toBe(true);
    await expect
      .poll(() =>
        app.getByRole('button', { name: 'September 2026 Month' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app.getByRole('button', { name: 'All customers Customer' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app.getByRole('button', { name: 'Service Breakdown' }).isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Total cost', exact: true })
          .getByText('$13,200.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Customers', exact: true })
          .getByText('3', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Average per customer', exact: true })
          .getByText('$4,400.00', { exact: true })
          .isVisible()
      )
      .toBe(true);

    await app
      .getByRole('button', { name: 'All customers Customer', exact: true })
      .click();
    await app.getByRole('option', { name: 'Atlas', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Total cost', exact: true })
          .getByText('$5,300.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Customers', exact: true })
          .getByText('1', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Average per customer', exact: true })
          .getByText('$5,300.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
    for (const queryId of [
      'costBreakdown',
      'totalCost',
      'costTrend',
      'customerServiceMix',
    ]) {
      expect(
        requests.some(
          request =>
            request.queryId === queryId &&
            request.params?.month === '2026-09' &&
            request.params?.customerName === 'Atlas'
        )
      ).toBe(true);
    }
    const scopedTotal = requests.find(
      request =>
        request.queryId === 'totalCost' &&
        request.params?.month === '2026-09' &&
        request.params?.customerName === 'Atlas'
    );
    expect(scopedTotal?.params).not.toHaveProperty('limit');

    await app
      .getByRole('button', { name: 'September 2026 Month', exact: true })
      .click();
    await app.getByRole('option', { name: 'August 2026', exact: true }).click();
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Total cost', exact: true })
          .getByText('$4,800.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        app
          .getByRole('region', { name: 'Average per customer', exact: true })
          .getByText('$4,800.00', { exact: true })
          .isVisible()
      )
      .toBe(true);

    const priorRequests = new Map(
      ['totalCost', 'costTrend', 'customerServiceMix'].map(queryId => [
        queryId,
        requestCount(requests, queryId),
      ])
    );
    await app
      .getByRole('button', { name: 'Service Breakdown', exact: true })
      .click();
    await app.getByRole('option', { name: 'Customer', exact: true }).click();
    const customers = app.getByLabel('Costs by customer', { exact: true });
    await expect.poll(() => customers.isVisible()).toBe(true);
    await expect
      .poll(() =>
        requests.some(
          request =>
            request.queryId === 'costBreakdown' &&
            request.params?.month === '2026-08' &&
            request.params?.customerName === 'Atlas' &&
            request.params?.breakdown === 'customer'
        )
      )
      .toBe(true);
    for (const [queryId, count] of priorRequests) {
      expect(requestCount(requests, queryId)).toBe(count);
    }

    await app
      .getByRole('button', { name: 'Customer Breakdown', exact: true })
      .click();
    await app.getByRole('option', { name: 'Service', exact: true }).click();
    await expect.poll(() => breakdown.isVisible()).toBe(true);
    await breakdown.getByRole('button', { name: /^Compute.*Actions$/ }).click();
    await app
      .getByRole('menuitem', { name: 'View customers', exact: true })
      .click();
    const detail = app.getByRole('dialog', {
      name: 'Customer costs',
      exact: true,
    });
    await expect
      .poll(() =>
        detail.getByRole('row', { name: 'Atlas $3,800.00' }).isVisible()
      )
      .toBe(true);
    expect(
      await detail.getByRole('row', { name: /Beacon|Cedar/ }).count()
    ).toBe(0);
    expect(
      requests.some(
        request =>
          request.queryId === 'costsByCustomer' &&
          request.params?.month === '2026-08' &&
          request.params?.customerName === 'Atlas' &&
          request.params?.serviceName === 'Compute'
      )
    ).toBe(true);
  });

  test('local dashboard retains its three charts and responds to month filtering on mobile', async ({
    mobilePage: page,
  }) => {
    await page.goto('/local-cost-dashboard');
    await expect
      .poll(() =>
        page
          .getByRole('region', { name: 'Costs over time', exact: true })
          .isVisible()
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.getByLabel('Costs by service', { exact: true }).isVisible()
      )
      .toBe(true);
    await page
      .getByRole('region', { name: 'Customer composition', exact: true })
      .scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .getByRole('application', {
            name: 'Service mix by customer',
            exact: true,
          })
          .isVisible()
      )
      .toBe(true);
    await page
      .getByRole('button', { name: 'September 2026 Month', exact: true })
      .click();
    await page
      .getByRole('option', { name: 'August 2026', exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole('region', { name: 'Total cost', exact: true })
          .getByText('$12,000.00', { exact: true })
          .isVisible()
      )
      .toBe(true);
  });
});
