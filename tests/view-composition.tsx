import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
import {
  type DataOperation,
  type DateRangeRequest,
  defineDateRangeContract,
  defineOperation,
  defineQueryNames,
  dimensionFilter,
} from '@altertable/data-app/contract';

import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  dateRangeVariable,
  textVariable,
  createDataContext,
} from '@altertable/data-app/react';
import {
  type MetricWidgetProps,
  MetricWidget,
  type TextWidgetProps,
} from '@altertable/data-app/react/ui';
import { type DataSectionProps } from '@/src/react/ui/DataSectionBoundary';
import { type DataAppProps } from '@/src/react/ui/DataAppFrame';

const { defineDataView } = createDataHooks<{
  activity: DataOperation<DateRangeRequest, { count: number }>;
}>(createDataClient());
const period = dateRangeVariable({
  key: 'period',
  defaultValue: { kind: 'preset', id: 'last-7' },
  contract: defineDateRangeContract({ maxRangeDays: 30, timeZone: 'UTC' }),
});
defineDataView({
  operation: 'activity',
  variables: { period },
  input({ period }) {
    return period;
  },
  date: {
    variable: 'period',
    input(input) {
      return input;
    },
  },
  isEmpty(data) {
    return data.count === 0;
  },
  emptyFallback: { title: 'No activity' },
});
defineDataView({
  operation: 'activity',
  variables: { period },
  // @ts-expect-error Operation input must match the selected operation.
  input() {
    return { count: 3 };
  },
  describeInput: period.describeInput,
  isEmpty() {
    return false;
  },
  emptyFallback: { title: 'Empty' },
});
// @ts-expect-error Without a date variable, the input needs an authored description.
defineDataView({
  operation: 'activity',
  variables: { search: textVariable({ key: 'search' }) },
  input() {
    return {
      range: { start: '2026-01-01', end: '2026-01-02' },
      comparison: null,
    };
  },
  isEmpty(data) {
    return data.count === 0;
  },
  emptyFallback: { title: 'No activity' },
});
// @ts-expect-error Numbers require a format.
const metric: MetricWidgetProps = { label: 'Orders', value: 123 };
// @ts-expect-error A custom result needs an explicit empty fallback.
const section: DataSectionProps<number> = {
  result: { view: { kind: 'loading' }, refetch() {} },
  loadingFallback: null,
  children() {
    return null;
  },
};
const app: DataAppProps<number> = {
  story: () => [],
  csvExport: ({ data }) => ({
    filename: 'test.csv',
    tables: [{ name: 'Values', columns: ['Value'], rows: [[data]] }],
  }),
  config: {
    appearance: {},
    title: 'Test',
    scope: { organization: 'a', environment: 'b' },
  },
  dataContext: { description: 'Test', glossary: {} },
  request: { view: { kind: 'loading' }, refetch() {} },
  children: null,
};
void [metric, section, app];

// @ts-expect-error Data-bound explanations require evidence.
const text: TextWidgetProps<number> = {
  title: 'Activity',
  reading: { loading: false, value: 12 },
  children: value => <p>{value}</p>,
};
void text;

const queries = defineQueryNames({ actions: 'actions' });
defineOperation({
  queryNames: queries,
  input() {
    return {};
  },
  output() {
    return true;
  },
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }) {
    // @ts-expect-error Query identity is scoped to the operation registry.
    await query('unknown', 'SELECT 1');

    return true;
  },
});
const context = createDataContext(queries)({
  description: 'Activity',
  glossary: {
    actions: {
      term: 'Actions',
      definition: 'Actions',
      queryNames: [queries.actions],
    },
  },
});
const actions = context.metric({
  id: 'actions',
  glossaryId: 'actions',
  format: { kind: 'count' },
});
context.metric({
  id: 'missing',
  // @ts-expect-error Metric definitions bind glossary identity.
  glossaryId: 'missing',
  format: { kind: 'count' },
});
const conflictingMetric = (
  <MetricWidget
    // @ts-expect-error A bound metric cannot supply a second current value.
    metric={actions}
    reading={{ loading: false, value: { current: 1 } }}
    value={2}
  />
);
const tabs = [
  {
    id: 'actions',
    label: 'Actions',
    content: null,
    isEmpty: true,
    emptyFallback: { title: 'Empty' },
  },
] as const;
const invalidTabs = (
  <WidgetViewTabs
    label="Views"
    views={tabs}
    // @ts-expect-error Selection must belong to the declared tabs.
    selectedKey="missing"
    onSelectionChange={() => {}}
  />
);
void [conflictingMetric, invalidTabs];

