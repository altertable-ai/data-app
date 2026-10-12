import { expect, test } from 'vitest';
import { localLakehouse } from '@altertable/data-app/server/bun';
import { DataSourceError } from '@altertable/data-app/contract';

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
        expect(options?.headers).toMatchObject({
          authorization: 'Bearer run-token',
        });

        if (typeof options?.body !== 'string')
          throw new Error('Expected a JSON request body.');
        expect(JSON.parse(options.body)).toEqual({
          statement: 'SELECT 1',
          limit: 1,
        });
        return new Response('{"query_id":"q1"}\n["value"]\n[1]\n');
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

test('local lakehouse resolves scalar HTTP parameters without changing SQL literals, identifiers or comments', async () => {
  const statement = `SELECT $label, 1-$count, $enabled, $missing, $label_long, $label,
    '$label', 'it''s $label', E'escaped\\' $label', "$label",
    $$literal $label$$, $tag$literal $label$tag$, '$100'
    , E'abc'\n'foo\\' $label', E'abc' -- continuation\r'foo\\' $label'
    -- $label
    /* $label /* $count */ $enabled */
    -- $label\r, $enabled AS café$label, $tagé$literal $label$tagé$, $étiquette`;
  const expected = `SELECT 'O''Brien; $count', 1-(-2.5), TRUE, NULL, 'Long', 'O''Brien; $count',
    '$label', 'it''s $label', E'escaped\\' $label', "$label",
    $$literal $label$$, $tag$literal $label$tag$, '$100'
    , E'abc'\n'foo\\' $label', E'abc' -- continuation\r'foo\\' $label'
    -- $label
    /* $label /* $count */ $enabled */
    -- $label\r, TRUE AS café$label, $tagé$literal $label$tagé$, 'Unicode'`;
  const source = localLakehouse(
    {
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        expect(JSON.parse(options!.body as string)).toEqual({
          statement: expected,
          limit: 1,
        });
        return new Response('{}\n["value"]\n[1]\n');
      },
      { preconnect() {} }
    )
  );
  await source.queryAll(statement, {
    params: {
      label: "O'Brien; $count",
      count: -2.5,
      enabled: true,
      missing: null,
      label_long: 'Long',
      étiquette: 'Unicode',
    },
    limit: 1,
    signal: new AbortController().signal,
  });
});

test('local lakehouse rejects unresolved HTTP parameters before sending SQL', async () => {
  const source = localLakehouse(
    {
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async () => {
        throw new Error('Must not send unresolved SQL');
      },
      { preconnect() {} }
    )
  );
  await expect(
    source.queryAll('SELECT $missing', {
      params: {},
      limit: 1,
      signal: new AbortController().signal,
    })
  ).rejects.toThrow('Missing query parameter missing.');
});

test('local lakehouse recognizes query errors in successful NDJSON responses', async () => {
  for (const body of [
    '{"query_id":"q"}\n{"error":"Wrong number of parameters"}\n',
    '{"query_id":"q"}\n["value"]\n{"error":"Execution failed"}\n',
    '{"error":"Failed to prepare statement"}\n',
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
    'null\n["value"]\n[1]\n',
    '{"query_id":42}\n["value"]\n[1]\n',
    '{}\n[{"name":42}]\n[1]\n',
    '{}\n[{"name":"value","type":42}]\n[1]\n',
    '{}\n["value"]\n{"value":1}\n',
    '{}\n["value"]\nnull\n',
    '{}\n["value"]\n[1,2]\n',
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
    ).toMatchObject(expected);
  }
});
