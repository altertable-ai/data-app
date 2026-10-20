import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  parseEmptyInput,
  type QueryResult,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, test } from 'vitest';

const app = defineDataApp({
  title: 'Typed rows',
  description: 'Verify declared result columns.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    revenue: {
      statement:
        'SELECT country, revenue, active, note, previous, enabled FROM revenue',
      params: {},
      projections: {
        country: { type: 'string' },
        revenue: { type: 'number' },
        active: { type: 'boolean' },
        note: { type: 'string', nullable: true },
        previous: { type: 'number', nullable: true },
        enabled: { type: 'boolean', nullable: true },
      },
    },
  },
});
const operation = app.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 2, maxDurationMs: 1000 },
  async run({ query }) {
    return (await query('revenue')).rows;
  },
});
function result(): QueryResult {
  return {
    columns: [
      'enabled',
      'previous',
      'note',
      'active',
      'revenue',
      'country',
    ].map(name => ({ name })),
    rows: [[null, null, null, true, '1.25e2', 'France']],
    queryId: 'revenue-query',
  };
}
function client(response: QueryResult) {
  return createDataClient({
    operations: { revenue: operation },
    lakehouse: {
      async queryAll() {
        return response;
      },
    },
  });
}

test('projection declarations decode typed records by returned name in browser and HTTP operations', async () => {
  const expected = [
    {
      country: 'France',
      revenue: 125,
      active: true,
      note: null,
      previous: null,
      enabled: null,
    },
  ];
  const browser = await client(result()).query('revenue', {});
  expect(browser.data).toEqual(expected);
  expect(browser.queryIds).toEqual(['revenue-query']);
  const handler = createDataHandler({ revenue: operation }, async () => ({
    lakehouse: {
      async queryAll() {
        return result();
      },
    },
  }));
  const response = await handler(
    new Request('https://app.example/api/data/revenue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    data: expected,
    queryIds: ['revenue-query'],
  });
  const present = result();
  present.rows = [[false, '-0.5', 'Measured', false, 0, 'France']];
  expect((await client(present).query('revenue', {})).data).toEqual([
    {
      country: 'France',
      revenue: 0,
      active: false,
      note: 'Measured',
      previous: -0.5,
      enabled: false,
    },
  ]);
});

async function castRows(
  response: QueryResult,
  name: 'casts' | 'nullable' = 'casts'
) {
  const declarations = defineDataApp({
    title: 'Casts',
    description: 'Apply declared casts.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      casts: {
        statement: 'SELECT label, amount, enabled, placeholder',
        params: {},
        projections: {
          label: { type: 'string', nullable: false },
          amount: { type: 'number', nullable: false },
          enabled: { type: 'boolean', nullable: false },
          placeholder: { type: 'null' },
        },
      },
      nullable: {
        statement: 'SELECT label, amount, enabled',
        params: {},
        projections: {
          label: { type: 'string' },
          amount: { type: 'number', nullable: true },
          enabled: { type: 'boolean' },
        },
      },
    },
  });
  const cast = declarations.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }) {
      return (await query(name)).rows;
    },
  });
  const responseClient = createDataClient({
    operations: { cast },
    lakehouse: {
      async queryAll() {
        return response;
      },
    },
  });
  return (await responseClient.query('cast', {})).data;
}

test('returned aliases may differ from projections, including for empty results', async () => {
  for (const columns of [
    [],
    result().columns.slice(1),
    [...result().columns, { name: 'extra' }],
    result().columns.map(() => ({ name: 'country' })),
    result().columns.map(column => ({ name: `${column.name}_changed` })),
  ]) {
    expect(
      (await client({ ...result(), columns, rows: [] }).query('revenue', {}))
        .data
    ).toEqual([]);
  }
  expect(
    await castRows({
      columns: [{ name: 'extra' }, { name: 'label' }],
      rows: [
        [{ count: 1 }, 42],
        [undefined, false],
      ],
    })
  ).toEqual([
    { extra: '{"count":1}', label: '42' },
    { extra: undefined, label: 'false' },
  ]);
});