dateRangeVariable({
  key: 'invalid-default',
  contract: defineDateRangeContract({ maxRangeDays: 30, timeZone: 'UTC' }),
  // @ts-expect-error Comparison is activated by the reader, never by the app default.
  defaultValue: { kind: 'preset', id: 'last-7', comparison: 'previous' },
});

const { defineTimeView } = createDataHooks<{
  nested: DataOperation<{ request: DateRangeRequest }, number>;
  filtered: DataOperation<{ period: DateRangeRequest; search: string }, number>;
}>(createDataClient());
const time = {
  contract: defineDateRangeContract({ maxRangeDays: 30, timeZone: 'UTC' }),
  defaultValue: { kind: 'preset', id: 'last-7' },
} as const;
// @ts-expect-error A nested input requires an explicit mapper rather than an implicit cast.
defineTimeView({
  operation: 'nested',
  time,
  isEmpty() {
    return false;
  },
  emptyFallback: { title: 'Empty' },
});
defineTimeView({
  operation: 'nested',
  time,
  input({ period }) {
    return { request: period };
  },
  bindings: {
    period(input) {
      return input.request;
    },
  },
  isEmpty() {
    return false;
  },
  emptyFallback: { title: 'Empty' },
});
defineTimeView({
  operation: 'filtered',
  time,
  variables: { search: textVariable({ key: 'search' }) },
  isEmpty() {
    return false;
  },
  emptyFallback: { title: 'Empty' },
});

// @ts-expect-error A dimension needs exactly one option source.
dimensionFilter({
  key: 'source',
  label: 'Source',
  valueType: 'string',
  selection: 'multiple',
});
// @ts-expect-error Fixed options and a facet operation cannot coexist.
dimensionFilter({
  key: 'source',
  label: 'Source',
  valueType: 'string',
  selection: 'multiple',
  options: [],
  facet: {
    operation: 'sources',
    input() {
      return {};
    },
  },
});

// @ts-expect-error A framed TextWidget requires a title.
const untitledText: TextWidgetProps = { children: <p>Introduction</p> };
void untitledText;

const analyticalApp: Extract<DataAppProps<number>, { request: unknown }> = {
  config: {
    appearance: {},
    title: 'Test',
    scope: { organization: 'a', environment: 'b' },
  },
  dataContext: { description: 'Test', glossary: {} },
  story: () => [],
  csvExport: ({ data }) => ({
    filename: 'test.csv',
    tables: [{ name: 'Values', columns: ['Value'], rows: [[data]] }],
  }),
  request: {
    view: { kind: 'loading' },
    refetch() {},
  },
  children: null,
};
const { csvExport, ...withoutExport } = analyticalApp;
const { story, ...withoutStory } = analyticalApp;
// @ts-expect-error Analytical apps must provide a CSV export of their displayed result.
const appWithoutExport: DataAppProps<number> = withoutExport;
// @ts-expect-error Analytical apps must provide a story of their displayed findings.
const appWithoutStory: DataAppProps<number> = withoutStory;
const invalidFallback: DataAppProps<number> = {
  ...analyticalApp,
  // @ts-expect-error DataApp renders the shell; fallback belongs to DataSection.
  loadingFallback: null,
};
const invalidChildren: DataAppProps<number> = {
  ...analyticalApp,
  // @ts-expect-error DataApp takes ordinary React children, not a ready callback.
  children: (data: number) => <p>{data}</p>,
};
const invalidLoadingProp: DataAppProps<number> = {
  ...analyticalApp,
  // @ts-expect-error DataApp does not own loading content.
  loading: null,
};
void [
  csvExport,
  story,
  appWithoutExport,
  appWithoutStory,
  invalidFallback,
  invalidChildren,
  invalidLoadingProp,
];

