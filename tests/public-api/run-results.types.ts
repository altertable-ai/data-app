import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import { parseEmptyInput } from '@altertable/data-app/contract';

const app = defineDataApp({
  title: 'Run results',
  description: 'Derive results once.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    totals: {
      statement: 'SELECT 1 AS count',
      params: {},
      projections: { count: { type: 'number' } },
    },
  },
});
const operations = {
  totals: app.defineOperation({
    input: parseEmptyInput,
    checks: [{}],
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }) {
      const { rows } = await query('totals');
      return { rows, total: rows.reduce((sum, row) => sum + row.count, 0) };
    },
  }),
};
const client = createDataClient<typeof operations>();
async function verifyRunResult() {
  const response = await client.query('totals', {});
  const total: number = response.data.total;
  const count: number | undefined = response.data.rows[0]?.count;
  // @ts-expect-error Clients preserve the result returned by run.
  const text: string = response.data.total;
  // @ts-expect-error No separate declaration can add fields to run's result.
  void response.data.invented;
  return { total, count, text };
}
void verifyRunResult;

createDataClient<typeof operations>({
  // @ts-expect-error Output parsers are not client configuration.
  outputs: { totals: () => ({}) },
});
createDataHooks(client).defineDataView({
  operation: 'totals',
  dataContext: createDataContext({})({ description: 'Totals', glossary: {} }),
  describeInput: () => 'All',
  isEmpty(data) {
    const count: number = data.total;
    // @ts-expect-error View data derives from the same operation return type.
    void data.invented;
    return count === 0;
  },
  emptyFallback: { title: 'No totals' },
});
