import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  TableWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import {
  DataAppProvider,
  DataWidget,
  LineChart,
  PieChart,
} from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  formatPercent,
  formatNumber,
  formatCount,
  formatMetric,
  formatDateRange,
  pluralize,
} from '@altertable/data-app/format';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { literalLakehouse } from '@/tests/public-api/fixtures/literal-client';
const dataApp = defineDataApp({
  title: 'Activity report',
  description: 'Explore activity across groups.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
const rows = [
  { id: 'first', name: 'Café <table>', count: 1234 },
  { id: 'second', name: 'Measured zero', count: 0 },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: ['row', index].join(':'),
    name: `Group ${index}`,
    count: index,
  })),
];
const formatting = [
  ['Rounded number', formatNumber(12.345, { maximumFractionDigits: 2 })],
  ['Negative zero', formatNumber(-0)],
  ['Compact count', formatCount(12345, { compact: true })],
  ['Fractional count', formatCount(12.5)],
  ['Negative count', formatCount(-1)],
  ['Nonfinite value', formatNumber(Infinity)],
  ['Custom missing label', formatNumber(undefined, { missing: 'Unknown' })],
  ['Small ratio', formatPercent(0.0012)],
  ['Tiny positive ratio', formatPercent(0.00002)],
  ['Tiny negative ratio', formatPercent(-0.00002)],
  ['Measured zero ratio', formatPercent(0)],
  ['Currency', formatMetric(12.5, { kind: 'currency', currency: 'USD' })],
  ['Localized number', formatNumber(1234.5, { locale: 'de-DE' })],
  ['Same month', formatDateRange({ start: '2026-09-25', end: '2026-09-27' })],
  ['Cross month', formatDateRange({ start: '2026-08-30', end: '2026-09-28' })],
  ['Cross year', formatDateRange({ start: '2025-12-30', end: '2026-01-02' })],
  ['Single day', formatDateRange({ start: '2026-09-28', end: '2026-09-28' })],
  ['Singular label', `1 ${pluralize(1, 'event')}`],
  ['Plural label', `0 ${pluralize(0, 'event')}`],
].map(([sample, display]): { sample: string; display?: string } => ({
  sample: sample!,
  display: display!,
}));
// A column named after an optional field shows a missing value when a row omits it.
formatting.push({ sample: 'Omitted optional field' });
const params = new URLSearchParams(location.search);
// Every result is literal: each operation returns it without querying.
const { defineView } = createDataHooks(
  createDataClient({
    operations: {
      activity: dataApp.defineOperation({
        policy: { maxQueryRows: 1 },
        async run() {
          return { totalEvents: 12345, conversion: 0.116, noEvents: 0 };
        },
      }),
      groups: dataApp.defineOperation({
        policy: { maxQueryRows: 20 },
        async run() {
          if (params.has('loading-table'))
            return new Promise<typeof rows>(() => {});
          if (params.has('empty-table')) return [];
          return params.has('few-rows') ? rows.slice(0, 2) : rows;
        },
      }),
      formatting: dataApp.defineOperation({
        policy: { maxQueryRows: 20 },
        async run() {
          return formatting;
        },
      }),
      counts: dataApp.defineOperation({
        policy: { maxQueryRows: 10 },
        async run(): Promise<
          { name: string; count?: number | boolean | null }[]
        > {
          return [
            { name: 'München, "East"', count: 0 },
            { name: 'Two\nlines', count: null },
            { name: '=1+1', count: -10 },
            { name: ' +SUM(A1)', count: false },
            { name: '@SUM(A1)', count: true },
            { name: 'Omitted' },
          ];
        },
      }),
      summary: dataApp.defineOperation({
        policy: { maxQueryRows: 1 },
        async run() {
          return [{ total: 0 }];
        },
      }),
    },
    lakehouse: literalLakehouse,
  })
);
const dataContext = createDataContext(dataApp.queryNames)({
  description: 'Activity data',
  glossary: {
    groups: { term: 'Groups', definition: 'Sample group events.' },
  },
});
const activityView = defineView({ dataContext, operation: 'activity' });
const totalEvents = activityView.metric(
  {
    id: 'total-events',
    glossaryId: 'groups',
    label: 'Total events',
    format: { kind: 'count' },
  },
  activity => ({ current: activity.totalEvents })
);
const conversion = activityView.metric(
  {
    id: 'conversion',
    glossaryId: 'groups',
    label: 'Conversion',
    format: { kind: 'ratio' },
  },
  activity => ({ current: activity.conversion })
);
const noEvents = activityView.metric(
  {
    id: 'no-events',
    glossaryId: 'groups',
    label: 'No events',
    format: { kind: 'count' },
  },
  activity => ({ current: activity.noEvents })
);
// The table renders its own empty state, with its heading and count.
const groupsView = defineView({
  dataContext,
  operation: 'groups',
  isEmpty: () => false,
});
const groups = groupsView.dataset({
  name: 'Events by group',
  rowKey: row => row.id,
  columns: { name: {}, count: {} },
  evidence: { id: 'groups', glossaryIds: ['groups'] },
  emptyFallback: { title: 'No events yet' },
});
const formattingView = defineView({ dataContext, operation: 'formatting' });
const formattingReference = formattingView.dataset({
  name: 'Formatting reference',
  rowKey: row => row.sample,
  columns: { sample: {}, display: {} },
  evidence: { id: 'formatting', glossaryIds: ['groups'] },
  emptyFallback: { title: 'No formatting examples' },
});
const countsView = defineView({ dataContext, operation: 'counts' });
const counts = countsView.dataset({
  name: 'Counts',
  rowKey: row => row.name,
  columns: { name: {}, count: {} },
  evidence: { id: 'counts', glossaryIds: ['groups'] },
});
const summaryView = defineView({ dataContext, operation: 'summary' });
const summary = summaryView.dataset({
  name: 'Summary',
  rowKey: row => row.total,
  columns: { total: {} },
  evidence: { id: 'summary', glossaryIds: ['groups'] },
});
const activityContent = activityView.content(result => (
  <>
    <MetricWidget metric={totalEvents} source={result} />
    <MetricWidget metric={conversion} source={result} />
    <MetricWidget metric={noEvents} source={result} />
  </>
));
const formattingContent = formattingView.content(result => (
  <TableWidget
    dataset={formattingReference}
    source={result}
    pagination={false}
  />
));

