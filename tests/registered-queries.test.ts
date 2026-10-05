import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rejects } from 'node:assert/strict';
import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  defineOperation,
  defineQueryNames,
  defineQueryVariables,
  parseQueryVariables,
  defineDataAppRegistration,
  buildQueryStatement,
  queryVariableNames,
  registeredQueryRoute,
  createMessageRouter,
  type QueryVariableBindings,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import { createRegisteredQueryHandler } from '@altertable/data-app/embed';
import { localLakehouse, serveLocalApp } from '@altertable/data-app/server/bun';
import { queryVariable } from '@altertable/data-app/react';

const names = defineQueryNames({ search: 'find-person' });
const variables = defineQueryVariables([
  { name: 'name', nullable: false, type: 'STRING', default: '' },
  { name: 'count', nullable: false, type: 'INTEGER', default: 10 },
]);
const operation = defineOperation({
  queryNames: names,
  variables,
  input: value => parseQueryVariables(variables, value),
  output: (value: unknown) => value,
  checks: [{ name: 'Alice', count: 10 }],
  policy: { maxQueryRows: 5, maxDurationMs: 1000, exposeSql: true },
  async run({ query }, input) {
    return query(names.search, { name: input.name });
  },
});

const registration = defineDataAppRegistration({
  queries: { [names.search]: 'SELECT {{name}} AS name' },
  variables,
});

test('browser-owned operations resolve separate registration through the local HTTP proxy', async () => {
  const database = new Database(':memory:');
  const statements: string[] = [];
  const source = localLakehouse(
    {
      ALTERTABLE_DATA_PROXY_URL: 'http://local/',
      ALTERTABLE_DATA_PROXY_TOKEN: 'test',
    },
    (async (_url, init) => {
      const { statement, limit } = JSON.parse(init!.body as string);
      statements.push(statement);
      expect(limit).toBe(5);
      const rows = database.query(statement).values();
      return new Response(
        [
          JSON.stringify({ query_id: 'q1' }),
          JSON.stringify(['name']),
          ...rows.map(row => JSON.stringify(row)),
        ].join('\n')
      );
    }) as typeof fetch
  );
  const execute = createRegisteredQueryHandler(
    registration,
    async () => source
  );
  const requests: unknown[] = [];
  const client = createDataClient({
    operations: { search: operation },
    lakehouse: {
      async queryAll() {
        throw new Error('Raw SQL is unavailable.');
      },
      async queryRegistered(operation, variables, { limit, signal }) {
        const query = { operation, variables, limit };
        requests.push(query);
        return execute(query, { signal });
      },
    },
  });
  try {
    const value = "Robert'); DROP TABLE people; --\\";
    const response = await client.query('search', { name: value, count: 10 });
    expect(response.data).toEqual({
      columns: [{ name: 'name' }],
      rows: [[value]],
      queryId: 'q1',
    });
    expect(response.queryIds).toEqual(['q1']);
    expect(requests).toEqual([
      { operation: 'find-person', variables: { name: value }, limit: 5 },
    ]);
    expect(statements[0]).not.toContain('{{');
    expect(statements).toHaveLength(1);
  } finally {
    database.close();
  }
});

test('registered host uses trusted definitions, validates values, and does not accept raw SQL', async () => {
  let calls = 0;
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    {
      'data:query': createRegisteredQueryHandler(registration, async () => ({
        async queryAll(statement) {
          calls++;
          return { columns: [{ name: 'name' }], rows: [[statement]] };
        },
      })),
    }
  );
  function dispatch(payload: unknown) {
    return router.dispatch(
      { route: 'data:query', payload },
      { signal: new AbortController().signal }
    );
  }
  const response = await dispatch({
    operation: 'find-person',
    variables: { name: "O'Brien" },
    limit: 5,
  });
  expect(response).toEqual({
    columns: [{ name: 'name' }],
    rows: [["SELECT 'O''Brien' AS name"]],
  });
  await rejects(
    dispatch({ operation: 'find-person', variables: { name: 2 }, limit: 5 }),
    /Invalid query variables/
  );
  await rejects(
    dispatch({
      operation: 'find-person',
      variables: { name: '', extra: true },
      limit: 5,
    })
  );
  await rejects(
    dispatch({ operation: 'other', variables: {}, limit: 5 }),
    /Unknown query/
  );
  await rejects(
    dispatch({
      operation: 'find-person',
      statement: 'SELECT 2',
      variables: {},
      limit: 5,
    })
  );
  await rejects(
    router.dispatch(
      { route: 'data:sql', payload: { statement: 'SELECT 2', limit: 5 } },
      { signal: new AbortController().signal }
    )
  );
  expect(calls).toBe(1);
});

test('SQL helper behavior matches platform null and range semantics', () => {
  const values: QueryVariableBindings = {
    text: { type: 'STRING', value: null },
    period: {
      type: 'DATETIMERANGE',
      value: { from: new Date('2026-09-01T00:00:00Z'), to: null },
    },
    interval: { type: 'INTERVAL', value: 'DAILY' },
    duration: { type: 'DURATION', value: { amount: 2, unit: 'WEEK' } },
  };
  expect(
    buildQueryStatement(
      "SELECT date_trunc('{{interval}}', created_at) - {{duration}} WHERE {{equals(country, text)}} AND {{not_equals(country, text)}} AND {{between(created_at, period)}}",
      values
    )
  ).toBe(
    "SELECT date_trunc('day', created_at) - INTERVAL 2 WEEK WHERE country IS NULL AND country IS NOT NULL AND created_at > '2026-09-01T00:00:00.000Z'"
  );
  expect(
    queryVariableNames(
      'SELECT {{name}} -- {{missing}}\n /* {{missing}} */',
      variables
    )
  ).toEqual(['name']);
  expect(() => queryVariableNames("SELECT '{{name}}'", variables)).toThrow();
  expect(() => queryVariableNames('SELECT {{missing}}', variables)).toThrow();
  expect(() =>
    buildQueryStatement('SELECT {{value}}', {
      value: { type: 'FLOAT', value: Infinity },
    })
  ).toThrow();
});