// Omitted controls derive an empty operation input.
const defaults = createDataHooks<{
  empty: DataOperation<Record<string, never>, number>;
  search: DataOperation<{ search: string }, number>;
  nested: DataOperation<{ filters: { search: string } }, number>;
  required: DataOperation<{ search: string; limit: number }, number>;
  primitive: DataOperation<string, number>;
  optional: DataOperation<{ search: string; page?: number }, number>;
}>(createDataClient());
const base = {
  describeInput: () => 'results',
  isEmpty: () => false,
  emptyFallback: { title: 'No data' },
};
const emptyView = defaults.defineDataView({ ...base, operation: 'empty' });
const searchView = defaults.defineDataView({
  ...base,
  operation: 'search',
  variables: { search: textVariable({ key: 'search' }) },
});
// @ts-expect-error Required operation fields cannot be invented from empty variables.
defaults.defineDataView({ ...base, operation: 'required' });
// @ts-expect-error A nested input requires an explicit mapping.
defaults.defineDataView({
  ...base,
  operation: 'nested',
  variables: { search: textVariable({ key: 'search' }) },
});
// @ts-expect-error An additional required field needs an explicit mapping.
defaults.defineDataView({
  ...base,
  operation: 'required',
  variables: { search: textVariable({ key: 'search' }) },
});
// @ts-expect-error An object of variables cannot derive a primitive input.
defaults.defineDataView({ ...base, operation: 'primitive' });
const inheritedSection: DataSectionProps<number> = {
  result: {
    view: { kind: 'empty', input: {} },
    refetch() {},
    emptyFallback: emptyView.emptyFallback,
  },
  loadingFallback: null,
  children: value => String(value),
};
void [searchView, inheritedSection];

// @ts-expect-error Optional extra input fields still require an explicit mapping.
defaults.defineDataView({
  ...base,
  operation: 'optional',
  variables: { search: textVariable({ key: 'search' }) },
});
defaults.defineDataView({
  ...base,
  operation: 'optional',
  variables: { search: textVariable({ key: 'search' }) },
  input: values => values,
});

const evidence = { id: 'numbers', queryNames: ['numbers'] as [string] };
const boundDataset = searchView.dataset({
  select: data => [data],
  name: 'Numbers',
  rowKey: row => row,
  columns: { value: { value: row => row, format: { kind: 'count' } } },
  evidence,
});
void boundDataset;
// @ts-expect-error CSV construction is owned by DataApp datasets.
void searchView.csvExport;
searchView.dataset<number>({
  select: data => [data],
  name: 'Bad',
  rowKey: row => row,
  // @ts-expect-error Raw CSV values must be scalar cells.
  columns: { bad: { value: (row: number) => ({ row }) } },
  evidence,
});
searchView.dataset<string>({
  select: () => ['text'],
  name: 'Bad format',
  rowKey: row => row,
  // @ts-expect-error Numeric formatting requires a numeric accessor.
  columns: { bad: { value: row => row, format: { kind: 'count' } } },
  evidence,
});

const rowHooks = createDataHooks<{
  rows: DataOperation<
    Record<string, never>,
    readonly { id: string; count: number | null }[]
  >;
}>(createDataClient());
const rowView = rowHooks.defineDataView({ ...base, operation: 'rows' });
const projectedRows = rowView.dataset({
  name: 'Projection',
  select: rows => rows.map(row => ({ key: row.id, total: row.count })),
  rowKey: row => row.key,
  columns: {
    key: { value: row => row.key },
    total: { value: row => row.total, format: { kind: 'count' } },
  },
  evidence,
});
const projectedSnapshot = {
  state: 'ready' as const,
  input: {},
  data: [{ id: 'a', count: 0 }],
};
const projectedId: string = projectedRows.read(projectedSnapshot).value[0]!.key;
// @ts-expect-error Projected fields retain concrete types without annotations.
const wrongProjectedId: number =
  projectedRows.read(projectedSnapshot).value[0]!.key;
// @ts-expect-error Dataset selectors are explicit for every operation shape.
rowView.dataset({
  name: 'No selector',
  rowKey: () => 'row',
  columns: {},
  evidence,
});
void [projectedId, wrongProjectedId];
