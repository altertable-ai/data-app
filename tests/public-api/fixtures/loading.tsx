import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  TableWidget,
  MetricWidget,
  VisualizationWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { DataWidget, ShimmerText } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  searchFilter,
  type QueryResult,
} from '@altertable/data-app/contract';

type Pending = {
  resolve: (result: QueryResult) => void;
  reject: (error: Error) => void;
};
const pending = new Map<string, Pending>();
const params = new URLSearchParams(location.search);
const fullWidgets = params.has('widgets');

const search = searchFilter({ key: 'search', label: 'Search' });

const policy = { maxQueryRows: 1, maxDurationMs: 60_000 };
const primary = defineOperation({
  filters: { search },
  queries: {
    count: {
      projections: { count: { type: 'number' } } as const,
      statement: 'SELECT count FROM primary WHERE label LIKE $search',
      params: { search: { type: 'string' } },
    },
  },
  policy,
  async run({ query }, input) {
    const result = await query('count', { search: input.search }, { limit: 1 });
    return result.rows[0]!.count;
  },
});
const secondary = defineOperation({
  filters: { search },
  queries: {
    count: {
      projections: { count: { type: 'number' } } as const,
      statement: 'SELECT count FROM secondary WHERE label LIKE $search',
      params: { search: { type: 'string' } },
    },
    total: {
      projections: { total: { type: 'number' } } as const,
      statement: 'SELECT total FROM secondary_totals',
      params: {},
    },
  },
  policy,
  async run({ query }, input) {
    const [count, total] = await Promise.all([
      query('count', { search: input.search }, { limit: 1 }),
      query('total', {}, { limit: 1 }),
    ]);
    return { count: count.rows[0]!.count, total: total.rows[0]!.total };
  },
});

function pendingKey(statement: string) {
  if (statement.includes('secondary_totals')) return 'secondary:total';
  return statement.includes('secondary') ? 'secondary:count' : 'primary:count';
}

const client = createDataClient({
  operations: { primary, secondary },
  lakehouse: {
    queryAll(statement, { signal }) {
      const key = pendingKey(statement);
      return new Promise((resolve, reject) => {
        pending.set(key, { resolve, reject });
        signal.addEventListener(
          'abort',
          () => {
            pending.delete(key);
            reject(signal.reason);
          },
          { once: true }
        );
      });
    },
  },
});
const context = createDataContext({ count: 'count', total: 'total' })({
  description: 'Counts and totals',
  glossary: {
    count: {
      term: 'Count',
      definition: 'Measured count.',
      queryNames: ['count'],
    },
    total: { term: 'Total', definition: 'All rows.', queryNames: ['total'] },
  },
});
const { defineView } = createDataHooks(client);
const primaryView = defineView({ operation: 'primary', dataContext: context });
const secondaryView = defineView({
  operation: 'secondary',
  dataContext: context,
});
const primaryDataset = primaryView.dataset({
  name: 'Primary counts',
  select: count => [count],
  rowKey: () => 'count',
  columns: { count: { value: row => row } },
  evidence: { id: 'primary', queryNames: ['count'] },
});
const primaryMetric = primaryView.metric(
  {
    id: 'primary-metric',
    glossaryId: 'count',
    label: 'Primary metric',
    format: { kind: 'count' },
  },
  current => ({ current })
);
const primaryContent = primaryView.content(source => (
  <>
    <TextWidget
      title="Primary results"
      dataset={primaryDataset}
      source={source}
    >
      {rows => <output aria-label="primary count">primary: {rows[0]}</output>}
    </TextWidget>
    {fullWidgets && (
      <MetricWidget
        metric={primaryMetric}
        source={source}
        description="Measured primary count"
      />
    )}
  </>
));
const secondaryDataset = secondaryView.dataset({
  name: 'Secondary counts',
  select: data => (fullWidgets ? [data.count, data.count + 1] : [data.count]),
  rowKey: row => String(row),
  columns: { count: { value: row => row } },
  evidence: { id: 'secondary', queryNames: ['count'] },
});
const totalsDataset = secondaryView.dataset({
  name: 'Secondary totals',
  select: data => [data.total],
  rowKey: () => 'total',
  columns: { total: { value: row => row } },
  evidence: { id: 'totals', glossaryIds: ['total'] },
});
const secondaryContent = secondaryView.content(source => (
  <>
    <TextWidget
      title="Secondary results"
      dataset={secondaryDataset}
      source={source}
      description={fullWidgets ? 'Measured secondary count' : undefined}
      footer={fullWidgets ? 'Secondary coverage' : undefined}
    >
      {rows => (
        <output aria-label="secondary count">secondary: {rows[0]}</output>
      )}
    </TextWidget>
    <TableWidget
      title="Secondary table"
      dataset={secondaryDataset}
      source={source}
      {...(fullWidgets ? { pagination: { pageSize: 1 } } : { limit: 1 })}
      showCount={false}
    />
    <TextWidget
      title="Secondary totals"
      dataset={totalsDataset}
      source={source}
    >
      {rows => <output aria-label="secondary total">total: {rows[0]}</output>}
    </TextWidget>
    {fullWidgets && (
      <VisualizationWidget
        title="Secondary chart"
        dataset={secondaryDataset}
        source={source}
      >
        {rows => <output aria-label="secondary chart value">{rows[0]}</output>}
      </VisualizationWidget>
    )}
  </>
));
const dataApp = defineDataApp({
  title: 'Loading feedback',
  description: 'Loading and refresh feedback for independent widgets.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
function Controls({ name, queries }: { name: string; queries: string[] }) {
  return (
    <>
      <button
        onClick={() => {
          for (const query of queries)
            pending
              .get(`${name}:${query}`)
              ?.resolve(
                query === 'total'
                  ? { columns: [{ name: 'total' }], rows: [[9]] }
                  : { columns: [{ name: 'count' }], rows: [[7]] }
              );
        }}
      >
        Resolve {name}
      </button>
      {fullWidgets && (
        <button
          onClick={() => {
            for (const query of queries)
              pending
                .get(`${name}:${query}`)
                ?.reject(new Error('Source unavailable'));
          }}
        >
          Fail {name}
        </button>
      )}
    </>
  );
}
function App() {
  return (
    <DataApp
      view={primaryView}
      summaryViews={params.has('summary') ? [secondaryView] : []}
      datasets={[primaryDataset]}
      story={() => []}
    >
      {params.has('explicit-status') && (
        <DataWidget title="Manual refresh" status={{ kind: 'updating' }}>
          Manual data
        </DataWidget>
      )}
      <output aria-label="Shimmer preview">
        <ShimmerText>Preparing results</ShimmerText>
      </output>
      <Controls name="primary" queries={['count']} />
      <Controls name="secondary" queries={['count', 'total']} />
      <section aria-label="Primary section">
        <DataSection content={primaryContent} />
      </section>
      <section aria-label="Independent section">
        <DataSection content={secondaryContent} />
      </section>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
