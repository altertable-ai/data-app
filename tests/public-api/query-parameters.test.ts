import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  dimensionFilter,
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

test('a dimension filter binds its selection and matches rows in SQL', async () => {
  const country = dimensionFilter({
    key: 'country',
    label: 'Country',
    valueType: 'string',
    selectionMode: 'multiple',
    allowMissing: true,
    allowExclusion: true,
    options: [
      { value: 'US', label: 'United States' },
      { value: 'FR', label: 'France' },
    ],
  });
  const dimensions = defineDataApp({
    title: 'Dimensions',
    description: 'Bind dimension selections.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      orders: {
        statement:
          'SELECT count(*) AS orders FROM orders o JOIN customers c ON c.id = o.customer_id WHERE $country.matches(c.country)',
        params: { country: { type: 'dimension', valueType: 'string' } },
        projections: { orders: { type: 'number' } },
      },
    },
  });
  const delivered: { statement: string; params?: QueryParameters }[] = [];
  const client = createDataClient({
    operations: {
      orders: dimensions.defineOperation({
        filters: { country },
        policy: { maxQueryRows: 1, maxDurationMs: 1000 },
        async run({ query }, input) {
          return (await query('orders', { country: input.country })).rows;
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
    country: {
      kind: 'exclude',
      members: [{ kind: 'value', value: 'US' }, { kind: 'missing' }],
    },
  });
  await client.query('orders', { country: { kind: 'all' } });
  expect(delivered.map(({ params }) => params)).toEqual([
    {
      country: JSON.stringify({
        kind: 'exclude',
        values: ['US'],
        missing: true,
      }),
    },
    { country: JSON.stringify({ kind: 'all' }) },
  ]);
  expect(delivered[0]!.statement).not.toContain('$country.matches');
  expect(delivered[0]!.statement).toContain(
    "list_contains(CAST(json_extract($country, '$.values') AS VARCHAR[]), c.country)"
  );
});
