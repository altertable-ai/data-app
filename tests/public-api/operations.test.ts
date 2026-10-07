import { expect, test } from 'vitest';
import { createDataClient } from '@altertable/data-app/client';
import { defineOperation, parseCount } from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';

test('an authorized client queries an operation with validated input and query evidence', async () => {
  const operations = {
    count: defineOperation({
      input: parseCount,
      output: parseCount,
      checks: [3],
      queryNames: { count: 'count' },
      policy: { maxQueryRows: 2, maxDurationMs: 1000, exposeSql: true },
      async run({ query }, input) {
        const result = await query('count', `SELECT ${input}`);
        return result.rows[0]![0];
      },
    }),
  };
  let authorized = true;
  const handler = createDataHandler(operations, async () => {
    if (!authorized) throw new Error('Access denied');
    return {
      canDiscloseSql: true,
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
    queries: [{ name: 'count', statement: 'SELECT 3', queryId: 'query-1' }],
  });
  await expect(client.query('count', -1)).rejects.toMatchObject({
    code: 'invalid_input',
  });

  authorized = false;
  await expect(client.query('count', 3)).rejects.toMatchObject({
    code: 'forbidden',
  });
});
