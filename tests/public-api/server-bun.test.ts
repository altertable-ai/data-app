import { expect, test } from 'vitest';
import { localLakehouse } from '@altertable/data-app/server/bun';
import { DataSourceError } from '@altertable/data-app/contract';

test('local lakehouse uses the official SDK for direct credentials, parameters and typed results', async () => {
  const source = localLakehouse(
    {
      ALTERTABLE_API_BASE: 'http://127.0.0.1:1234/',
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        expect(url instanceof Request ? url.url : url.toString()).toBe(
          'http://127.0.0.1:1234/query'
        );
        const headers = new Headers(options?.headers);
        expect(headers.get('authorization')).toBe(
          `Basic ${btoa('user:secret')}`
        );
        expect(headers.get('user-agent')).toMatch(/^altertable-lakehouse-js\//);
        expect(JSON.parse(options!.body as string)).toEqual({
          statement: 'SELECT $value AS value',
          limit: 1,
          params: { value: "O'Reilly" },
        });
        return new Response(
          '{"query_id":"q1"}\n[{"name":"value","type":"VARCHAR"}]\n["O\u0027Reilly"]\n'
        );
      },
      { preconnect() {} }
    )
  );
  expect(
    await source.queryAll('SELECT $value AS value', {
      params: { value: "O'Reilly" },
      limit: 1,
      signal: new AbortController().signal,
    })
  ).toEqual({
    columns: [{ name: 'value', type: 'VARCHAR' }],
    rows: [["O'Reilly"]],
    queryId: 'q1',
  });
});

test('local lakehouse delivers CLI proxy queries with authentication and query evidence', async () => {
  const proxied = localLakehouse(
    {
      ALTERTABLE_DATA_PROXY_URL: 'http://127.0.0.1:1234',
      ALTERTABLE_DATA_PROXY_TOKEN: 'run-token',
    },
    Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        expect(url instanceof Request ? url.url : url.toString()).toBe(
          'http://127.0.0.1:1234/query'
        );
        expect(new Headers(options?.headers).get('authorization')).toBe(
          'Bearer run-token'
        );

        if (typeof options?.body !== 'string')
          throw new Error('Expected a JSON request body.');
        expect(JSON.parse(options.body)).toEqual({
          statement: 'SELECT $value',
          limit: 1,
          params: { value: 1 },
        });
        return new Response(
          '{"query_id":"q1"}\n[{"name":"value","type":"INTEGER"}]\n[1]\n'
        );
      },
      { preconnect() {} }
    )
  );
  expect(
    await proxied.queryAll('SELECT $value', {
      params: { value: 1 },
      limit: 1,
      signal: new AbortController().signal,
    })
  ).toMatchObject({ rows: [[1]], queryId: 'q1' });
});

test('local lakehouse treats empty proxy and API base variables as unset', async () => {
  const urls: string[] = [];
  const source = localLakehouse(
    {
      ALTERTABLE_DATA_PROXY_URL: '',
      ALTERTABLE_DATA_PROXY_TOKEN: '',
      ALTERTABLE_API_BASE: '',
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        urls.push(url instanceof Request ? url.url : url.toString());
        expect(new Headers(options?.headers).get('authorization')).toBe(
          `Basic ${btoa('user:secret')}`
        );
        return new Response(
          '{"query_id":"q1"}\n[{"name":"value","type":"INTEGER"}]\n[1]\n'
        );
      },
      { preconnect() {} }
    )
  );

  await source.queryAll('SELECT 1 AS value', {
    limit: 1,
    signal: new AbortController().signal,
  });
  expect(urls).toEqual(['https://api.altertable.ai/query']);
});

