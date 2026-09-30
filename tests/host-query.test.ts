import { expect, test } from 'bun:test';
import { executeHostedOperation } from '@/src/client/host-operation';
import { parseHostQueryResult } from '@/src/client/host-query';
import { createDataClient, installDataAppTransport } from '@/src/client/index';
import { DataAppError } from '@/src/client/transport';
import type { IframeTransport } from '@/src/client/iframe';
import {
  defineOperation,
  defineQueryNames,
  rowsAsRecords,
} from '@/src/core/contract';

const heroQueryNames = defineQueryNames({ heroes: 'hero-counts' });

function heroOperations(exposeSql = true) {
  return {
    heroes: defineOperation({
      input(value: unknown) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error('Choose an input.');

        return value as { extra?: boolean };
      },
      output(value: unknown) {
        return value as { label: string; value: number }[];
      },
      checks: [{}],
      queryNames: heroQueryNames,
      policy: { maxQueryRows: 10, maxDurationMs: 1_000, exposeSql },
      async run({ query }) {
        const result = await query(
          heroQueryNames.heroes,
          'select label, count(*) as value from heroes'
        );

        return rowsAsRecords(result, ['label', 'value']).map(row => ({
          label: String(row.label),
          value: Number(row.value),
        }));
      },
    }),
  };
}

test('host query responses normalize columns, rows, and failures', () => {
  expect(
    parseHostQueryResult({
      columns: ['label', { column_name: 'value', type: 'BIGINT' }],
      rows: [['Mutant', 377], { label: 'Human', value: 83 }],
      query_id: 'q1',
      errors: [],
    })
  ).toEqual({
    columns: [{ name: 'label' }, { name: 'value', type: 'BIGINT' }],
    rows: [
      ['Mutant', 377],
      ['Human', 83],
    ],
    queryId: 'q1',
  });
  expect(
    rowsAsRecords(
      parseHostQueryResult({
        columns: [{ name: 'label' }, { name: 'value' }],
        rows: [['Mutant', 377]],
        errors: {},
      }),
      ['label', 'value']
    )
  ).toEqual([{ label: 'Mutant', value: 377 }]);
  expect(() =>
    parseHostQueryResult({
      errors: [{ message: 'Catalog not found' }],
      request_id: 'req-1',
    })
  ).toThrow(DataAppError);
});

test('host query failures preserve the host message and reject malformed rows', () => {
  expect(() =>
    parseHostQueryResult({ errors: 'syntax error at line 1' })
  ).toThrow('syntax error at line 1');
  expect(() =>
    parseHostQueryResult({
      columns: ['label'],
      rows: [['Mutant', 1]],
    })
  ).toThrow('wrong width');
  expect(() =>
    parseHostQueryResult({ columns: ['label', 'label'], rows: [] })
  ).toThrow('duplicated');
  expect(() => parseHostQueryResult(null)).toThrow('invalid');
});

function installHost(respond: (sql: string) => unknown) {
  const requests: { route: string; payload: { sql: string } }[] = [];
  const frame = new EventTarget() as Window;
  const bridge = {
    request(message: { route: string; payload: { sql: string } }) {
      requests.push(message);

      return Promise.resolve(respond(message.payload.sql));
    },
    dispose() {},
  } as IframeTransport;
  const uninstall = installDataAppTransport(bridge, frame);
  const globals = globalThis as unknown as { window?: Window };
  const previous = globals.window;
  globals.window = frame;

  return {
    requests,
    restore() {
      uninstall();
      if (previous) globals.window = previous;
      else delete globals.window;
    },
  };
}

const heroRows = {
  columns: ['label', { name: 'value', type: 'BIGINT' }],
  rows: [['Mutant', 377], { label: 'Human', value: 83 }],
  queryId: 'q1',
  errors: null,
};

test('named operations fall back to host SQL only after data:query is unknown', async () => {
  const host = installHost(() => heroRows);
  const transportCalls: string[] = [];
  const operations = heroOperations();
  const client = createDataClient({
    operations,
    async transport(name) {
      transportCalls.push(name);
      throw new DataAppError('Unknown message route.', 'unknown_route');
    },
  });
  try {
    const first = await client.query('heroes', {});
    const second = await client.query('heroes', { extra: true });
    expect(transportCalls).toEqual(['heroes']);
    expect(host.requests).toEqual([
      {
        route: 'query:execute',
        payload: { sql: 'select label, count(*) as value from heroes' },
      },
      {
        route: 'query:execute',
        payload: { sql: 'select label, count(*) as value from heroes' },
      },
    ]);
    expect(first.data).toEqual([
      { label: 'Mutant', value: 377 },
      { label: 'Human', value: 83 },
    ]);
    expect(first.input).toEqual({});
    expect(first.queryIds).toEqual(['q1']);
    expect(first.queries).toEqual([
      {
        name: 'hero-counts',
        statement: 'select label, count(*) as value from heroes',
        queryId: 'q1',
      },
    ]);
    expect(second.input).toEqual({ extra: true });
    expect(JSON.stringify(host.requests)).not.toMatch(
      /token|credential|password/i
    );
  } finally {
    host.restore();
  }
});

