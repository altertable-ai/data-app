import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  Grid,
  MetricWidget,
  TableWidget,
} from '@altertable/data-app-react';
import type { WidgetStatus } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import type { MetricFormat } from '@altertable/data-app/format';
import { createContext, useContext } from 'react';

const workspaces = [
  'Northstar',
  'Acme',
  'Lumen',
  'Atlas',
  'Orbit',
  'Beacon',
  'Cedar',
  'Delta',
  'Ember',
  'Fern',
  'Grove',
  'Harbor',
  'Iris',
  'Juniper',
  'Kite',
  'Lagoon',
  'Maple',
  'Nova',
  'Opal',
  'Pine',
  'Quartz',
  'Reed',
  'Sol',
];
export const workspaceRows = workspaces.map((name, id) => ({
  id,
  name,
  source: id % 2 === 0 ? 'HTTP' : 'Postgres',
  events: id === 0 ? 12 : id === 1 ? 8 : 0,
}));
const days = [
  ['Monday', 12],
  ['Tuesday', 0],
  ['Wednesday', 8],
] as const;

export const dataApp = defineDataApp({
  title: 'Data app gallery',
  description:
    'Explore data app components and presentation patterns with sample data.',
  scope: { organization: 'Demo workspace', environment: 'Sample data' },
  appearance: { theme: 'light' },
  // The sample SQL documents the fixture rows; the gallery answers it in the page.
  queries: {
    'gallery-trend': {
      statement:
        "SELECT * FROM (VALUES ('Monday', 12), ('Tuesday', 0), ('Wednesday', 8)) AS sample_activity(day, events)",
      params: {},
      projections: { day: { type: 'string' }, events: { type: 'number' } },
    },
    'gallery-records': {
      statement: `SELECT * FROM (VALUES ${workspaceRows.map(row => `('${row.name}', '${row.source}', ${row.events})`).join(',\n  ')}) AS sample_workspaces(workspace, source, events)`,
      params: {},
      projections: {
        workspace: { type: 'string' },
        source: { type: 'string' },
        events: { type: 'number' },
      },
    },
  },
});

const caseRow = {
  id: 1,
  name: 'A record with a long label / 多言語 / café',
  amount: 1234567.89,
};
// Literal values for the cases that show one formatted metric.
const caseValues = {
  zero: 0,
  negative: -12,
  large: 123456789,
  ratio: 0.125,
  revenue: 12345.67,
  stable: 42,
  visits: 12480,
};

const { defineView } = createDataHooks(
  createDataClient({
    operations: {
      activity: dataApp.defineOperation({
        policy: { maxQueryRows: 10 },
        async run({ query }) {
          const { rows } = await query('gallery-trend');
          return rows.map(row => ({
            id: row.day.toLowerCase(),
            label: row.day,
            value: row.events,
          }));
        },
      }),
      workspaces: dataApp.defineOperation({
        policy: { maxQueryRows: 100 },
        async run({ query }) {
          const { rows } = await query('gallery-records');
          const records = rows.map((row, id) => ({
            id,
            name: row.workspace,
            source: row.source,
            events: row.events,
          }));
          const active = records.filter(record => record.events > 0).length;
          return {
            records,
            events: records.reduce((sum, record) => sum + record.events, 0),
            active,
            activation: active / records.length,
          };
        },
      }),
      caseValues: dataApp.defineOperation({
        policy: { maxQueryRows: 1 },
        async run() {
          return caseValues;
        },
      }),
      caseRecords: dataApp.defineOperation({
        policy: { maxQueryRows: 10 },
        async run() {
          return {
            none: [],
            one: [caseRow],
            two: [caseRow, { ...caseRow, id: 2 }],
          };
        },
      }),
      // Never resolves, so its widgets keep their loading state.
      pending: dataApp.defineOperation({
        policy: { maxQueryRows: 10 },
        async run() {
          return new Promise<{ count: number; records: (typeof caseRow)[] }>(
            () => {}
          );
        },
      }),
    },
    lakehouse: {
      async queryAll(_statement, { name }) {
        return name === 'gallery-trend'
          ? {
              columns: [{ name: 'day' }, { name: 'events' }],
              rows: days.map(day => [...day]),
            }
          : {
              columns: [
                { name: 'workspace' },
                { name: 'source' },
                { name: 'events' },
              ],
              rows: workspaceRows.map(row => [
                row.name,
                row.source,
                row.events,
              ]),
            };
      },
    },
  })
);

const dataContext = createDataContext(dataApp.queryNames)({
  description:
    'Synthetic sample data for exploring data app patterns. The overview is a fixed September 28–30, 2026 snapshot; other tabs demonstrate independent component states. Sample SQL documents the fixture data and does not query a live source.',
  glossary: {
    activity: {
      term: 'Recorded events',
      definition:
        'Events recorded during the sample period. A value of zero means no events were recorded that day.',
      queryNames: ['gallery-trend'],
    },
    activation: {
      term: 'Workspace activation',
      definition:
        'Share of the 23 tracked workspaces with at least one recorded event in the sample period: 2 ÷ 23.',
      queryNames: ['gallery-records'],
    },
  },
});

export const activityView = defineView({
  dataContext,
  operation: 'activity',
  emptyFallback: { title: 'No activity' },
});
export const weeklyActivity = activityView.dataset({
  name: 'Weekly activity',
  rowKey: row => row.id,
  columns: { label: { label: 'Day' }, value: { label: 'Events' } },
  evidence: { id: 'gallery-trend', glossaryIds: ['activity'] },
});

