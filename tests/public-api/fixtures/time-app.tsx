import { defineDataAppConfig } from '@altertable/data-app/config';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  defineOperation,
  dimensionFilter,
  parseDimensionSelection,
  parseCount,
  type DateRangeRequest,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  MetricWidget,
  DataValue,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';

const calendar = defineDateRangeContract({
  minDate: '2026-02-01',
  maxDate: '2026-03-31',
  maxRangeDays: 31,
  timeZone: 'UTC',
});
const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  allowMissing: true,
  options: [
    { value: 'Europe', label: 'Europe' },
    { value: 'null', label: 'Literal null' },
  ],
});
type Input = { period: DateRangeRequest; region: DimensionSelection<string> };
const operation = defineOperation({
  queries: {},
  input(value: unknown): Input {
    const input = value as Input;
    return {
      period: calendar.parseRequest(input.period),
      region: parseDimensionSelection(input.region, region),
    };
  },
  output: parseCount,
  checks: [
    {
      period: calendar.request({ start: '2026-03-04', end: '2026-03-06' }),
      region: { kind: 'all' as const },
    },
  ],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run(_context, input) {
    return input.region.kind === 'all' ? 12 : 0;
  },
});
const client = createDataClient({
  operations: { activity: operation },
  lakehouse: {
    async queryAll() {
      return { columns: [], rows: [] };
    },
  },
});
const context = createDataContext({ activity: 'activity' })({
  description: 'Activity for the displayed period',
  glossary: {
    count: {
      term: 'Events',
      definition: 'Measured events',
      queryNames: ['activity'],
    },
  },
});
const view = createDataHooks(client).defineTimeView({
  dataContext: context,
  operation: 'activity',
  time: {
    contract: calendar,
    defaultValue: { kind: 'dates', start: '2026-03-04', end: '2026-03-06' },
    comparison: true,
  },
  variables: { region },
  isEmpty: () => false,
  emptyFallback: { title: 'No events' },
});
const metric = view.metric(
  { id: 'count', glossaryId: 'count', format: { kind: 'count' } },
  current => ({ current, previous: 0 })
);
const dataset = view.dataset({
  name: 'Events',
  select: (count, input) => [
    { count, period: calendar.describeInput(input.period.range) },
  ],
  rowKey: () => 'events',
  columns: {
    count: { value: row => row.count },
    period: { value: row => row.period },
  },
  evidence: { id: 'events', glossaryIds: ['count'] },
});
const content = view.content(source => (
  <>
    <p>
      Displayed period: <DataValue scope={source.scope} />
    </p>
    <output aria-label="Measured events">
      Measured events: <DataValue metric={metric} source={source} />
    </output>
    <MetricWidget metric={metric} source={source} />
  </>
));
const DATA_APP_CONFIG = defineDataAppConfig({
  title: 'Calendar activity',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
  queries: {},
});
function App() {
  return (
    <DataApp
      config={DATA_APP_CONFIG}
      view={view}
      datasets={[dataset]}
      story={() => []}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: DATA_APP_CONFIG, component: App });
