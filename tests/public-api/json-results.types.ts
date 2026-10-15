import { defineDataApp } from '@altertable/data-app';
import {
  defineOperation,
  parseEmptyInput,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';

const definition = {
  queries: {},
  input: parseEmptyInput,
  checks: [{}] as const,
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
};
const app = defineDataApp({
  title: 'JSON results',
  description: 'Keep result types across delivery.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});
interface Report {
  readonly rows: readonly { count: number | null }[];
  note?: string;
}
interface Tree {
  name: string;
  children: Tree[];
}
declare const report: Report;
declare const tree: Tree;
const operations = {
  report: app.defineOperation({
    ...definition,
    async run() {
      return report;
    },
  }),
  tree: defineOperation({
    ...definition,
    async run() {
      return tree;
    },
  }),
  optional: defineOperation({
    ...definition,
    async run(): Promise<{ note?: string }> {
      return {};
    },
  }),
  union: defineOperation({
    ...definition,
    async run() {
      return Math.random() ? { kind: 'count' as const, count: 1 } : null;
    },
  }),
};
const client = createDataClient<typeof operations>();
async function verifyResults() {
  const response = await client.query('report', {});
  const first: number | null | undefined = response.data.rows[0]?.count;
  const note: string | undefined = response.data.note;
  // @ts-expect-error An empty result cannot promise the first row exists.
  const count: number | null = response.data.rows[0].count;
  const nullable = await client.query('union', {});
  if (nullable.data !== null) {
    const kind: 'count' = nullable.data.kind;
    const count: number = nullable.data.count;
    // @ts-expect-error Nullable unions retain their exact branch fields.
    void nullable.data.invented;
    void [kind, count];
  }
  return { first, note, count };
}
void verifyResults;

const clock = defineOperation({
  ...definition,
  async run() {
    return new Date('2026-01-01');
  },
});
async function verifyInferredOutput() {
  const response = await createDataClient({ operations: { clock } }).query(
    'clock',
    {}
  );
  const date: Date = response.data;
  return date;
}
void verifyInferredOutput;
