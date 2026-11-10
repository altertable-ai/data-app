import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  choiceFilter,
  dateTimeRangeFilter,
  facetFilter,
} from '@altertable/data-app/contract';

const period = dateTimeRangeFilter({
  key: 'period',
  maxRangeDays: 30,
  timeZone: 'UTC',
  comparison: 'off',
  defaultValue: '7d',
});
const other = dateTimeRangeFilter({ key: 'other', defaultValue: '7d' });
const group = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All' },
    { id: 'a', label: 'A' },
  ],
});
// Facet options follow the `segments` operation's own filters.
const facet = facetFilter({
  key: 'segment',
  label: 'Segment',
  valueType: 'string',
  selectionMode: 'multiple',
  options: 'segments',
});
const app = defineDataApp({
  title: 't',
  description: 'd',
  scope: { organization: 'o', environment: 'e' },
  queries: {
    q: {
      statement: 'select 1 as n',
      params: {},
      projections: { n: { type: 'number' } },
    },
  },
});
const operations = {
  trend: app.defineOperation({
    filters: { period, group, segment: facet },
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }, input) {
      const p: { from: Date; to: Date } = input.period.range;
      const g: 'all' | 'a' = input.group;
      void p;
      void g;
      const r = await query('q');
      return { current: r.rows.length };
    },
  }),
  segments: app.defineOperation({
    filters: { period },
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run() {
      return [{ value: 'x', label: 'X' }];
    },
  }),
  total: app.defineOperation({
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run() {
      return 1;
    },
  }),
};
app.defineOperation({
  // @ts-expect-error an operation reads at most one date filter
  filters: { period, other },
  policy: { maxQueryRows: 1, maxDurationMs: 1 },
  async run() {
    return 1;
  },
});
const context = createDataContext({ q: 'q' })({
  description: 'x',
  glossary: {},
});
const { defineView } = createDataHooks(createDataClient({ operations }));
const trend = defineView({ operation: 'trend', dataContext: context });
trend.metric(
  { id: 'm', label: 'M', format: { kind: 'count' } } as never,
  data => ({ current: data.current, previous: 1 })
);
const total = defineView({ operation: 'total', dataContext: context });
// @ts-expect-error no period, no comparison
total.metric({} as never, data => ({ current: data, previous: 1 }));
// @ts-expect-error filters belong to the operation
defineView({ operation: 'total', dataContext: context, filters: {} });
// HTTP clients need the filters
// @ts-expect-error missing filters
createDataClient<typeof operations>();
createDataClient<typeof operations>({
  filters: {
    trend: operations.trend.filters,
    segments: operations.segments.filters,
  },
});
const bad = {
  trend: app.defineOperation({
    filters: {
      segment: facetFilter({
        key: 's',
        label: 'S',
        valueType: 'string',
        selectionMode: 'single',
        options: 'nope',
      }),
    },
    policy: { maxQueryRows: 1, maxDurationMs: 1 },
    async run() {
      return 1;
    },
  }),
};
// @ts-expect-error facet options operation missing
createDataClient({ operations: bad });

// Operations that parse their own input are destinations, not views.
const destinations = {
  account: app.defineOperation({
    input: value => value as { id: string },
    checks: [{ id: 'a' }],
    policy: { maxQueryRows: 1, maxDurationMs: 1 },
    async run() {
      return 1;
    },
  }),
};
createDataHooks(createDataClient({ operations: destinations })).defineView({
  // @ts-expect-error a view's input is its operation's filters
  operation: 'account',
  dataContext: context,
});

// Each possible member of a conditional filter is checked.
declare const choose: boolean;
const conditional = {
  view: app.defineOperation({
    filters: { segment: choose ? facet : group },
    policy: { maxQueryRows: 1, maxDurationMs: 1 },
    async run() {
      return 1;
    },
  }),
};
// @ts-expect-error the `segments` options operation is not registered
createDataClient({ operations: conditional });

// A destination reads the displayed filters beside its own record key.
const records = {
  records: app.defineOperation({
    filters: { group },
    input: value => value as { recordId: string },
    checks: [{ recordId: 'r1' }],
    policy: { maxQueryRows: 1, maxDurationMs: 1 },
    async run(_context, input) {
      const scope: 'all' | 'a' = input.group;
      const recordId: string = input.recordId;
      return [scope, recordId];
    },
  }),
};
const recordHooks = createDataHooks(createDataClient({ operations: records }));
recordHooks.defineView({
  // @ts-expect-error a view cannot supply the record key
  operation: 'records',
  dataContext: context,
});
recordHooks.defineDetailView({
  id: 'record',
  title: 'Record',
  operation: 'records',
  dataContext: context,
  parseInput: records.records.input,
  describeInput: input => `${input.group} ${input.recordId}`,
});
