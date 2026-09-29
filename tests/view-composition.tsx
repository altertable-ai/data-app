import type { DataOperation, DateRangeRequest } from '@/src/core/contract';
import { defineDateRangeContract } from '@/src/core/contract';
import { createDataClient } from '@/src/client/index';
import { createDataHooks } from '@/src/react/index';
import { dateRangeVariable, textVariable } from '@/src/react/ui/variables';
import type { MetricWidgetProps } from '@/src/react/ui/MetricWidget';
import type { DataSectionProps } from '@/src/react/ui/DataSection';
import type { DataAppProps } from '@/src/react/ui/DataApp';

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
  view: { kind: 'loading' },
  children() {
    return null;
  },
};
// @ts-expect-error Primary requests require a fallback on the request or shell.
const app: DataAppProps<number> = {
  config: {
    appearance: {},
    title: 'Test',
    scope: { organization: 'a', environment: 'b' },
  },
  dataContext: { description: 'Test', glossary: {} },
  aboutEmpty: { glossary: { title: 'Empty' }, queries: { title: 'Empty' } },
  request: { view: { kind: 'loading' }, refetch() {} },
  children() {
    return null;
  },
};
void [metric, section, app];

import { defineOperation, defineQueryNames } from '@/src/core/contract';
import { createDataContext } from '@/src/react/ui/data-context';
import { MetricWidget } from '@/src/react/ui/MetricWidget';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
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
