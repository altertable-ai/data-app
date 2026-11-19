import { localLakehouse } from '@altertable/data-app-bun';
import { createDataClient } from '@altertable/data-app/client';
import type { QueryParameters } from '@altertable/data-app/contract';
import type { Page } from 'playwright';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import { beforeAll, afterAll, expect } from 'vitest';

import {
  groupName as findingGroupName,
  periodFilter as findingPeriodFilter,
} from '@/packages/data-app-examples/templates/starter-local-finding-data-app/src/filters';
import { operations as findingOperations } from '@/packages/data-app-examples/templates/starter-local-finding-data-app/src/operations';
import {
  starterMockImage,
  starterSeedStatements,
} from '@/tests/fixtures/starter-mock';
import { test } from '@/tests/public-api/browser';
import {
  dataApp,
  rateFindingOperations,
  categoricalFindingOperations,
  temporalMetricOperations,
  nonAdditiveMetricOperations,
  findingPeriod,
  metricPeriod,
  nonAdditivePeriod,
} from '@/tests/public-api/fixtures/business-evidence';

let container: StartedTestContainer | undefined;
let lakehouse: ReturnType<typeof localLakehouse>;
beforeAll(async () => {
  container = await new GenericContainer(starterMockImage)
    .withEnvironment({ ALTERTABLE_MOCK_USERS: 'dev:dev' })
    .withExposedPorts(15000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const api = `http://${container.getHost()}:${container.getMappedPort(15000)}`;
  lakehouse = localLakehouse({
    ALTERTABLE_API_BASE: api,
    ALTERTABLE_LAKEHOUSE_USERNAME: 'dev',
    ALTERTABLE_LAKEHOUSE_PASSWORD: 'dev',
  });
  for (const statement of starterSeedStatements) {
    const response = await fetch(`${api}/query`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa('dev:dev')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ statement }),
    });
    const body = await response.text();
    if (!response.ok || body.includes('\n{"error":'))
      throw new Error(`Fixture seed failed: ${body}`);
  }
}, 120000);
afterAll(async () => {
  await container?.stop();
});

async function openEvidence(page: Page, scenario: string) {
  // Exercise the actual registered SQL and public lakehouse adapter. No fabricated rows.
  await page.route('**/api/query/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (!Object.hasOwn(dataApp.queries, name))
      throw new Error(`Unknown fixture query: ${name}`);
    const { params, limit } = route.request().postDataJSON() as {
      params: QueryParameters;
      limit: number;
    };
    const query = dataApp.queries[name as keyof typeof dataApp.queries];
    const result = await lakehouse.queryAll(query.statement, {
      params,
      limit,
      signal: new AbortController().signal,
    });
    await route.fulfill({ json: result });
  });
  await page.goto(`/business-evidence?scenario=${scenario}`);
}
async function selectSegment(page: Page, current: string, next: string) {
  await page
    .getByRole('button', { name: new RegExp(`${current} Segment`) })
    .click();
  await page.getByRole('option', { name: next, exact: true }).click();
}