test('cells use scalar casts and numeric failures return the error marker', async () => {
  expect(
    await castRows({
      columns: ['label', 'amount', 'enabled', 'placeholder'].map(name => ({
        name,
      })),
      rows: [
        [null, null, null, 'ignored'],
        [{}, '', 'false', undefined],
        [Infinity, '0x10', 0, 42],
        [undefined, 'bad', [], false],
        [false, Infinity, '', null],
        [true, '1e-1000', '0', true],
      ],
    })
  ).toEqual([
    { label: 'null', amount: 0, enabled: false, placeholder: null },
    { label: '[object Object]', amount: 0, enabled: true, placeholder: null },
    { label: 'Infinity', amount: 16, enabled: false, placeholder: null },
    {
      label: 'undefined',
      amount: '##ERROR##',
      enabled: true,
      placeholder: null,
    },
    { label: 'false', amount: '##ERROR##', enabled: false, placeholder: null },
    { label: 'true', amount: 0, enabled: true, placeholder: null },
  ]);
});

test('null cells pass through fields with omitted or true nullable flags', async () => {
  expect(
    await castRows(
      {
        columns: ['label', 'amount', 'enabled', 'extra'].map(name => ({
          name,
        })),
        rows: [[null, null, null, null]],
      },
      'nullable'
    )
  ).toEqual([{ label: null, amount: null, enabled: null, extra: null }]);
});

test('query result row widths still match the returned columns', async () => {
  for (const rows of [[[]], [[...result().rows[0]!, 'extra']]]) {
    await expect(
      client({ ...result(), rows }).query('revenue', {})
    ).rejects.toMatchObject({ code: 'query_failed' });
  }
});

test('unchecked lakehouse result structures cannot bypass column decoding', async () => {
  const sparseRows: QueryResult['rows'] = [];
  sparseRows.length = 1;
  const sparseColumns: QueryResult['columns'] = [];
  sparseColumns.length = 6;
  for (const response of [
    null,
    {},
    { ...result(), columns: null },
    { ...result(), rows: null },
    { ...result(), rows: [null] },
    { ...result(), rows: sparseRows },
    { ...result(), columns: sparseColumns, rows: [] },
    { ...result(), columns: [{ name: 1 }], rows: [] },
    { ...result(), columns: [null], rows: [] },
    {
      ...result(),
      columns: [
        Object.assign([], { name: 'enabled' }),
        ...result().columns.slice(1),
      ],
      rows: [],
    },
    {
      ...result(),
      columns: result().columns.map(column => ({ ...column, type: 1 })),
    },
    { ...result(), queryId: 1 },
  ]) {
    // @ts-expect-error Custom JavaScript adapters can return malformed data.
    await expect(client(response).query('revenue', {})).rejects.toMatchObject({
      code: 'query_failed',
    });
  }
});

test('query projection contracts are copied and frozen with their registry', async () => {
  const projections = { value: { type: 'number' as const } };
  const definition = {
    title: 'Snapshot',
    description: 'Verify immutable projections.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      value: { statement: 'SELECT 1 AS value', params: {}, projections },
    },
  };
  const owned = defineDataApp(definition);
  Reflect.set(projections.value, 'type', 'string');
  expect(owned.queries.value.projections).toEqual({
    value: { type: 'number' },
  });
  expect(
    Reflect.set(owned.queries.value.projections.value, 'type', 'string')
  ).toBe(false);
  expect(Reflect.set(owned.queries.value.projections, 'value', 'string')).toBe(
    false
  );
  const selected = owned.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }) {
      return (await query('value')).rows;
    },
  });
  expect(
    (
      await createDataClient({
        operations: { value: selected },
        lakehouse: {
          async queryAll() {
            return { columns: [{ name: 'value' }], rows: [['3']] };
          },
        },
      }).query('value', {})
    ).data
  ).toEqual([{ value: 3 }]);
});

