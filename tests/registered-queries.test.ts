import { rejects } from 'node:assert/strict';
import { expect, test } from 'bun:test';
import {
  defineOperation,
  defineQueryNames,
  registeredQueryRoute,
  createMessageRouter,
  type QueryVariableDefinitions,
  type QueryVariableValues,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import { queryVariable } from '@altertable/data-app/react';

const variables = [
  { name: 'name', nullable: false, type: 'STRING', default: '' },
] as const satisfies QueryVariableDefinitions;

test('registered queries forward values unchanged and preserve backend results', async () => {
  const queryNames = defineQueryNames({ search: 'find-person' });
  const operation = defineOperation({
    queryNames,
    variables,
    input: value => value as QueryVariableValues<typeof variables>,
    output: (value: unknown) => value,
    checks: [{ name: 'Alice' }],
    policy: { maxQueryRows: 5, maxDurationMs: 1000, exposeSql: true },
    run: ({ query }, input) => query(queryNames.search, input),
  });
  const requests: unknown[] = [];
  const client = createDataClient({
    operations: { search: operation },
    lakehouse: {
      async queryAll() {
        throw new Error('Raw SQL is unavailable.');
      },
      async queryRegistered(operation, variables, { limit }) {
        requests.push({ operation, variables, limit });
        return {
          columns: [{ name: 'name' }],
          rows: [[variables.name]],
          queryId: 'q1',
        };
      },
    },
  });
  const name = "Robert'); DROP TABLE people; --\\";
  const response = await client.query('search', { name });
  expect(requests).toEqual([
    { operation: 'find-person', variables: { name }, limit: 5 },
  ]);
  expect(response.queryIds).toEqual(['q1']);
  expect(response.queries).toEqual([]);
  expect(response.data).toEqual({
    columns: [{ name: 'name' }],
    rows: [[name]],
    queryId: 'q1',
  });
});

test('registered route validates the envelope and leaves variable validation to the backend', async () => {
  const requests: unknown[] = [];
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    {
      'data:query': query => {
        requests.push(query);
        return { columns: [], rows: [] };
      },
    }
  );
  const context = { signal: new AbortController().signal };
  const payload = {
    operation: 'find-person',
    variables: { name: 2, extra: true },
    limit: 5,
  };
  await router.dispatch({ route: 'data:query', payload }, context);
  expect(requests).toEqual([payload]);
  await rejects(
    router.dispatch(
      { route: 'data:query', payload: { ...payload, statement: 'SELECT 2' } },
      context
    )
  );
  await rejects(
    router.dispatch(
      { route: 'data:sql', payload: { statement: 'SELECT 2', limit: 5 } },
      context
    )
  );
});

test('date controls restore dates from URL state without resolving relative values', () => {
  const variable = queryVariable(
    {
      name: 'date',
      type: 'DATETIME',
      nullable: false,
      default: new Date('2026-09-01T00:00:00Z'),
    },
    { key: 'date' }
  );
  const next = new Date('2026-10-01T00:00:00Z');
  expect(
    variable.read(new URLSearchParams({ date: variable.write(next).date! }))
  ).toEqual(next);
  const relative = { anchor: 'RELATIVE_ANCHOR_NOW' as const, offset: [] };
  expect(
    variable.read(new URLSearchParams({ date: JSON.stringify(relative) }))
  ).toEqual(relative);
});