test('a rate finding compares the same population and retains its numerator and denominator', async ({
  page,
}) => {
  const client = createDataClient({
    operations: { conversion: rateFindingOperations.conversion },
    lakehouse,
  });
  const input = {
    period: findingPeriod.request(findingPeriod.defaultValue),
    segment: 'all' as const,
  };
  const { data, queries } = await client.query('conversion', input);
  if (!data.current || !data.previous)
    throw new Error('Expected conversion data for the finding period.');
  expect(data.current).toMatchObject({
    visits: 1000,
    conversions: 560,
    rate: 0.56,
  });
  expect(data.previous).toMatchObject({
    visits: 1000,
    conversions: 140,
    rate: 0.14,
  });
  expect(data.current.rate - data.previous.rate).toBeCloseTo(0.42);
  expect(data.rows.map(row => row.rate)).toEqual([0.2, 0.6]);
  expect(data.current.rate).not.toBe(0.8); // Sum of segment rates.
  expect(data.current.rate).not.toBe(0.4); // Unweighted segment average.
  expect(queries?.map(query => query.params)).toEqual([
    {
      period_from: '2026-03-09T00:00:00.000',
      period_to: '2026-03-16T00:00:00.000',
      segment: 'all' as const,
    },
    {
      period_from: '2026-03-02T00:00:00.000',
      period_to: '2026-03-09T00:00:00.000',
      segment: 'all' as const,
    },
    {
      period_from: '2026-03-09T00:00:00.000',
      period_to: '2026-03-16T00:00:00.000',
      segment: 'all' as const,
    },
  ]);
  const filtered = await client.query('conversion', {
    ...input,
    segment: 'New',
  });
  expect(filtered.data.current).toMatchObject({
    conversions: 20,
    visits: 100,
    rate: 0.2,
  });
  expect(filtered.data.previous).toMatchObject({
    conversions: 90,
    visits: 900,
    rate: 0.1,
  });
  const unavailable = await client.query('conversion', {
    ...input,
    period: findingPeriod.request({
      range: {
        from: new Date('2026-02-01T00:00:00Z'),
        to: new Date('2026-02-08T00:00:00Z'),
      },
    }),
  });
  expect(unavailable.data).toMatchObject({
    current: null,
    previous: null,
    comparisonUnavailable: false,
    rows: [],
  });
  const missingComparison = await client.query('conversion', {
    ...input,
    period: {
      range: {
        from: new Date('2026-03-02T00:00:00Z'),
        to: new Date('2026-03-09T00:00:00Z'),
      },
      comparison: {
        from: new Date('2026-02-23T00:00:00Z'),
        to: new Date('2026-03-02T00:00:00Z'),
      },
    },
  });
  expect(missingComparison.data).toMatchObject({
    current: { rate: 0.14 },
    previous: null,
    comparisonUnavailable: true,
  });
  await openEvidence(page, 'rate-finding');
  await expect
    .poll(() =>
      page
        .getByText('56% vs 14%: 42 percentage points', { exact: true })
        .isVisible()
    )
    .toBe(true);
  const evidence = page.getByRole('region', {
    name: 'Conversion evidence',
    exact: true,
  });
  expect(
    await evidence
      .getByRole('row', { name: 'Current 560 1,000 56%', exact: true })
      .isVisible()
  ).toBe(true);
  expect(
    await evidence
      .getByRole('row', { name: 'Previous 140 1,000 14%', exact: true })
      .isVisible()
  ).toBe(true);
  await selectSegment(page, 'All segments', 'New');
  await expect
    .poll(() =>
      page
        .getByText('20% vs 10%: 10 percentage points', { exact: true })
        .isVisible()
    )
    .toBe(true);
  expect(
    await page
      .getByText('Exploration: scope changed', { exact: true })
      .isVisible()
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Conversion', exact: true })
        .textContent()
    )
    .toContain('segment New');
  await page
    .getByRole('button', { name: 'Back to finding', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByText('56% vs 14%: 42 percentage points', { exact: true })
        .isVisible()
    )
    .toBe(true);
  await page.getByRole('combobox', { name: 'Date range', exact: true }).click();
  await page
    .getByRole('option', { name: /Compare with previous period/ })
    .click();
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page
        .getByRole('status', { name: 'Conversion change', exact: true })
        .textContent()
    )
    .toBe('56%');
  await expect
    .poll(() => evidence.getByRole('row', { name: /Previous/ }).count())
    .toBe(0);
  const emptyDates = page.getByRole('combobox', {
    name: 'Date range',
    exact: true,
  });
  await emptyDates.click();
  await emptyDates.fill('2026-02-01 to 2026-02-08');
  await emptyDates.press('Enter');
  await expect
    .poll(() =>
      page
        .getByText('No conversion data in this period', { exact: true })
        .isVisible()
    )
    .toBe(true);
});

test('a categorical finding explores a source without inventing a reporting period', async ({
  page,
}) => {
  const client = createDataClient({
    operations: { distribution: categoricalFindingOperations.distribution },
    lakehouse,
  });
  expect(
    (await client.query('distribution', { groupName: 'all' })).data
  ).toEqual([
    { group: 'Alpha', samples: 2200000 },
    { group: 'Beta', samples: 600000 },
  ]);
  await openEvidence(page, 'categorical-finding');
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Alpha: 2,200,000 samples', exact: true })
        .isVisible()
    )
    .toBe(true);
  expect(
    await page
      .getByRole('combobox', { name: 'Date range', exact: true })
      .count()
  ).toBe(0);
  await page.getByRole('button', { name: /All groups Group/ }).click();
  await page.getByRole('option', { name: 'Beta', exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Samples by group', exact: true })
        .textContent()
    )
    .toContain('group Beta');
  expect(
    await page
      .getByRole('button', { name: 'Alpha: 2,200,000 samples', exact: true })
      .count()
  ).toBe(0);
  expect(
    await page
      .getByText('Exploration: scope changed', { exact: true })
      .isVisible()
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Back to finding', exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Alpha: 2,200,000 samples', exact: true })
        .isVisible()
    )
    .toBe(true);
});