test('all-null rows preserve nullable values and intentional null-only projections', async () => {
  const nullable = defineDataApp({
    title: 'Null results',
    description: 'Preserve null semantics.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      values: {
        statement:
          'SELECT CAST(NULL AS DOUBLE) AS amount, CAST(NULL AS VARCHAR) AS label, CAST(NULL AS BOOLEAN) AS enabled, NULL AS placeholder',
        params: {},
        projections: {
          amount: { type: 'number', nullable: true },
          label: { type: 'string', nullable: true },
          enabled: { type: 'boolean', nullable: true },
          placeholder: { type: 'null' },
        },
      },
    },
  });
  const values = nullable.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 2, maxDurationMs: 1000 },
    async run({ query }) {
      return (await query('values')).rows;
    },
  });
  const response: QueryResult = {
    columns: ['amount', 'label', 'enabled', 'placeholder'].map(name => ({
      name,
    })),
    rows: [[null, null, null, null]],
  };
  const dataClient = createDataClient({
    operations: { values },
    lakehouse: {
      async queryAll() {
        return response;
      },
    },
  });
  expect((await dataClient.query('values', {})).data).toEqual([
    { amount: null, label: null, enabled: null, placeholder: null },
  ]);
  for (const invalid of [undefined, 0, false, '']) {
    response.rows = [[null, null, null, invalid]];
    expect((await dataClient.query('values', {})).data).toEqual([
      { amount: null, label: null, enabled: null, placeholder: null },
    ]);
  }
});

test('run manipulates declared scalar types after query casting in browser and HTTP delivery', async () => {
  const declared = defineDataApp({
    title: 'Scalar casts',
    description: 'Decode before deriving data.',
    scope: { organization: 'demo', environment: 'test' },
    queries: {
      values: {
        statement:
          'SELECT name, amount, enabled, note FROM values LIMIT $limit',
        params: { limit: { type: 'number', nullable: true } },
        projections: {
          name: { type: 'string' },
          amount: { type: 'number' },
          enabled: { type: 'boolean' },
          note: { type: 'string', nullable: true },
        },
      },
    },
  });
  const values = declared.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }) {
      const result = await query('values', { limit: null });
      return result.rows.map(row => ({
        name: row.name.toUpperCase(),
        amount: row.amount + 1,
        enabled: !row.enabled,
        note: row.note,
      }));
    },
  });
  const lakehouse = {
    async queryAll(_statement: string, options: { params?: unknown }) {
      expect(options.params).toEqual({ limit: null });
      return {
        columns: ['name', 'amount', 'enabled', 'note'].map(name => ({ name })),
        rows: [
          [42, '2.5', 'false', null],
          [false, true, '1', 7],
          ['name', false, 0, true],
        ],
      };
    },
  };
  const expected = [
    { name: '42', amount: 3.5, enabled: false, note: null },
    { name: 'FALSE', amount: 2, enabled: false, note: '7' },
    { name: 'NAME', amount: 1, enabled: true, note: 'true' },
  ];
  const browser = createDataClient({ operations: { values }, lakehouse });
  expect((await browser.query('values', {})).data).toEqual(expected);
  const handle = createDataHandler({ values }, async () => ({ lakehouse }));
  const response = await handle(
    new Request('https://app.example/api/data/values', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ data: expected });
});

test('malformed field declarations fail even when a query would return no rows', () => {
  for (const field of [
    'number',
    { type: 'Date' },
    { type: 'number', nullable: 'true' },
    null,
  ]) {
    expect(() =>
      defineDataApp({
        title: 'Invalid fields',
        description: 'Validate JavaScript manifest boundaries.',
        scope: { organization: 'demo', environment: 'test' },
        // @ts-expect-error Untyped manifests can supply malformed fields.
        queries: {
          values: {
            statement: 'SELECT value WHERE false',
            params: {},
            projections: { value: field },
          },
        },
      })
    ).toThrow('Query fields need a supported type');
  }
});

test('untyped manifests cannot omit named projections', () => {
  for (const projections of [
    {},
    { '': { type: 'number' } },
    { ' ': { type: 'number' } },
  ]) {
    expect(() =>
      defineDataApp({
        title: 'Named projections',
        description: 'Reject empty projection contracts at the boundary.',
        scope: { organization: 'demo', environment: 'test' },
        // @ts-expect-error Untyped manifests can bypass the finite projection contract.
        queries: { values: { statement: 'SELECT 1', params: {}, projections } },
      })
    ).toThrow('Queries need at least one named projection.');
  }
});