test('a working data:query transport does not execute operations in the browser', async () => {
  const host = installHost(() => {
    throw new Error('Host SQL should not run.');
  });
  let calls = 0;
  const client = createDataClient({
    operations: heroOperations(),
    async transport() {
      calls += 1;

      return {
        status: 200,
        body: {
          data: [{ label: 'Local', value: 1 }],
          requestId: 'local',
          queriedAt: 'now',
          queryIds: [],
        },
      };
    },
  });
  try {
    const response = await client.query('heroes', {});
    await client.query('heroes', {});
    expect(calls).toBe(2);
    expect(host.requests).toHaveLength(0);
    expect(response.data).toEqual([{ label: 'Local', value: 1 }]);
    expect(response.requestId).toBe('local');
  } finally {
    host.restore();
  }
});

test('HTTP delivery does not switch to host SQL', async () => {
  const host = installHost(() => heroRows);
  const client = createDataClient({
    operations: heroOperations(),
    fetch: async function respond(_input: string | URL | Request) {
      return Response.json(
        {
          error: {
            code: 'unknown_route',
            message: 'Unknown message route.',
          },
        },
        { status: 404 }
      );
    } as typeof fetch,
  });
  try {
    const error = await client.query('heroes', {}).catch(caught => caught);
    expect(error).toMatchObject({ code: 'unknown_route' });
    expect(host.requests).toHaveLength(0);
  } finally {
    host.restore();
  }
});

test('query failures and other route errors stay on the original transport', async () => {
  const host = installHost(() => heroRows);
  const client = createDataClient({
    operations: heroOperations(),
    async transport() {
      throw new DataAppError('The data request failed.', 'request_failed');
    },
  });
  try {
    const error = await client.query('heroes', {}).catch(caught => caught);
    expect(error).toMatchObject({ code: 'request_failed' });
    expect(host.requests).toHaveLength(0);
    const omitted = createDataClient({
      async transport() {
        throw new DataAppError('Unknown message route.', 'unknown_route');
      },
    });
    expect(
      await omitted.query('heroes', {}).catch(caught => caught)
    ).toMatchObject({ code: 'unknown_route' });
  } finally {
    host.restore();
  }
});

test('host SQL errors, invalid input, and row limits use operation error codes', async () => {
  const host = installHost(sql => {
    if (sql.includes('too-many'))
      return { columns: ['label'], rows: [['Mutant'], ['Human']] };
    if (sql.includes('broken'))
      return {
        errors: [{ message: 'Catalog not found' }],
        request_id: 'req-9',
      };

    return heroRows;
  });
  const names = defineQueryNames({ wide: 'wide-rows', broken: 'broken-query' });
  const operations = {
    ...heroOperations(false),
    wide: defineOperation({
      input(value: unknown) {
        return value;
      },
      output(value: unknown) {
        return value as number;
      },
      checks: [{}],
      queryNames: names,
      policy: { maxQueryRows: 1, maxDurationMs: 1_000, exposeSql: true },
      async run({ query }) {
        await query(names.wide, 'select label from heroes too-many');

        return 1;
      },
    }),
    broken: defineOperation({
      input(value: unknown) {
        return value;
      },
      output(value: unknown) {
        return value as number;
      },
      checks: [{}],
      queryNames: names,
      policy: { maxQueryRows: 1, maxDurationMs: 1_000, exposeSql: false },
      async run({ query }) {
        await query(names.broken, 'select broken');

        return 1;
      },
    }),
  };
  const client = createDataClient({
    operations,
    async transport() {
      throw new DataAppError('Unknown message route.', 'unknown_route');
    },
  });
  try {
    expect(
      await client.query('heroes', 1 as never).catch(error => error)
    ).toMatchObject({ code: 'invalid_input' });
    expect(
      await client.query('missing' as 'heroes', {}).catch(error => error)
    ).toMatchObject({ code: 'not_found' });
    expect(
      await client.query('broken', {}).catch(error => error)
    ).toMatchObject({
      code: 'source_query_rejected',
      message: 'Catalog not found',
      requestId: 'req-9',
    });
    const wide = await client.query('wide', {}).catch(error => error);
    expect(wide).toMatchObject({
      code: 'query_failed',
      message: 'The data request failed.',
    });
    expect(wide.message).not.toContain('too-many');
    const hidden = await client.query('heroes', {});
    expect(hidden.queries).toBeUndefined();
  } finally {
    host.restore();
  }
});

test('hosted execution reports a missing transport without sending credentials', async () => {
  const frame = new EventTarget() as Window;
  const globals = globalThis as unknown as { window?: Window };
  const previous = globals.window;
  globals.window = frame;
  try {
    const response = await executeHostedOperation(
      heroOperations(),
      'heroes',
      {},
      undefined
    );
    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({
      error: {
        code: 'bridge_unavailable',
        message: 'Host transport is not available',
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/select label/);
  } finally {
    if (previous) globals.window = previous;
    else delete globals.window;
  }
});
