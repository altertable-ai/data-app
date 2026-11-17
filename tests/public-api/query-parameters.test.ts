import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  dimensionFilter,
  type QueryParameters,
} from '@altertable/data-app/contract';
import { expect, test } from 'vitest';

test('registered query names use the bridge ID format', () => {
  expect(() =>
    defineDataApp({
      title: 'Invalid query name',
      description: '',
      scope: { organization: 'demo', environment: 'test' },
      queries: {
        'bad.name': {
          statement: 'SELECT 1',
          params: {},
          projections: { value: { type: 'number' } },
        },
      },
    })
  ).toThrow('Invalid query name bad.name');
  expect(() =>
    defineDataApp({
      title: 'Valid query name',
      description: '',
      scope: { organization: 'demo', environment: 'test' },
      queries: {
        salesSql_2: {
          statement: 'SELECT 1',
          params: {},
          projections: { value: { type: 'number' } },
        },
      },
    })
  ).not.toThrow();
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
        statement: `SELECT count(*) AS orders FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE (CASE json_extract_string($country, '$.kind')
  WHEN 'all' THEN TRUE
  WHEN 'include' THEN CASE WHEN c.country IS NULL THEN CAST(json_extract($country, '$.missing') AS BOOLEAN)
    ELSE list_contains(CAST(json_extract($country, '$.values') AS VARCHAR[]), c.country) END
  WHEN 'exclude' THEN CASE WHEN c.country IS NULL THEN NOT CAST(json_extract($country, '$.missing') AS BOOLEAN)
    ELSE NOT list_contains(CAST(json_extract($country, '$.values') AS VARCHAR[]), c.country) END
END)`,
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
  expect(delivered[0]!.statement).toBe(dimensions.queries.orders.statement);
});
