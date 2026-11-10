import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateRangeFilter,
  defineDateRangeContract,
  type QueryParameters,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, test } from 'vitest';

const app = defineDataApp({
  title: 'Parameters',
  description: 'Resolve typed parameters from host, caller, and defaults.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    values: {
      statement: 'SELECT $search, $limit, $enabled, $region, $orgId',
      projections: { value: { type: 'number' } },
      params: {
        search: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
        enabled: { type: 'boolean', defaultValue: false },
        region: {
          type: 'string',
          nullable: true,
          defaultValue: null,
        },
        orgId: { type: 'string' },
      },
    },
  },
});
async function execute(
  values: Record<string, unknown>,
  context: QueryParameters
) {
  const delivered: QueryParameters[] = [];
  const operation = app.defineOperation({
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }) {
      // @ts-expect-error Exercise malformed input at the runtime boundary.
      return (await query('values', values)).rows;
    },
  });
  const handler = createDataHandler({ values: operation }, async () => ({
    queryParams: context,
    lakehouse: {
      async queryAll(_statement, { params }) {
        delivered.push(params!);
        return { columns: [{ name: 'value' }], rows: [[1]] };
      },
    },
  }));
  const response = await handler(
    new Request('https://app.example/api/data/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  return { status: response.status, delivered };
}

test('host values are protected and caller values and defaults preserve falsy values', async () => {
  expect(
    await execute(
      { search: '', limit: 0, enabled: false, region: null },
      {
        orgId: 'trusted',
        unrelated: 'ignored',
      }
    )
  ).toEqual({
    status: 200,
    delivered: [
      { search: '', limit: 0, enabled: false, region: null, orgId: 'trusted' },
    ],
  });
  expect(
    await execute(
      {
        search: 'text',
        limit: undefined,
        enabled: undefined,
        region: undefined,
      },
      { orgId: 'trusted' }
    )
  ).toEqual({
    status: 200,
    delivered: [
      {
        search: 'text',
        limit: 10,
        enabled: false,
        region: null,
        orgId: 'trusted',
      },
    ],
  });
});
test('malformed parameters and context overrides fail before SQL execution', async () => {
  for (const [values, context] of [
    [{}, { orgId: 'trusted' }],
    [{ search: 'text' }, {}],
    [{ search: 'text' }, { orgId: 123 }],
    [{ search: 'text', orgId: 'spoofed' }, { orgId: 'trusted' }],
    [{ search: 'text', limit: '10' }, { orgId: 'trusted' }],
    [{ search: 'text', limit: Infinity }, { orgId: 'trusted' }],
    [{ search: 'text', enabled: 0 }, { orgId: 'trusted' }],
    [{ search: null }, { orgId: 'trusted' }],
    [{ search: 'text', region: 0 }, { orgId: 'trusted' }],
  ] satisfies [Record<string, unknown>, QueryParameters][]) {
    expect(await execute(values, context)).toEqual({
      status: 502,
      delivered: [],
    });
  }
});

test('host context can supply any declared parameter', async () => {
  expect(
    await execute({}, { orgId: 'trusted', search: 'host', limit: 5 })
  ).toEqual({
    status: 200,
    delivered: [
      {
        orgId: 'trusted',
        search: 'host',
        limit: 5,
        enabled: false,
        region: null,
      },
    ],
  });
});

test('a date filter binds its range as inclusive calendar days with half-open bounds', async () => {
  const calendar = defineDateRangeContract({
    maxDate: '2026-03-31',
    maxRangeDays: 31,
    timeZone: 'UTC',
  });
  const period = dateRangeFilter({
    key: 'period',
    contract: calendar,
    defaultValue: { kind: 'dates', start: '2026-03-02', end: '2026-03-03' },
  });
  const ranges = defineDataApp({
    title: 'Ranges',
    description: 'Bind calendar ranges.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      orders: {
        statement:
          "SELECT count(*) AS orders FROM orders WHERE ordered_at >= $period.from AND ordered_at < $period.to AND note <> '$period.from'",
        params: { period: { type: 'dateRange' } },
        projections: { orders: { type: 'number' } },
      },
    },
  });
  const delivered: { statement: string; params?: QueryParameters }[] = [];
  const client = createDataClient({
    operations: {
      orders: ranges.defineOperation({
        filters: { period },
        policy: { maxQueryRows: 1, maxDurationMs: 1000 },
        async run({ query }, input) {
          return (await query('orders', { period: input.period.range })).rows;
        },
      }),
    },
    lakehouse: {
      async queryAll(statement, { params }) {
        delivered.push({ statement, params });
        return { columns: [{ name: 'orders' }], rows: [[2]] };
      },
    },
  });
  await client.query('orders', {
    period: period.input(period.defaultValue),
  });
  const [{ statement, params }] = delivered as [(typeof delivered)[0]];
  expect(params).toEqual({
    period: JSON.stringify({ start: '2026-03-02', end: '2026-03-03' }),
  });
  // Bounds expand in SQL code only: the start day's midnight through the day after the end.
  expect(statement).toContain(
    "ordered_at >= CAST(CAST(json_extract_string($period, '$.start') AS DATE) AS TIMESTAMP)"
  );
  expect(statement).toContain(
    "ordered_at < CAST(CAST(json_extract_string($period, '$.end') AS DATE) + INTERVAL '1 day' AS TIMESTAMP)"
  );
  expect(statement).toContain("note <> '$period.from'");
  expect(() =>
    defineDataApp({
      title: 'Ranges',
      description: 'Reject malformed defaults.',
      scope: { organization: 'demo', environment: 'test' },
      queries: {
        orders: {
          statement: 'SELECT 1 AS n WHERE $period.from IS NOT NULL',
          params: {
            period: {
              type: 'dateRange',
              defaultValue: { start: '2026-03-04', end: '2026-03-01' },
            },
          },
          projections: { n: { type: 'number' } },
        },
      },
    })
  ).toThrow('Invalid default for parameter period in query orders.');
});
