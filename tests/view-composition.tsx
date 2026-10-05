import type { ComponentProps } from 'react';
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
  type MetricWidgetProps,
  type DataSectionProps,
  type DataAppProps,
  DataApp,
  createDataContext,
  MetricWidget,
  WidgetViewTabs,
  type TextWidgetProps,
} from '@altertable/data-app/react';

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
  empty: { title: 'No activity' },
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
  empty: { title: 'Empty' },
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
  empty: { title: 'No activity' },
});
// @ts-expect-error Numbers require a format.
const metric: MetricWidgetProps = { label: 'Orders', value: 123 };
// @ts-expect-error Secondary requests require an empty state.
const section: DataSectionProps<number> = {
  result: { view: { kind: 'loading' }, refetch() {} },
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
  aboutEmpty: { glossary: { title: 'Empty' }, queries: { title: 'Empty' } },
  // @ts-expect-error Primary requests own their empty state.
  request: { view: { kind: 'loading' }, refetch() {} },
  loading: null,
  children() {
    return null;
  },
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
    empty: { title: 'Empty' },
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
  empty: { title: 'Empty' },
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
  empty: { title: 'Empty' },
});
defineTimeView({
  operation: 'filtered',
  time,
  variables: { search: textVariable({ key: 'search' }) },
  isEmpty() {
    return false;
  },
  empty: { title: 'Empty' },
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
    empty: { title: 'No results' },
  },
  loading: null,
  children() {
    return null;
  },
};
const { csvExport, ...withoutExport } = analyticalApp;
const { story, ...withoutStory } = analyticalApp;
const { loading, ...withoutLoading } = analyticalApp;
// @ts-expect-error Analytical apps must provide a CSV export of their displayed result.
const appWithoutExport: DataAppProps<number> = withoutExport;
// @ts-expect-error Analytical apps must provide a story of their displayed findings.
const appWithoutStory: DataAppProps<number> = withoutStory;
// @ts-expect-error Analytical apps must lay out their initial request.
const appWithoutLoading: DataAppProps<number> = withoutLoading;
void [
  csvExport,
  story,
  loading,
  appWithoutExport,
  appWithoutStory,
  appWithoutLoading,
];

function ForwardedApp<Data, Input>(props: DataAppProps<Data, Input>) {
  return <DataApp {...props} />;
}
const inferredExplicitProps: ComponentProps<typeof DataApp> = {
  ...analyticalApp,
  story: () => [],
  csvExport: () =>
    ({
      filename: 'values',
      tables: [{ name: 'Values', columns: ['Value'], rows: [[1]] }],
    }) as const,
  children(_data: unknown, _input: unknown) {
    return null;
  },
};
void [ForwardedApp, inferredExplicitProps];