test('the Finding starter compares its dated evidence in the selected scope', async () => {
  const client = createDataClient({
    operations: {
      totals: findingOperations.sampleTotals,
      members: findingOperations.samplesByMember,
    },
    lakehouse,
  });
  const period = findingPeriodFilter.request(findingPeriodFilter.defaultValue);
  const scope = {
    period,
    groupName: findingGroupName.defaultValue,
  };
  const memberInput = {
    ...scope,
    breakdown: 'segment' as const,
  };
  expect((await client.query('totals', scope)).data).toEqual([
    { currentCount: 307000, previousCount: 216000 },
  ]);
  expect((await client.query('members', memberInput)).data).toEqual([
    {
      member: 'Online',
      currentCount: 227000,
      previousCount: 143000,
      change: 84000,
      changeRate: 84000 / 143000,
    },
    {
      member: 'Retail',
      currentCount: 80000,
      previousCount: 73000,
      change: 7000,
      changeRate: 7000 / 73000,
    },
  ]);
  expect(
    (
      await client.query('totals', {
        ...scope,
        groupName: 'Beta',
      })
    ).data
  ).toEqual([{ currentCount: 59000, previousCount: 59000 }]);
  expect(
    (
      await client.query('members', {
        ...memberInput,
        groupName: 'Beta',
      })
    ).data
  ).toEqual([
    {
      member: 'Partner',
      currentCount: 59000,
      previousCount: 59000,
      change: 0,
      changeRate: 0,
    },
  ]);
  expect(
    (
      await client.query('totals', {
        ...scope,
        period: findingPeriodFilter.request({
          range: findingPeriodFilter.defaultValue.range,
        }),
      })
    ).data
  ).toEqual([{ currentCount: 307000, previousCount: null }]);
});

test('an additive semantic metric preserves the time grain and filters of its source', async ({
  page,
}) => {
  const client = createDataClient({
    operations: { revenue: temporalMetricOperations.revenue },
    lakehouse,
  });
  const input = {
    period: metricPeriod.request(metricPeriod.defaultValue),
    segment: 'all' as const,
  };
  expect((await client.query('revenue', input)).data).toEqual([
    { day: '2026-03-02', revenue: 1900 },
    { day: '2026-03-09', revenue: 3000 },
  ]);
  expect(
    (await client.query('revenue', { ...input, segment: 'New' })).data
  ).toEqual([
    { day: '2026-03-02', revenue: 900 },
    { day: '2026-03-09', revenue: 300 },
  ]);
  await openEvidence(page, 'temporal-metric');
  const table = page.getByRole('region', {
    name: 'Daily revenue evidence',
    exact: true,
  });
  await expect.poll(() => table.getByRole('row').count()).toBe(3);
  expect(await table.textContent()).toContain('2026-03-02');
  expect(await table.textContent()).toContain('$1,900');
  expect(await table.textContent()).toContain('$3,000');
  expect(
    await page
      .getByRole('application', { name: 'Revenue over time', exact: true })
      .isVisible()
  ).toBe(true);
  await selectSegment(page, 'All segments', 'New');
  await expect.poll(() => table.textContent()).toContain('$900');
  expect(await table.textContent()).toContain('$300');
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: 'Revenue over time', exact: true })
        .filter({
          has: page.getByRole('heading', {
            name: 'Revenue over time',
            exact: true,
          }),
        })
        .textContent()
    )
    .toContain('segment New');
});

test('non-additive semantic metrics aggregate their components rather than rates or averages', async ({
  page,
}) => {
  const client = createDataClient({
    operations: { efficiency: nonAdditiveMetricOperations.efficiency },
    lakehouse,
  });
  const input = {
    period: nonAdditivePeriod.request(nonAdditivePeriod.defaultValue),
    segment: 'all' as const,
  };
  const { data } = await client.query('efficiency', input);
  expect(data.total).toEqual({
    visits: 1000,
    conversions: 140,
    revenue: 1900,
    orders: 100,
    rate: 0.14,
    mean: 19,
  });
  expect(data.rows.map(row => ({ rate: row.rate, mean: row.mean }))).toEqual([
    { rate: 0.1, mean: 10 },
    { rate: 0.5, mean: 100 },
  ]);
  expect(data.total.rate).not.toBe(0.6);
  expect(data.total.rate).not.toBe(0.3);
  expect(data.total.mean).not.toBe(110);
  expect(data.total.mean).not.toBe(55);
  await openEvidence(page, 'non-additive-metric');
  const table = page.getByRole('region', {
    name: 'Efficiency evidence',
    exact: true,
  });
  await expect.poll(() => table.getByRole('row').count()).toBe(4);
  await expect
    .poll(() =>
      table
        .getByRole('row', {
          name: 'All selected segments 140 1,000 14% $1,900.00 100 $19.00',
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
  await selectSegment(page, 'All segments', 'Returning');
  await expect
    .poll(() =>
      table
        .getByRole('row', {
          name: 'All selected segments 50 100 50% $1,000.00 10 $100.00',
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
  const dates = page.getByRole('combobox', { name: 'Date range', exact: true });
  await dates.click();
  await dates.fill('2026-03-09 to 2026-03-16');
  await dates.press('Enter');
  await expect
    .poll(() =>
      table
        .getByRole('row', {
          name: 'All selected segments 540 900 60% $2,700.00 90 $30.00',
          exact: true,
        })
        .isVisible()
    )
    .toBe(true);
  await expect
    .poll(() => page.getByText(/Showing Mar 9–15, 2026 UTC/).textContent())
    .toContain('segment Returning');
});
