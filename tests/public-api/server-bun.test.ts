import { expect, test } from 'vitest';
import { localLakehouse } from '@altertable/data-app/server/bun';

const queries = { one: 'SELECT $value AS value' };

test('local lakehouse delivers CLI proxy queries with authentication and query evidence', async () => {
  const proxied = localLakehouse(
    queries,
    {
      ALTERTABLE_DATA_PROXY_URL: 'http://127.0.0.1:1234',
      ALTERTABLE_DATA_PROXY_TOKEN: 'run-token',
    },
    Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        expect(url instanceof Request ? url.url : url.toString()).toBe(
          'http://127.0.0.1:1234/query'
        );
        expect(options?.headers).toMatchObject({
          authorization: 'Bearer run-token',
        });
        expect(JSON.parse(options?.body as string)).toEqual({
          statement: 'SELECT $value AS value',
          limit: 1,
          params: { value: 1 },
        });

        return new Response('{"query_id":"q1"}\n["value"]\n[1]\n');
      },
      { preconnect() {} }
    )
  );
  expect(
    await proxied.queryById(
      'one',
      { value: 1 },
      { limit: 1, signal: new AbortController().signal }
    )
  ).toMatchObject({
    rows: [[1]],
    queryId: 'q1',
    statement: 'SELECT $value AS value',
  });
});

test('local lakehouse rejects unregistered query IDs before sending SQL', async () => {
  let requests = 0;
  const source = localLakehouse(
    queries,
    {
      ALTERTABLE_DATA_PROXY_URL: 'http://proxy',
      ALTERTABLE_DATA_PROXY_TOKEN: 't',
    },
    Object.assign(
      async () => {
        requests++;
        return new Response('{}\n["value"]\n[1]\n');
      },
      { preconnect() {} }
    )
  );
  for (const name of ['missing', 'toString', '__proto__'])
    await expect(
      source.queryById(
        name,
        {},
        { limit: 1, signal: new AbortController().signal }
      )
    ).rejects.toMatchObject({ reason: 'query_rejected' });
  expect(requests).toBe(0);
});

test('local lakehouse rejects malformed NDJSON metadata, columns and rows', async () => {
  for (const body of [
    'null\n["value"]\n[1]\n',
    '{"query_id":42}\n["value"]\n[1]\n',
    '{}\n[{"name":42}]\n[1]\n',
    '{}\n[{"name":"value","type":42}]\n[1]\n',
    '{}\n["value"]\n{"value":1}\n',
    '{}\n["value"]\nnull\n',
    '{}\n["value"]\n[1,2]\n',
  ]) {
    const source = localLakehouse(
      queries,
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    const error = await source
      .queryById('one', {}, { limit: 1, signal: new AbortController().signal })
      .catch(error => error);
    expect(error).toBeInstanceOf(Error);
  }
});

test('local lakehouse accepts string and typed column headers, empty results and headerless array rows', async () => {
  for (const [body, expected] of [
    [
      '{"query_id":"q"}\n["value"]\n[1]\n',
      { columns: [{ name: 'value' }], rows: [[1]], queryId: 'q' },
    ],
    [
      '{}\n[{"name":"value","type":"INTEGER"}]\n[1]\n',
      { columns: [{ name: 'value', type: 'INTEGER' }], rows: [[1]] },
    ],
    ['{}\n["value"]\n', { columns: [{ name: 'value' }], rows: [] }],
    ['{}\n[1]\n', { columns: [], rows: [[1]] }],
  ] as const) {
    const source = localLakehouse(
      queries,
      {
        ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
        ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
      },
      Object.assign(async () => new Response(body), { preconnect() {} })
    );
    expect(
      await source.queryById(
        'one',
        {},
        { limit: 1, signal: new AbortController().signal }
      )
    ).toMatchObject(expected);
  }
});
