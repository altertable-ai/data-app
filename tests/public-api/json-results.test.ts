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

test('the shared execution boundary rejects values JSON would drop, transform, or fail to encode', async () => {
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  const symbol = Symbol('metadata');
  const values: unknown[] = [
    new Date('2026-01-01'),
    { date: new Date('2026-01-01') },
    new Map(),
    new Set(),
    1n,
    () => 1,
    Symbol('value'),
    undefined,
    NaN,
    Infinity,
    -Infinity,
    [undefined],
    Array(1),
    Object.assign([1], { extra: true }),
    { callback: () => 1 },
    { [symbol]: 'hidden' },
    Object.defineProperty({}, 'hidden', { value: 1 }),
    {
      get count() {
        return 1;
      },
    },
    cycle,
  ];
  for (const value of values) {
    const unchecked = {
      ...definition,
      async run() {
        return value;
      },
    };
    const operations = {
      // @ts-expect-error Exercise an unchecked JavaScript operation at the runtime boundary.
      report: defineOperation(unchecked),
    };
    const browser = createDataClient({ operations, lakehouse });
    await expect(browser.query('report', {})).rejects.toMatchObject({
      code: 'query_failed',
    });
    const handler = createDataHandler(operations, async () => ({ lakehouse }));
    const response = await handler(
      new Request('https://app.test/api/data/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: { code: 'query_failed' },
    });
  }
});
