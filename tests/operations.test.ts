import { expect, test } from 'bun:test';
import { createDataClient, DataAppError } from '@/src/client/index';
import {
  defineOperation,
  parseCount,
  DataSourceError,
  type Lakehouse,
} from '@/src/core/contract';
import { createDataHandler } from '@/src/server/handler';

function operation() {
  return defineOperation({
    input: parseCount,
    output: parseCount,
    checks: [3],
    queryNames: { count: 'count' },
    policy: { maxQueryRows: 2, maxDurationMs: 100, exposeSql: true },
    async run({ query }, input) {
      const result = await query('count', `SELECT ${input}`, { limit: 8 });
      return result.rows[0]![0];
    },
  });
}

function lakehouse(): Lakehouse {
  return {
    async queryAll(statement, { limit, signal }) {
      expect(statement).toBe('SELECT 3');
      expect(limit).toBe(2);
      expect(signal.aborted).toBe(false);
      return { columns: [{ name: 'count' }], rows: [[3]], queryId: 'q1' };
    },
  };
}

test('browser and HTTP operations share parsing, bounds, and query evidence', async () => {
  const operations = { count: operation() };
  const client = createDataClient({ operations, lakehouse: lakehouse() });
  const browser = await client.query('count', 3);
  expect(browser).toMatchObject({
    data: 3,
    input: 3,
    queryIds: ['q1'],
    queries: [{ name: 'count', statement: 'SELECT 3', queryId: 'q1' }],
  });
  const handler = createDataHandler(operations, async () => ({
    lakehouse: lakehouse(),
    canDiscloseSql: true,
  }));
  const response = await handler(
    new Request('http://localhost/api/data/count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '3',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    data: browser.data,
    queryIds: browser.queryIds,
    queries: browser.queries,
  });
});

test('browser operations reject malformed inputs, unknown operations, and private execution failures', async () => {
  let calls = 0;
  const source: Lakehouse = {
    async queryAll() {
      calls++;
      throw new Error('private SQL and credentials');
    },
  };
  const client = createDataClient({
    operations: { count: operation() },
    lakehouse: source,
  });
  expect(await client.query('count', -1).catch(error => error)).toMatchObject({
    code: 'invalid_input',
  });
  expect(
    // @ts-expect-error Unknown operation must also be rejected at runtime.
    await client.query('__proto__', 3).catch(error => error)
  ).toMatchObject({
    code: 'not_found',
  });
  expect(calls).toBe(0);
  expect(await client.query('count', 3).catch(error => error)).toMatchObject({
    code: 'query_failed',
    message: 'The data request failed.',
  });
  const sourceError = createDataClient({
    operations: { count: operation() },
    lakehouse: {
      async queryAll() {
        throw new DataSourceError('rate_limited');
      },
    },
  });
  expect(
    await sourceError.query('count', 3).catch(error => error)
  ).toMatchObject({
    code: 'source_rate_limited',
  });
});

test('browser execution enforces output, row, and response byte bounds', async () => {
  const base = operation();
  const source = lakehouse();
  const cases = [
    {
      operation: {
        ...base,
        output() {
          throw new Error('private output');
        },
      },
      lakehouse: source,
    },
    {
      operation: base,
      lakehouse: {
        async queryAll() {
          return { columns: [{ name: 'count' }], rows: [[3], [3], [3]] };
        },
      },
    },
    {
      operation: { ...base, policy: { ...base.policy, maxResponseBytes: 1 } },
      lakehouse: source,
    },
  ];
  for (const entry of cases) {
    const client = createDataClient({
      operations: { count: entry.operation },
      lakehouse: entry.lakehouse,
    });
    expect(await client.query('count', 3).catch(error => error)).toMatchObject({
      code: 'query_failed',
    });
  }
  const hidden = createDataClient({
    operations: {
      count: { ...base, policy: { ...base.policy, exposeSql: false } },
    },
    lakehouse: source,
  });
  expect((await hidden.query('count', 3)).queries).toBeUndefined();
});

test('browser operations settle ignored deadlines and preserve caller cancellation', async () => {
  const base = operation();
  const hanging: Lakehouse = {
    queryAll() {
      return new Promise(() => {});
    },
  };
  const client = createDataClient({
    operations: {
      count: { ...base, policy: { ...base.policy, maxDurationMs: 5 } },
    },
    lakehouse: hanging,
  });
  expect(await client.query('count', 3).catch(error => error)).toMatchObject({
    code: 'timeout',
  });
  const controller = new AbortController();
  const request = client.query('count', 3, { signal: controller.signal });
  const reason = new Error('Caller cancelled');
  controller.abort(reason);
  expect(await request.catch(error => error)).toBe(reason);
  expect(
    await client
      .query('count', 3, { signal: controller.signal })
      .catch(error => error)
  ).toBe(reason);
});

test('browser operation clients require a SQL adapter', async () => {
  const operations = { count: operation() };
  expect(
    await createDataClient({ operations })
      .query('count', 3)
      .catch(error => error)
  ).toBeInstanceOf(DataAppError);
});

test('HTTP returns the exact serialization checked against the response byte limit', async () => {
  let serializations = 0;
  const count = {
    ...operation(),
    output() {
      return {
        toJSON() {
          serializations++;
          return serializations === 1
            ? 'safe'
            : 'unexpected second serialization';
        },
      };
    },
  };
  const handler = createDataHandler({ count }, async () => ({
    lakehouse: lakehouse(),
    canDiscloseSql: false,
  }));
  const response = await handler(
    new Request('http://localhost/api/data/count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '3',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ data: 'safe' });
  expect(serializations).toBe(1);
});
