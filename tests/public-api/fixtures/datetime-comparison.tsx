import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateTimeRangeVariable,
  defineDateRangeContract,
  variableInput,
} from '@altertable/data-app/contract';

const contract = defineDateRangeContract({
  minDate: '2026-06-01',
  maxRangeDays: 31,
  timeZone: 'UTC',
  completeDays: false,
});
const period = dateTimeRangeVariable({
  key: 'period',
  defaultValue: '7d',
  contract,
  allowComparison: true,
});
const dataApp = defineDataApp({
  title: 'Datetime comparisons',
  dateFormatting: {
    locale: new URLSearchParams(location.search).get('locale') ?? 'en-US',
  },
  description: 'Compare absolute or relative reporting intervals.',
  scope: { organization: 'test', environment: 'test' },
  queries: {
    current: {
      statement: 'SELECT 12 AS count WHERE $window.from < $window.to',
      params: { window: { type: 'dateTimeRange' } },
      projections: { count: { type: 'number' } },
    },
    previous: {
      statement: 'SELECT 6 AS count WHERE $window.from < $window.to',
      params: { window: { type: 'dateTimeRange' } },
      projections: { count: { type: 'number' } },
    },
  },
});
const events = dataApp.defineOperation({
  input: variableInput(() => ({}), { period }),
  checks: [{ period: period.input(period.defaultValue) }],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }, input) {
    const current = await query('current', { window: input.period.range });
    const previous = input.period.comparison
      ? await query('previous', { window: input.period.comparison })
      : null;
    return {
      current: current.rows[0]!.count,
      previous: previous?.rows[0]?.count,
    };
  },
});
const client = createDataClient({
  operations: { events },
  lakehouse: {
    async queryAll(statement, { params }) {
      if (!statement.includes('WITH RECURSIVE') || !params?.window)
        throw new Error('Datetime parameter not compiled');
      return {
        columns: [{ name: 'count' }],
        rows: [[statement.includes('SELECT 12') ? 12 : 6]],
      };
    },
  },
});
const context = createDataContext(events.queryNames)({
  description: 'Events in the selected period',
  glossary: {
    events: {
      term: 'Events',
      definition: 'Event count',
      queryNames: ['current', 'previous'],
    },
  },
});
const view = createDataHooks(client).defineTimeView({
  operation: 'events',
  time: period,
  dataContext: context,
});
const metric = view.metric(
  { id: 'events', glossaryId: 'events', format: { kind: 'count' } },
  data => data
);
const dataset = view.dataset({
  name: 'Events',
  select: data => [data],
  rowKey: () => 'events',
  columns: { current: { value: row => row.current } },
  evidence: { id: 'events', queryNames: ['current', 'previous'] },
});
const content = view.content(source => (
  <>
    <MetricWidget source={source} metric={metric} />
    {!source.loading && (
      <output aria-label="Applied comparison">
        {JSON.stringify(source.input.period)}
      </output>
    )}
  </>
));
function App() {
  return (
    <DataApp view={view} datasets={[dataset]} story={() => []}>
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
