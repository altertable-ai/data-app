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

async function date() {
  return new Date();
}
// @ts-expect-error Dates become strings on the wire.
defineOperation({ ...definition, run: date });
// @ts-expect-error Bound operations share the same inferred output contract.
app.defineOperation({ ...definition, run: date });
async function nestedDate() {
  return { rows: [{ date: new Date() }] };
}
// @ts-expect-error JSON compatibility applies to nested values.
defineOperation({ ...definition, run: nestedDate });
async function map() {
  return new Map<string, number>();
}
// @ts-expect-error Maps do not retain their API through JSON.
defineOperation({ ...definition, run: map });
async function set() {
  return new Set<string>();
}
// @ts-expect-error Sets do not retain their API through JSON.
defineOperation({ ...definition, run: set });
async function bigint() {
  return { count: 1n };
}
// @ts-expect-error Bigint has no JSON representation.
defineOperation({ ...definition, run: bigint });
async function callback() {
  return { read: () => 1 };
}
// @ts-expect-error Functions are dropped by JSON serialization.
defineOperation({ ...definition, run: callback });
async function missing() {
  return undefined;
}
// @ts-expect-error A root undefined would drop the data field.
defineOperation({ ...definition, run: missing });
async function requiredUndefined(): Promise<{ count: number | undefined }> {
  return { count: undefined };
}
// @ts-expect-error Required fields cannot disappear during delivery.
defineOperation({ ...definition, run: requiredUndefined });
async function undefinedEntry() {
  return [undefined];
}
// @ts-expect-error Undefined array entries become null.
defineOperation({ ...definition, run: undefinedEntry });
async function optionalEntry(): Promise<readonly [string?]> {
  return [];
}
// @ts-expect-error Optional tuple entries may contain undefined, which becomes null.
defineOperation({ ...definition, run: optionalEntry });
async function unknownResult(): Promise<unknown> {
  return report;
}
// @ts-expect-error An output annotation cannot erase the result contract.
defineOperation({ ...definition, run: unknownResult });
const erasedDefinition = { ...definition, run: unknownResult };
// @ts-expect-error An explicit unknown type argument cannot bypass the result contract.
defineOperation<Record<string, never>, unknown, {}>(erasedDefinition);
// @ts-expect-error An explicit any type argument cannot bypass the result contract.
defineOperation<Record<string, never>, any, {}>({ ...definition, run: date });
const secret = Symbol('secret');
async function symbols() {
  return { [secret]: 'hidden', label: 'visible' };
}
// @ts-expect-error Symbol properties are not carried over JSON.
defineOperation({ ...definition, run: symbols });