export const workspacesView = defineView({
  dataContext,
  operation: 'workspaces',
});
export const workspaceActivity = workspacesView.dataset({
  name: 'Workspace activity',
  select: summary => summary.records,
  rowKey: row => row.id,
  columns: {
    name: { label: 'Workspace' },
    source: {},
    events: { format: { kind: 'count' } },
  },
  evidence: { id: 'gallery-records', glossaryIds: ['activation'] },
  emptyFallback: { title: 'No matching records' },
});
const recordedEvents = workspacesView.metric(
  {
    id: 'recorded-events',
    glossaryId: 'activity',
    label: 'Recorded events',
    format: { kind: 'count' },
  },
  summary => ({ current: summary.events })
);
const activeWorkspaces = workspacesView.metric(
  {
    id: 'active-workspaces',
    glossaryId: 'activation',
    label: 'Active workspaces',
    format: { kind: 'count' },
  },
  summary => ({ current: summary.active })
);
const workspaceActivation = workspacesView.metric(
  {
    id: 'workspace-activation',
    glossaryId: 'activation',
    label: 'Workspace activation',
    format: { kind: 'ratio', maximumFractionDigits: 1 },
  },
  summary => ({ current: summary.activation })
);
export const overviewMetrics = workspacesView.content(result => (
  <Grid columns={3} minItemWidth="compact">
    <MetricWidget metric={recordedEvents} source={result} />
    <MetricWidget metric={activeWorkspaces} source={result} />
    <MetricWidget metric={workspaceActivation} source={result} />
  </Grid>
));

/** The refresh status the state cases apply to their widgets. */
export const CaseStatusContext = createContext<WidgetStatus | undefined>(
  undefined
);

const caseValuesView = defineView({ dataContext, operation: 'caseValues' });
function caseMetric(
  key: keyof typeof caseValues,
  label: string,
  format: MetricFormat
) {
  const metric = caseValuesView.metric(
    { id: `case-${key}-${label}`, glossaryId: 'activity', label, format },
    values => ({ current: values[key] })
  );
  return caseValuesView.content(result => (
    <MetricWidget metric={metric} source={result} />
  ));
}
const count: MetricFormat = { kind: 'count' };
export const caseMetrics = {
  zero: caseMetric('zero', 'Recorded value', count),
  negative: caseMetric('negative', 'Recorded value', count),
  large: caseMetric('large', 'Recorded value', count),
  ratio: caseMetric('ratio', 'Conversion rate', { kind: 'ratio' }),
  currency: caseMetric('revenue', 'Revenue', {
    kind: 'currency',
    currency: 'EUR',
  }),
  longLabel: caseMetric(
    'zero',
    'A long metric label that wraps without overflowing its container',
    count
  ),
  visits: caseMetric('visits', 'Weekly visits', count),
};
const stableMetric = caseValuesView.metric(
  {
    id: 'case-stable',
    glossaryId: 'activity',
    label: 'Stable metric',
    format: count,
  },
  values => ({ current: values.stable })
);
function StableMetric({
  result,
}: {
  result: Parameters<Parameters<typeof caseValuesView.content>[0]>[0];
}) {
  return (
    <MetricWidget
      metric={stableMetric}
      source={result}
      status={useContext(CaseStatusContext)}
    />
  );
}
export const stableMetricContent = caseValuesView.content(result => (
  <StableMetric result={result} />
));

const caseRecordsView = defineView({ dataContext, operation: 'caseRecords' });
const emptyRecords = {
  title: 'No records',
  description: 'Try another range or clear your filters.',
};
const recordColumns = {
  name: { label: 'Record' },
  amount: {
    value: (record: typeof caseRow) => record.amount,
    format: (record: typeof caseRow) => record.amount.toLocaleString(),
  },
};
function caseRecords(name: string, key: 'none' | 'one' | 'two') {
  return caseRecordsView.dataset({
    name,
    select: records => records[key],
    rowKey: record => record.id,
    columns: recordColumns,
    evidence: { id: `case-records-${key}-${name}`, glossaryIds: ['activity'] },
    emptyFallback: emptyRecords,
  });
}
const emptyDataset = caseRecords('Empty records', 'none');
const completeDataset = caseRecords('Complete records', 'one');
const previewDataset = caseRecords('Preview records', 'two');
const stableDataset = caseRecords('Stable table', 'one');
function StableTable({
  result,
}: {
  result: Parameters<Parameters<typeof caseRecordsView.content>[0]>[0];
}) {
  return (
    <TableWidget
      dataset={stableDataset}
      source={result}
      status={useContext(CaseStatusContext)}
    />
  );
}
export const caseTables = {
  empty: caseRecordsView.content(result => (
    <TableWidget dataset={emptyDataset} source={result} />
  )),
  complete: caseRecordsView.content(result => (
    <TableWidget dataset={completeDataset} source={result} pagination={false} />
  )),
  preview: caseRecordsView.content(result => (
    <TableWidget dataset={previewDataset} source={result} limit={1} />
  )),
  stable: caseRecordsView.content(result => <StableTable result={result} />),
};

const pendingView = defineView({ dataContext, operation: 'pending' });
const pendingMetric = pendingView.metric(
  {
    id: 'case-loading',
    glossaryId: 'activity',
    label: 'Loading metric',
    format: count,
  },
  pending => ({ current: pending.count })
);
const pendingDataset = pendingView.dataset({
  name: 'Loading records',
  select: pending => pending.records,
  rowKey: record => record.id,
  columns: recordColumns,
  evidence: { id: 'case-loading-records', glossaryIds: ['activity'] },
  emptyFallback: emptyRecords,
});
export const loadingMetricContent = pendingView.content(result => (
  <MetricWidget metric={pendingMetric} source={result} />
));
export const loadingTableContent = pendingView.content(result => (
  <TableWidget dataset={pendingDataset} source={result} skeletonRows={3} />
));