test('frontend variable shapes survive URL/JSON round trips and reject malformed values', () => {
  const definitions = defineQueryVariables([
    { name: 'count', nullable: false, type: 'INTEGER', default: 2 },
    {
      name: 'date',
      nullable: false,
      type: 'DATETIME',
      default: new Date('2026-09-01T00:00:00Z'),
    },
    {
      name: 'range',
      nullable: false,
      type: 'DATETIMERANGE',
      default: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [{ amount: -1, unit: 'MONTH' }],
        },
        to: null,
      },
    },
    { name: 'bool', nullable: false, type: 'BOOLEAN', default: false },
  ]);
  const parsed = parseQueryVariables(
    definitions,
    JSON.parse(
      JSON.stringify(
        Object.fromEntries(definitions.map(def => [def.name, def.default]))
      )
    )
  );
  expect(parsed.date).toBeInstanceOf(Date);
  expect(parsed.range.from).toEqual(definitions[2].default.from);
  expect(() => parseQueryVariables(definitions, { count: '2' })).toThrow();
  expect(() => parseQueryVariables(definitions, { bool: 'false' })).toThrow();
  const variable = queryVariable(definitions[1], { key: 'date' });
  const next = new Date('2026-10-01T00:00:00Z');
  expect(
    variable.read(new URLSearchParams({ date: variable.write(next).date! }))
  ).toEqual(next);
});

test('relative dates use one clock and clamp month offsets', () => {
  const now = new Date('2026-03-31T12:34:00Z');
  const value: QueryVariableBindings = {
    date: {
      type: 'DATETIME',
      value: {
        anchor: 'RELATIVE_ANCHOR_NOW',
        offset: [{ amount: -1, unit: 'MONTH' }],
      },
    },
  };
  expect(buildQueryStatement('SELECT {{date}}, {{date}}', value, { now })).toBe(
    "SELECT '2026-02-28T12:34:00.000Z', '2026-02-28T12:34:00.000Z'"
  );
});

test('variable options validate canonical dates, uniqueness and explicit nullability', () => {
  const definition = {
    name: 'period',
    nullable: false,
    type: 'DATETIMERANGE',
    default: { from: new Date('2026-09-01T00:00:00Z') },
    options: [{ from: new Date('2026-09-01T00:00:00Z') }],
  } as const;
  const definitions = defineQueryVariables([definition]);
  expect(parseQueryVariables(definitions, {}).period).toEqual({
    from: new Date('2026-09-01T00:00:00Z'),
    to: null,
  });
  expect(() =>
    defineQueryVariables([
      {
        name: 'name',
        nullable: false,
        default: '',
        type: 'STRING',
        options: ['A', 'A'],
      },
    ])
  ).toThrow('unique');
  expect(() =>
    defineQueryVariables([
      // @ts-expect-error runtime validation also rejects a null default when not nullable
      { name: 'name', nullable: false, type: 'STRING', default: null },
    ])
  ).toThrow();
  expect(() =>
    parseQueryVariables(
      [
        {
          name: 'day',
          type: 'DATETIME',
          nullable: false,
          default: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      { day: '2026-02-31T00:00:00Z' }
    )
  ).toThrow();
});

test('registration requires named variables with explicit nullability and typed defaults', () => {
  const valid = {
    name: 'country',
    type: 'STRING',
    nullable: false,
    default: 'FR',
  };
  for (const invalid of [
    { type: 'STRING', nullable: false, default: '' },
    { name: 'country', type: 'STRING', default: '' },
    { name: 'country', type: 'STRING', nullable: false },
    { ...valid, default: null },
    { ...valid, default: 12 },
    { ...valid, name: '__proto__' },
  ]) {
    expect(() =>
      defineDataAppRegistration(
        JSON.parse(JSON.stringify({ queries: {}, variables: [invalid] }))
      )
    ).toThrow();
  }
  expect(() =>
    defineDataAppRegistration(
      JSON.parse(JSON.stringify({ queries: {}, variables: [valid, valid] }))
    )
  ).toThrow();
  expect(() =>
    defineDataAppRegistration(
      JSON.parse(JSON.stringify({ queries: {}, variables: { country: valid } }))
    )
  ).toThrow();
  const nullable = defineQueryVariables([
    { name: 'country', type: 'STRING', nullable: true, default: null },
  ]);
  expect(parseQueryVariables(nullable, {})).toEqual({ country: null });
  expect(() =>
    defineDataAppRegistration({
      queries: { count: 'SELECT {{missing}}' },
      variables: nullable,
    })
  ).toThrow();
});

test('local serving rejects SQL registration imports into the iframe bundle', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'registered-app-boundary-'));
  try {
    await writeFile(
      join(directory, 'queries.json'),
      JSON.stringify({ count: 'SELECT 1' })
    );
    await writeFile(
      join(directory, 'app.ts'),
      "import queries from './queries.json'; console.log(queries);"
    );
    await rejects(
      serveLocalApp({
        entrypoint: join(directory, 'app.ts'),
        registration: { queries: { count: 'SELECT 1' }, variables: [] },
        title: 'Test',
        port: 0,
      }),
      /server-owned/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
