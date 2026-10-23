import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  searchVariable,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  TableWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { ShimmerText } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineOperation,
  type QueryResult,
} from '@altertable/data-app/contract';

type Pending = {
  resolve: (result: QueryResult) => void;
};
const pending = new Map<string, Pending>();

function searchInput(value: unknown) {
  const search = (value as { search?: unknown })?.search;
  return { search: typeof search === 'string' ? search : '' };
}

const policy = { maxQueryRows: 1, maxDurationMs: 60_000 };
const primary = defineOperation({
  input: searchInput,
  checks: [{ search: '' }],
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
  input: searchInput,
  checks: [{ search: '' }],
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
        pending.set(key, { resolve });
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
const context = createDataContext({ count: 'count' })({
  description: 'Counts',
  glossary: {},
});
const secondaryContext = createDataContext({ count: 'count', total: 'total' })({
  description: 'Counts and totals',
  glossary: {
    total: { term: 'Total', definition: 'All rows.', queryNames: ['total'] },
  },
});
const hooks = createDataHooks(client);

const search = searchVariable({ key: 'search', label: 'Search' });
const primaryView = hooks.defineDataView({
  operation: 'primary',
  dataContext: context,
  variables: { search },
  describeInput: () => 'primary scope',
  isEmpty: () => false,
  emptyFallback: { title: 'No counts' },
});
const secondaryView = hooks.defineDataView({
  operation: 'secondary',
  dataContext: secondaryContext,
  variables: { search },
  describeInput: () => 'secondary scope',
  isEmpty: () => false,
  emptyFallback: { title: 'No counts' },
});
const primaryDataset = primaryView.dataset({
  name: 'Primary counts',
  select: count => [count],
  rowKey: () => 'count',
  columns: { count: { value: row => row } },
  evidence: { id: 'primary', queryNames: ['count'] },
});
const primaryContent = primaryView.content(source => (
  <TextWidget title="Primary results" dataset={primaryDataset} source={source}>
    {rows => <output aria-label="primary count">primary: {rows[0]}</output>}
  </TextWidget>
));
const secondaryDataset = secondaryView.dataset({
  name: 'Secondary counts',
  select: data => [data.count],
  rowKey: () => 'count',
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
    >
      {rows => (
        <output aria-label="secondary count">secondary: {rows[0]}</output>
      )}
    </TextWidget>
    <TableWidget
      title="Secondary table"
      dataset={secondaryDataset}
      source={source}
      limit={1}
      showCount={false}
    />
    <TextWidget
      title="Secondary totals"
      dataset={totalsDataset}
      source={source}
    >
      {rows => <output aria-label="secondary total">total: {rows[0]}</output>}
    </TextWidget>
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
  );
}
function App() {
  return (
    <DataApp view={primaryView} datasets={[primaryDataset]} story={() => []}>
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
