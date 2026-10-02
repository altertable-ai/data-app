import { rejects } from 'node:assert/strict';
import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  defineOperation,
  defineQueryNames,
  defineQueryVariables,
  parseQueryVariables,
  getDataAppRegistration,
  buildQueryStatement,
  queryVariableNames,
  registeredQueryRoute,
  createMessageRouter,
  type QueryVariableBindings,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import { createRegisteredQueryHandler } from '@altertable/data-app/embed';
import { localLakehouse } from '@altertable/data-app/server/bun';
import { queryVariable } from '@altertable/data-app/react';

const names = defineQueryNames({ search: 'find-person' });
const variables = defineQueryVariables({
  name: { type: 'STRING', default: '' },
  count: { type: 'INTEGER', default: 10 },
});
const operation = defineOperation({
  queryNames: names,
  queries: { [names.search]: 'SELECT {{name}} AS name' },
  variables,
  input: value => parseQueryVariables(variables, value),
  output: (value: unknown) => value,
  checks: [{ name: 'Alice', count: 10 }],
  policy: { maxQueryRows: 5, maxDurationMs: 1000, exposeSql: true },
  async run({ query }, input) {
    return query(names.search, input);
  },
});

test('registered operations export complete metadata and execute through a local statement proxy', async () => {
  const registration = getDataAppRegistration({ search: operation });
  expect(registration).toEqual({
    queries: { 'find-person': 'SELECT {{name}} AS name' },
    variables,
  });
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
  const client = createDataClient({
    operations: { search: operation },
    lakehouse: source,
  });
  const value = "Robert'); DROP TABLE people; --\\";
  const response = await client.query('search', { name: value, count: 10 });
  expect(response.data).toEqual({
    columns: [{ name: 'name' }],
    rows: [[value]],
    queryId: 'q1',
  });
  expect(response.queryIds).toEqual(['q1']);
  expect(statements[0]).not.toContain('{{');
  database.close();
});

test('registered host uses trusted definitions, validates values, and does not accept raw SQL', async () => {
  let calls = 0;
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    {
      'data:query': createRegisteredQueryHandler(
        getDataAppRegistration({ search: operation }),
        async () => ({
          async queryAll(statement) {
            calls++;
            return { columns: [{ name: 'name' }], rows: [[statement]] };
          },
        })
      ),
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
  const definitions = defineQueryVariables({
    count: { type: 'INTEGER', default: 2 },
    date: { type: 'DATETIME', default: new Date('2026-09-01T00:00:00Z') },
    range: {
      type: 'DATETIMERANGE',
      default: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [{ amount: -1, unit: 'MONTH' }],
        },
        to: null,
      },
    },
    bool: { type: 'BOOLEAN', default: false },
  });
  const parsed = parseQueryVariables(
    definitions,
    JSON.parse(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(definitions).map(([key, def]) => [key, def.default])
        )
      )
    )
  );
  expect(parsed.date).toBeInstanceOf(Date);
  expect(parsed.range.from).toEqual(definitions.range.default.from);
  expect(() => parseQueryVariables(definitions, { count: '2' })).toThrow();
  expect(() => parseQueryVariables(definitions, { bool: 'false' })).toThrow();
  const variable = queryVariable(definitions.date, { key: 'date' });
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
    type: 'DATETIMERANGE',
    default: { from: new Date('2026-09-01T00:00:00Z') },
    options: [{ from: new Date('2026-09-01T00:00:00Z') }],
  } as const;
  const definitions = defineQueryVariables({ period: definition });
  expect(parseQueryVariables(definitions, {}).period).toEqual({
    from: new Date('2026-09-01T00:00:00Z'),
    to: null,
  });
  expect(() =>
    defineQueryVariables({ name: { type: 'STRING', options: ['A', 'A'] } })
  ).toThrow('unique');
  expect(() =>
    defineQueryVariables({ name: { type: 'STRING', default: null } })
  ).toThrow();
  expect(() =>
    parseQueryVariables(
      { day: { type: 'DATETIME' } },
      { day: '2026-02-31T00:00:00Z' }
    )
  ).toThrow();
});
