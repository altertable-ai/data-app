import { expect, test } from 'vitest';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  parseEmptyInput,
  type Lakehouse,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';

const definition = {
  queries: {},
  input: parseEmptyInput,
  checks: [{}] as const,
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
};
const lakehouse: Lakehouse = {
  async queryAll() {
    throw new Error('This operation does not query.');
  },
};

test('browser and HTTP delivery preserve inferred JSON results and optional fields', async () => {
  const optional: { note?: string } = {};
  const shared = { count: 1 };
  const operations = {
    report: defineOperation({
      ...definition,
      async run() {
        return {
          rows: [
            { count: 1, date: '2026-01-01' },
            { count: null, date: '2026-01-02' },
          ],
          shared: [shared, shared],
          ...optional,
        };
      },
    }),
  };
  const browser = createDataClient({ operations, lakehouse });
  const handler = createDataHandler(operations, async () => ({ lakehouse }));
  const http = createDataClient<typeof operations>({
    endpoint: 'https://app.test/api/data',
    fetch: Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) =>
        handler(new Request(url, init)),
      { preconnect() {} }
    ),
  });
  const local = await browser.query('report', {});
  const remote = await http.query('report', {});
  expect(remote.data.rows).toEqual(local.data.rows);
  expect(remote.data.shared).toEqual([{ count: 1 }, { count: 1 }]);
  expect(local.data.note).toBeUndefined();
  expect(remote.data.note).toBeUndefined();
});

test('operation results use the delivery adapter serialization without additional JSON assertions', async () => {
  const date = new Date('2026-01-01');
  const operations = {
    clock: defineOperation({
      ...definition,
      async run() {
        return { date, amount: Infinity };
      },
    }),
  };
  const local = await createDataClient({ operations, lakehouse }).query(
    'clock',
    {}
  );
  expect(local.data.date).toBe(date);
  expect(local.data.amount).toBe(Infinity);
  const handler = createDataHandler(operations, async () => ({ lakehouse }));
  const response = await handler(
    new Request('https://app.test/api/data/clock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    data: { date: date.toISOString(), amount: null },
  });
});