test('local lakehouse recognizes query errors in successful NDJSON responses', async () => {
  for (const body of [
    '{"query_id":"q"}\n{"error":"Wrong number of parameters"}\n',
    '{"query_id":"q"}\n[{"name":"value","type":"INTEGER"}]\n{"error":"Execution failed"}\n',
  ]) {
    const source = localLakehouse(
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    const error = await source
      .queryAll('SELECT 1', {
        limit: 1,
        signal: new AbortController().signal,
      })
      .catch(error => error);
    expect(error).toBeInstanceOf(DataSourceError);
    expect(error.reason).toBe('query_rejected');
  }
});

test('local lakehouse rejects malformed NDJSON metadata, columns and rows', async () => {
  for (const body of [
    'null\n[{"name":"value","type":"INTEGER"}]\n[1]\n',
    '{"query_id":42}\n[{"name":"value","type":"INTEGER"}]\n[1]\n',
    '{}\n[{"name":42}]\n[1]\n',
    '{}\n[{"name":"value","type":42}]\n[1]\n',
    '{}\n[{"name":"value","type":"INTEGER"}]\n{"value":1}\n',
    '{}\n[{"name":"value","type":"INTEGER"}]\nnull\n',
    '{}\n[{"name":"value","type":"INTEGER"}]\n[]\n',
    '{}\n[{"name":"__proto__","type":"VARCHAR"}]\n["value"]\n',
  ]) {
    const source = localLakehouse(
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    const error = await source
      .queryAll('SELECT 1', { limit: 1, signal: new AbortController().signal })
      .catch(error => error);
    expect(error).toBeInstanceOf(Error);
  }
});

test('local lakehouse accepts typed column headers and empty results', async () => {
  for (const body of [
    '{}\n[{"name":"value","type":"INTEGER"}]\n[1]\n',
    '{}\n[{"name":"value","type":"INTEGER"}]\n',
  ]) {
    const source = localLakehouse(
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    expect(
      await source.queryAll('SELECT 1', {
        limit: 1,
        signal: new AbortController().signal,
      })
    ).toMatchObject({
      columns: [{ name: 'value', type: 'INTEGER' }],
      rows: body.includes('[1]') ? [[1]] : [],
    });
  }
});

test('local lakehouse cancels streaming responses with the operation signal', async () => {
  const controller = new AbortController();
  const reason = new Error('Filter changed');
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(
        new TextEncoder().encode('{}\n[{"name":"value","type":"INTEGER"}]\n')
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  const source = localLakehouse(
    {
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async () => {
        setTimeout(() => controller.abort(reason), 0);
        return new Response(body);
      },
      { preconnect() {} }
    )
  );
  await expect(
    source.queryAll('SELECT 1', { limit: 1, signal: controller.signal })
  ).rejects.toBe(reason);
  await expect.poll(() => cancelled).toBe(true);
}, 2000);

test('local lakehouse enforces byte and row limits while consuming SDK results', async () => {
  for (const [body, message] of [
    [' '.repeat(5_000_001), 'Query response is too large.'],
    [
      '{}\n[{"name":"value","type":"INTEGER"}]\n[1]\n[2]\n',
      'Lakehouse returned more rows than requested.',
    ],
  ]) {
    const source = localLakehouse(
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    await expect(
      source.queryAll('SELECT 1', {
        limit: 1,
        signal: new AbortController().signal,
      })
    ).rejects.toThrow(message);
  }
});

test('local lakehouse maps SDK HTTP errors without retrying queries', async () => {
  for (const [status, reason] of [
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [429, 'rate_limited'],
    [400, 'query_rejected'],
    [422, 'query_rejected'],
    [503, 'unavailable'],
  ] as const) {
    let requests = 0;
    const source = localLakehouse(
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(
        async () => {
          requests++;
          return new Response('upstream error', { status });
        },
        { preconnect() {} }
      )
    );
    const error = await source
      .queryAll('SELECT 1', { limit: 1, signal: new AbortController().signal })
      .catch(error => error);
    expect(error).toBeInstanceOf(DataSourceError);
    expect(error.reason).toBe(reason);
    expect(error.status).toBe(status);
    expect(requests).toBe(1);
  }
});
