import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  MetricWidget,
  DataValue,
  dateTimeRangeVariable,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  defineOperation,
  dimensionFilter,
  parseDimensionSelection,
  type DateTimeRangeComparisonRequest,
  type DimensionSelection,
} from '@altertable/data-app/contract';

const calendar = defineDateRangeContract({
  minDate: '2026-02-01',
  maxDate: '2026-03-31',
  maxRangeDays: 31,
  timeZone: 'UTC',
});
const presets = [1, 3, 7, 14, 30].map(days => ({
  label: days === 1 ? 'Latest available day' : `Latest ${days} available days`,
  shortcut: days === 1 ? '-' : `${days}d`,
  range: {
    from: new Date(Date.UTC(2026, 2, 31 - days + 1)),
    to: new Date('2026-04-01T00:00:00Z'),
  },
}));
const period = dateTimeRangeVariable({
  key: 'period',
  contract: calendar,
  allowComparison: true,
  presets,
  defaultValue: {
    from: new Date('2026-03-04T00:00:00Z'),
    to: new Date('2026-03-07T00:00:00Z'),
  },
  presentation: new URLSearchParams(location.search).has('displayDate')
    ? { group: 'display' }
    : undefined,
});
const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  presentation: {
    prominence: new URLSearchParams(location.search).has('secondaryRegion')
      ? 'secondary'
      : 'primary',
  },
  valueType: 'string',
  selectionMode: 'single',
  allowMissing: true,
  options: [
    { value: 'Europe', label: 'Europe' },
    { value: 'null', label: 'Literal null' },
  ],
});
type Input = {
  period: DateTimeRangeComparisonRequest;
  region: DimensionSelection<string>;
};
const operation = defineOperation({
  queries: {},
  input(value: unknown): Input {
    const input = value as Input;
    return {
      period: period.parseInput(input.period),
      region: parseDimensionSelection(input.region, region),
    };
  },
  checks: [
    {
      period: period.input(period.defaultValue),
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
  time: period,
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
    {
      count,
      period: calendar.describeInput({
        start: input.period.range.from.toISOString().slice(0, 10),
        end: new Date(input.period.range.to.getTime() - 1)
          .toISOString()
          .slice(0, 10),
      }),
    },
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
const dataApp = defineDataApp({
  title: 'Calendar activity',
  description: 'Explore activity by reporting period.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
function App() {
  return (
    <DataApp view={view} datasets={[dataset]} story={() => []}>
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
