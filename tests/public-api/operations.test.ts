import { expect, test } from 'vitest';
import { createDataClient, DataAppError } from '@altertable/data-app/client';
import {
  defineOperation,
  parseCount,
  DataSourceError,
  type Lakehouse,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';

function operation() {
  return defineOperation({
    input: parseCount,
    output: parseCount,
    checks: [3],
    queries: { count: { statement: 'SELECT $count', params: { count: {} } } },
    policy: { maxQueryRows: 2, maxDurationMs: 100 },
    async run({ query }, input) {
      const result = await query('count', { count: input }, { limit: 8 });
      return result.rows[0]![0];
    },
  });
}

function lakehouse(): Lakehouse {
  return {
    async queryAll(statement, { limit, signal, params }) {
      expect(statement).toBe('SELECT $count');
      expect(params).toEqual({ count: 3 });
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
    queries: [
      {
        name: 'count',
        statement: 'SELECT $count',
        params: { count: 3 },
        queryId: 'q1',
      },
    ],
  });
  const handler = createDataHandler(operations, async () => ({
    lakehouse: lakehouse(),
  }));
  const http = createDataClient<typeof operations>({
    endpoint: 'http://localhost/api/data',
    fetch: Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) =>
        handler(new Request(url, options)),
      { preconnect() {} }
    ),
  });
  expect(await http.query('count', 3)).toMatchObject({
    data: browser.data,
    input: browser.input,
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
});

test('browser and HTTP execution preserve public source failures across package entries', async () => {
  const operations = { count: operation() };
  const source: Lakehouse = {
    async queryAll() {
      throw new DataSourceError('rate_limited');
    },
  };
  const sourceError = createDataClient({ operations, lakehouse: source });
  expect(
    await sourceError.query('count', 3).catch(error => error)
  ).toMatchObject({
    code: 'source_rate_limited',
  });
  const handler = createDataHandler(operations, async () => ({
    lakehouse: source,
  }));
  const response = await handler(
    new Request('http://localhost/api/data/count', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '3',
    })
  );
  expect(response.status).toBe(429);
  expect(await response.json()).toMatchObject({
    error: { code: 'source_rate_limited' },
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

test('an authorized client queries an operation with validated input and query evidence', async () => {
  const operations = {
    count: defineOperation({
      input: parseCount,
      output: parseCount,
      checks: [3],
      queries: { count: { statement: 'SELECT $count', params: { count: {} } } },
      policy: { maxQueryRows: 2, maxDurationMs: 1000 },
      async run({ query }, input) {
        const result = await query('count', { count: input });
        return result.rows[0]![0];
      },
    }),
  };
  let authorized = true;
  const handler = createDataHandler(operations, async () => {
    if (!authorized) throw new Error('Access denied');
    return {
      lakehouse: {
        async queryAll() {
          return {
            columns: [{ name: 'count' }],
            rows: [[3]],
            queryId: 'query-1',
          };
        },
      },
    };
  });
  const client = createDataClient<typeof operations>({
    endpoint: 'https://app.example/api/data',
    fetch: Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) =>
        handler(new Request(url, options)),
      { preconnect() {} }
    ),
  });

  await expect(client.query('count', 3)).resolves.toMatchObject({
    data: 3,
    input: 3,
    queryIds: ['query-1'],
    queries: [
      {
        name: 'count',
        statement: 'SELECT $count',
        params: { count: 3 },
        queryId: 'query-1',
      },
    ],
  });
  await expect(client.query('count', -1)).rejects.toMatchObject({
    code: 'invalid_input',
  });

  authorized = false;
  await expect(client.query('count', 3)).rejects.toMatchObject({
    code: 'forbidden',
  });
});

test('an HTTP client rejects malformed results and exposes actionable errors without upstream details', async () => {
  const valid = {
    data: 3,
    requestId: 'request',
    queriedAt: 'now',
    queryIds: [],
  };
  let body: unknown = valid;
  let status = 200;
  const client = createDataClient({
    endpoint: 'https://app.example/api/data',
    fetch: Object.assign(
      async () =>
        typeof body === 'string'
          ? new Response(body, { status })
          : Response.json(body, { status }),
      { preconnect() {} }
    ),
  });
  await expect(client.query('count', {})).resolves.toMatchObject({ data: 3 });
  for (const malformed of [
    {},
    { requestId: 'request', queriedAt: 'now', queryIds: [] },
    { ...valid, requestId: undefined },
    { ...valid, queriedAt: undefined },
    { ...valid, queryIds: [1] },
    { ...valid, queries: [{ name: 'query', statement: 1 }] },
    [],
  ]) {
    body = malformed;
    await expect(client.query('count', {})).rejects.toMatchObject({
      code: 'invalid_response',
    });
  }
  status = 403;
  body = {
    error: { code: 'forbidden', message: 'Denied', requestId: 'denied' },
  };
  await expect(client.query('count', {})).rejects.toMatchObject({
    code: 'forbidden',
    message: 'Denied',
    requestId: 'denied',
  });
  status = 502;
  body = 'Private upstream details';
  await expect(client.query('count', {})).rejects.toMatchObject({
    code: 'request_failed',
    message: 'Could not load data.',
  });
});