function GroupsTable({
  result,
}: {
  result: Parameters<Parameters<typeof groupsView.content>[0]>[0];
}) {
  const [search, setSearch] = useState(params.get('initial-search') ?? '');
  return (
    <TableWidget
      dataset={groups}
      source={result}
      count={params.has('server-total') ? 123 : undefined}
      showCount={!params.has('hide-count')}
      {...(params.has('preview-table') ? { limit: 2 } : {})}
      noMatchesFallback={
        params.has('custom-empty-action')
          ? {
              title: 'No groups match',
              description: 'Choose another group name.',
              action: <a href="https://example.com/help">Read help</a>,
            }
          : undefined
      }
      search={{
        label: 'Search groups',
        value: search,
        resetValue: params.has('search-default') ? 'missing' : undefined,
        onChange: setSearch,
        attributes: [{ name: 'name', getter: row => row.name }],
      }}
    />
  );
}
const groupsContent = groupsView.content(result => (
  <GroupsTable result={result} />
));

function App() {
  const multiple = params.has('multiple-exports');
  return (
    <DataApp
      view={countsView}
      // Summary views load with the page instead of waiting for the viewport.
      summaryViews={[activityView, groupsView, formattingView, summaryView]}
      datasets={multiple ? [counts, summary] : [counts]}
      description={
        params.has('override-description')
          ? 'Custom activity subtitle.'
          : params.has('hide-description')
            ? null
            : undefined
      }
    >
      {params.has('identity') && (
        <output aria-label="Document title at render">{document.title}</output>
      )}
      <DataSection content={activityContent} />
      <DataWidget title="Unavailable">{formatPercent(null)}</DataWidget>
      <DataSection content={groupsContent} />
      <DataSection content={formattingContent} />
      <LineChart
        ariaLabel="Event trend"
        items={[
          { id: 'loss', label: 'Loss', value: -1 },
          { id: 'gain', label: 'Gain', value: 3 },
        ]}
        unit="events"
      />
      <PieChart
        ariaLabel="Event shares"
        items={[
          { id: 'alpha', label: 'Alpha', value: 3 },
          { id: 'beta', label: 'Beta', value: 1 },
        ]}
        unit="events"
      />
    </DataApp>
  );
}
injectDataAppStyles();
if (new URLSearchParams(location.search).has('custom-root')) {
  createRoot(document.getElementById('root')!).render(
    <DataAppProvider app={dataApp}>
      <section aria-label="First app">
        <App />
      </section>
      <DataAppProvider
        app={{
          ...dataApp,
          title: 'Second report',
          scope: { organization: 'other', environment: 'preview' },
        }}
      >
        <section aria-label="Second app">
          <App />
        </section>
      </DataAppProvider>
    </DataAppProvider>
  );
} else {
  mountDataApp({ app: dataApp, component: App });
}
