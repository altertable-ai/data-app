import { defineDataApp } from '@altertable/data-app';
import { createDataClient, type OutputOf } from '@altertable/data-app/client';
import {
  defineOperation,
  parseEmptyInput,
  type QueryRow,
} from '@altertable/data-app/contract';
import { createDataContext, createDataHooks } from '@altertable/data-app/react';

const app = defineDataApp({
  title: 'Column types',
  description: 'Verify query-to-widget type derivation.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    revenue: {
      statement: 'SELECT country, revenue, active, previous FROM revenue',
      params: {},
      projections: {
        country: { type: 'string' },
        revenue: { type: 'number' },
        active: { type: 'boolean' },
        previous: { type: 'number', nullable: true },
      },
    },
    nullOnly: {
      statement: 'SELECT NULL AS placeholder',
      params: {},
      projections: { placeholder: { type: 'null' } },
    },
    connection: {
      statement: 'SELECT 1 AS ready',
      params: {},
      projections: { ready: { type: 'number' } },
    },
  },
});
type RevenueRow = QueryRow<typeof app.queries.revenue.projections>;
const row: RevenueRow = {
  country: 'France',
  revenue: 0,
  active: true,
  previous: null,
};
// @ts-expect-error Columns describe required properties; nullable is not optional.
const missing: RevenueRow = { country: 'France', revenue: 0, active: true };
// @ts-expect-error Nonnullable numbers reject null.
const wrong: RevenueRow = { ...row, revenue: null };
void [row, missing, wrong];
const operation = app.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 10, maxDurationMs: 1000 },
  async run({ query }) {
    const placeholder: null = (await query('nullOnly')).rows[0]!.placeholder;
    void placeholder;
    const result = await query('revenue');
    const country: string = result.rows[0]!.country;
    const revenue: number = result.rows[0]!.revenue;
    const previous: number | null = result.rows[0]!.previous;
    const active: boolean = result.rows[0]!.active;
    // @ts-expect-error Boolean columns do not become numbers.
    const wrongActive: number = result.rows[0]!.active;
    // @ts-expect-error Query aliases constrain available row properties.
    void result.rows[0]!.invented;
    // @ts-expect-error Registered query rows are named records.
    void result.rows[0]![0];
    // @ts-expect-error Nullable columns require handling null before numeric use.
    const unchecked: number = result.rows[0]!.previous;
    const connection = await query('connection');
    const ready: number = connection.rows[0]!.ready;
    // @ts-expect-error Each query has its own row shape.
    void connection.rows[0]!.country;
    const name = Math.random() > 0.5 ? 'revenue' : 'connection';
    const mixed = (await query(name)).rows[0]!;
    if ('ready' in mixed) {
      const value: number = mixed.ready;
      void value;
    } else {
      const value: string = mixed.country;
      void value;
    }
    void [country, revenue, previous, unchecked, ready, active, wrongActive];
    return result.rows;
  },
});
const output: OutputOf<typeof operation> = [row];
const client = createDataClient({ operations: { revenue: operation } });
async function verifyClient() {
  const response = await client.query('revenue', {});
  const country: string = response.data[0]!.country;
  // @ts-expect-error Query row types reach the data client.
  const wrongCountry: number = response.data[0]!.country;
  return [country, wrongCountry];
}
void [output, verifyClient];
const context = createDataContext(operation.queryNames)({
  description: 'Revenue',
  glossary: {},
});
const view = createDataHooks(client).defineDataView({
  operation: 'revenue',
  dataContext: context,
  describeInput: () => 'all revenue',
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No revenue' },
});
view.dataset({
  name: 'Revenue',
  select: rows => rows,
  rowKey: row => row.country,
  columns: {
    country: { value: row => row.country },
    revenue: {
      value: row => row.revenue,
      format: { kind: 'currency', currency: 'EUR' },
    },
  },
  evidence: { id: 'revenue', queryNames: ['revenue'] },
});
view.content(source => {
  if (!source.loading) {
    const revenue: number = source.data[0]!.revenue;
    // @ts-expect-error Row types reach displayed sources without an extra interface.
    void source.data[0]!.invented;
    return revenue;
  }
  return null;
});
// @ts-expect-error The app owns an immutable column contract.
app.queries.revenue.projections.country = 'number';
defineOperation({
  // @ts-expect-error Every registered query declares its result columns.
  queries: { missing: { statement: 'SELECT 1', params: {} } },
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run() {
    return true;
  },
});
defineDataApp({
  title: 'Invalid',
  description: 'Reject unsupported column syntax.',
  scope: { organization: 'demo', environment: 'test' },
  // @ts-expect-error The manifest uses a closed type vocabulary.
  queries: {
    invalid: {
      statement: 'SELECT 1',
      params: {},
      projections: { value: { type: 'Date' } },
    },
  },
});

const nullOnly: QueryRow<{ placeholder: { type: 'null' } }> = {
  placeholder: null,
};
// @ts-expect-error A null-only projection does not accept other values.
const wrongNull: typeof nullOnly = { placeholder: 'value' };
void [nullOnly, wrongNull];
defineDataApp({
  title: 'Invalid',
  description: 'Require named projections.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    invalid: {
      statement: 'SELECT 1',
      params: {},
      // @ts-expect-error Projections need at least one alias.
      projections: {},
    },
  },
});

defineDataApp({
  title: 'Invalid',
  description: 'Require named projections.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    invalid: {
      statement: 'SELECT 1',
      params: {},
      // @ts-expect-error Projection aliases cannot be empty.
      projections: { '': { type: 'number' } },
    },
  },
});

defineOperation({
  queries: {
    invalid: {
      statement: 'SELECT 1',
      params: {},
      // @ts-expect-error Standalone operations also require named projections.
      projections: {},
    },
  },
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run() {
    return true;
  },
});

// @ts-expect-error Projection declarations are frozen recursively.
app.queries.revenue.projections.country.type = 'string';
const uncertainNullable = {
  type: 'string' as const,
  nullable: Math.random() > 0.5,
};
defineDataApp({
  title: 'Fixed nullability',
  description: 'Declarations must establish nullability statically.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    invalid: {
      statement: 'SELECT value',
      params: {},
      // @ts-expect-error Runtime nullability cannot establish a static row type.
      projections: { value: uncertainNullable },
    },
  },
});
declare const optionalNullable: { type: 'string'; nullable?: true };
defineDataApp({
  title: 'Fixed nullability',
  description: 'An optional flag is not evidence of non-nullability.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {
    invalid: {
      statement: 'SELECT value',
      params: {},
      // @ts-expect-error Resolve optional declaration flags before defining queries.
      projections: { value: optionalNullable },
    },
  },
});

defineDataApp({
  title: 'Object projections',
  description: 'Projections use the same field shape as parameters.',
  scope: { organization: 'demo', environment: 'test' },
  // @ts-expect-error Projections require field objects rather than type strings.
  queries: {
    value: {
      statement: 'SELECT 1 AS value',
      params: {},
      projections: { value: 'number' },
    },
  },
});
