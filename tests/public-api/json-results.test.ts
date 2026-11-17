import { createDataClient } from '@altertable/data-app/client';
import { defineOperation, type Lakehouse } from '@altertable/data-app/contract';
import { expect, test } from 'vitest';

const definition = {
  queries: {},
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
};
const lakehouse: Lakehouse = {
  async queryAll() {
    throw new Error('This operation does not query.');
  },
};

test('operation results preserve inferred structures and optional fields', async () => {
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
  const result = await createDataClient({ operations, lakehouse }).query(
    'report',
    {}
  );
  expect(result.data.rows).toEqual([
    { count: 1, date: '2026-01-01' },
    { count: null, date: '2026-01-02' },
  ]);
  expect(result.data.shared).toEqual([{ count: 1 }, { count: 1 }]);
  expect(result.data.note).toBeUndefined();
});

test('in-process operation results retain their values', async () => {
  const date = new Date('2026-01-01');
  const operations = {
    clock: defineOperation({
      ...definition,
      async run() {
        return { date, amount: Infinity };
      },
    }),
  };
  const result = await createDataClient({ operations, lakehouse }).query(
    'clock',
    {}
  );
  expect(result.data.date).toBe(date);
  expect(result.data.amount).toBe(Infinity);
});
