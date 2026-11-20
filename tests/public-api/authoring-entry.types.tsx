import { defineDataApp } from '@altertable/data-app';
import { createDataContext as registerContext } from '@altertable/data-app-react';
import * as authoring from '@altertable/data-app-react';
import {
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  DataValue,
  TextWidget,
  VisualizationWidget,
  TableWidget,
  type DataAppProps,
  type DataSectionProps,
  type TableWidgetProps,
} from '@altertable/data-app-react';
import {
  DataAppProvider,
  useAppFilters,
  PresentStory,
  AboutData,
  ShimmerText as DirectShimmerText,
} from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';

const context = registerContext({ count: 'count' })({
  description: 'Fixture context',
  glossary: {
    count: { term: 'Count', definition: 'Count', queryNames: ['count'] },
  },
});

const dataApp = defineDataApp({
  title: 'Test',
  description: 'Verify app authoring contracts.',
  scope: { organization: 'a', environment: 'b' },
  appearance: {},
  queries: {},
});
const hooks = createDataHooks(
  createDataClient({
    operations: {
      count: dataApp.defineOperation({
        policy: { maxQueryRows: 1, maxDurationMs: 1000 },
        async run() {
          return 1;
        },
      }),
    },
  })
);
const view = hooks.defineView({ dataContext: context, operation: 'count' });

const base = {
  dataContext: { description: 'Test', glossary: {} },
  children: null,
};
const dataset = view.dataset({
  name: 'Values',
  select: data => [data],
  suggestions: {
    title: row => row.toFixed(0),
    onSelect: row => row.toFixed(0),
  },
  rowKey: row => row,
  columns: { value: { value: row => row } },
  evidence: { id: 'values', queryNames: ['count'] },
});
const app: DataAppProps<number, Record<string, never>> = {
  ...base,
  view,
  story: () => [],
  datasets: [dataset],
  showSearchSuggestions: false,
};
const content = view.content(result => (
  <p>{result.loading ? 'Loading' : result.data}</p>
));
const section: DataSectionProps<number, Record<string, never>> = {
  content,
};
<DataApp {...app}>
  <DataSection {...section} />
</DataApp>;
// Without a view, the same component renders a static screen.
<DataApp dataContext={base.dataContext}>Setup</DataApp>;
// @ts-expect-error A static screen has no displayed result to present or export.
<DataApp dataContext={base.dataContext} story={() => []}>
  Setup
</DataApp>;
// @ts-expect-error Data apps require a declared primary view.
const withoutView: DataAppProps<number, Record<string, never>> = {
  ...base,
  story: () => [],
  datasets: [dataset],
};
// @ts-expect-error Raw request hooks are outside the authoring API.
void hooks.useView;
// @ts-expect-error A request state is not a declared view.
<DataSection content={{ view, loadingFallback: null, children: () => null }} />;
// @ts-expect-error Default metrics require view bindings and a displayed source.
<MetricWidget label="Count" value={1} format={{ kind: 'count' }} />;
const rawTable: TableWidgetProps<number> = {
  title: 'Rows',
  // @ts-expect-error Default tables derive rows from a dataset binding.
  rows: [1],
  rowKey: (value: number) => String(value),
  columns: [{ id: 'value', header: 'Value', cell: String }],
  emptyFallback: { title: 'Empty' },
};
<TableWidget {...rawTable} />;
void [withoutView, useAppFilters, PresentStory, AboutData];

// @ts-expect-error Request subscriptions belong to app and section components.
void view.useResult;
// @ts-expect-error Apps derive exports from listed datasets.
void view.csvExport;
// @ts-expect-error Raw CSV callbacks are outside the standard data app API.
<DataApp {...app} csvExport={() => ({ filename: 'manual.csv', tables: [] })} />;
// @ts-expect-error At least one dataset is required for the app's displayed results.
<DataApp {...app} datasets={[]} />;
<TableWidget
  dataset={dataset}
  source={{ data: 1, input: {} }}
  // @ts-expect-error A table derives its reading from the dataset and source.
  reading={{ loading: false, value: [1] }}
/>;

// @ts-expect-error Raw charts belong to direct UI composition.
void authoring.BarChart;
// @ts-expect-error Charts accept ordinary arrays; no preparation factory is public.
void authoring.defineChartItems;

// @ts-expect-error Generic frames belong to direct UI composition.
void authoring.DataWidget;
// @ts-expect-error Binding adapters are internal.
void dataset.props;
// @ts-expect-error Exports are owned by DataApp.datasets.
void dataset.csv;
// @ts-expect-error Request configuration is private after declaration.
void view.operation;
// @ts-expect-error Filters belong to the operation, not the view.
void view.filters;
const boundMetric = view.metric(
  {
    id: 'count',
    label: 'Count',
    format: { kind: 'count' },
    glossaryId: 'count',
  },
  data => ({ current: data })
);
// @ts-expect-error Metric adapters are internal.
void boundMetric.props;
<VisualizationWidget dataset={dataset} source={{ data: 1, input: {} }}>
  {rows => <p>{rows[0]}</p>}
</VisualizationWidget>;
<VisualizationWidget
  dataset={dataset}
  source={{ loading: true }}
  viewLabel="View"
  views={[{ id: 'values', label: 'Values', render: rows => <p>{rows[0]}</p> }]}
/>;
<VisualizationWidget
  dataset={dataset}
  source={{ data: 1, input: {} }}
  // @ts-expect-error Empty state is derived from the dataset selection.
  isEmpty={() => false}
>
  {rows => <p>{rows[0]}</p>}
</VisualizationWidget>;

<DataValue metric={boundMetric} source={{ data: 1, input: {} }} />;
<TextWidget metric={boundMetric} source={{ data: 1, input: {} }} />;
<DataValue dataset={dataset} source={{ data: 1, input: {} }}>
  {rows => rows[0]}
</DataValue>;
<TextWidget dataset={dataset} source={{ data: 1, input: {} }}>
  {rows => <p>{rows[0]}</p>}
</TextWidget>;
<DataValue scope={{ loading: true }} />;
// @ts-expect-error Raw CSV adapters belong to direct UI composition.
type _RawExport = authoring.CsvExport;
// @ts-expect-error Raw table adapters belong to direct UI composition.
type _RawColumn = authoring.TableWidgetColumn<number>;
// @ts-expect-error Arbitrary readings belong to direct UI composition.
<DataValue reading={{ loading: false, value: 1 }}>{value => value}</DataValue>;
<MetricWidget
  source={{ data: 1, input: {} }}
  // @ts-expect-error A metric must be created by the declared view.
  metric={{ definition: boundMetric.definition, read: boundMetric.read }}
/>;

// @ts-expect-error Raw CSV tables belong to direct UI composition.
type _RawCsvTable = authoring.CsvTable;

// @ts-expect-error Raw readings are direct UI adapters.
type _RawReading = authoring.DataReading<number>;
// @ts-expect-error Raw metric readings are direct UI adapters.
type _RawMetricReading = authoring.MetricReading;

view.content(source => {
  // @ts-expect-error Readings come from declarations, not anonymous content selectors.
  void source.select;
  // @ts-expect-error Metrics are declared through the view.
  void source.metric;
  return <DataValue scope={source.scope} />;
});
// @ts-expect-error Context belongs to the declared view.
<DataApp {...app} dataContext={context} />;
// @ts-expect-error A view must own a registered data context.
hooks.defineView({ operation: 'count' });
// @ts-expect-error Filters belong to the operations, not the app root.
<DataApp {...app} filters={{}} />;
view.metric(
  // @ts-expect-error Metric registration validates the view's glossary keys.
  { id: 'bad', glossaryId: 'missing', format: { kind: 'count' } },
  data => ({ current: data })
);
view.metric(
  // @ts-expect-error Metric registration and binding are one call.
  context.metric({
    id: 'count',
    glossaryId: 'count',
    format: { kind: 'count' },
  }),
  data => ({ current: data })
);

// @ts-expect-error Content carries its own request owner.
<DataSection content={content} view={view} />;
// @ts-expect-error Loading layout belongs to view.content.
<DataSection content={content} loadingFallback={null} />;
// @ts-expect-error Render callbacks are private section adapters.
void content.children;
// @ts-expect-error Request owners are private section adapters.
void content.view;
view.dataset<number>({
  name: 'Bad evidence',
  select: data => [data],
  rowKey: row => row,
  columns: { value: { value: row => row } },
  // @ts-expect-error Dataset references use the owning context's registered glossary.
  evidence: { id: 'bad', glossaryIds: ['missing'] },
});
view.dataset<number>({
  name: 'Bad query',
  select: data => [data],
  rowKey: row => row,
  columns: { value: { value: row => row } },
  // @ts-expect-error Dataset references use the owning context's registered queries.
  evidence: { id: 'bad', queryNames: ['missing'] },
});

<DataApp
  {...app}
  story={snapshot => [
    {
      id: 'count',
      headline: 'Count',
      visual: <DataValue metric={boundMetric} source={snapshot} />,
      evidence: boundMetric,
    },
  ]}
/>;
<DataApp
  {...app}
  // @ts-expect-error Story evidence must be the registered binding, not raw metadata.
  story={() => [
    {
      id: 'raw',
      headline: 'Raw',
      visual: null,
      evidence: boundMetric.definition,
    },
  ]}
/>;

// @ts-expect-error App identity comes from the root provider, not component props.
<DataApp {...app} config={dataApp} />;

// @ts-expect-error Mounting requires an app identity.
authoring.mountDataApp({ component: () => null });

authoring.mountDataApp({
  // @ts-expect-error Root APIs require a defined app, not a bare configuration.
  app: {
    title: 'Undeclared',
    description: 'Verify root app contracts.',
    scope: { organization: 'a', environment: 'b' },
    appearance: {},
    queries: {},
  },
  component: () => null,
});

DataAppProvider({
  // @ts-expect-error Custom roots require the same defined app as mounting.
  app: {
    title: 'Undeclared',
    description: 'Verify root app contracts.',
    scope: { organization: 'a', environment: 'b' },
    appearance: {},
    queries: {},
  },
  children: null,
});

// @ts-expect-error App fields are direct; there is no separate configuration wrapper.
void dataApp.config;

view.dataset<number>({
  name: 'Invalid suggestions',
  select: data => [data],
  rowKey: row => row,
  columns: { value: { value: row => row } },
  evidence: { id: 'invalid', queryNames: ['count'] },
  // @ts-expect-error Suggestion selectors must use the inferred dataset row type.
  suggestions: { title: (row: string) => row },
});

function selectValue(row: number) {
  return row.toFixed(0);
}
const callbackDataset = view.dataset({
  name: 'Callback values',
  select: data => [data],
  rowKey: row => row,
  columns: { value: { value: row => row.toFixed(0) } },
  suggestions: { title: row => row.toFixed(0), onSelect: selectValue },
  evidence: { id: 'callback-values', queryNames: ['count'] },
});
void callbackDataset;

const datedRows = view.dataset({
  name: 'Dated values',
  select: data => [
    { id: data, day: '2026-09-24', observed: '2026-09-24T15:00:00Z' },
  ],
  rowKey: row => row.id,
  columns: {
    day: { value: row => row.day, format: { kind: 'date' } },
    observed: {
      value: row => row.observed,
      format: { kind: 'dateTime', precision: 'second' },
    },
  },
  evidence: { id: 'dated-values', queryNames: ['count'] },
});
<TableWidget dataset={datedRows} source={{ loading: true }} headingLevel={3} />;
<authoring.SectionHeading level={2}>Activity</authoring.SectionHeading>;
<authoring.DateDisplay value="2026-09-24" format={{ kind: 'date' }} />;
// @ts-expect-error Semantic heading levels must be valid HTML heading levels below the page title.
<authoring.SectionHeading level={7}>Activity</authoring.SectionHeading>;
const invalidCalendarFormat: import('@altertable/data-app/format').DateFormat =
  {
    kind: 'date',
    // @ts-expect-error Calendar formats cannot specify a time zone.
    timeZone: 'UTC',
  };
void invalidCalendarFormat;

<DirectShimmerText title="Activity">Loading results</DirectShimmerText>;
<DirectShimmerText>Refreshing</DirectShimmerText>;
// @ts-expect-error ShimmerText requires plain text for its decorative copy.
<DirectShimmerText>
  <strong>Loading</strong>
</DirectShimmerText>;

// @ts-expect-error Custom activity labels belong to the direct UI entry.
void authoring.ShimmerText;

const rowsApp = defineDataApp({
  title: 'Rows',
  description: 'Verify row-backed dataset contracts.',
  scope: { organization: 'a', environment: 'b' },
  queries: {
    groups: {
      statement: 'SELECT 1',
      params: {},
      projections: { name: { type: 'string' }, total: { type: 'number' } },
    },
  },
});
// The app owns its query names; a glossary entry cites the ones behind it.
const rowsContext = registerContext(rowsApp.queryNames)({
  description: 'Rows',
  glossary: {
    total: {
      term: 'Total',
      definition: 'Total',
      queryNames: [rowsApp.queryNames.groups],
    },
  },
});
// @ts-expect-error Only registered queries have names.
void rowsApp.queryNames.missing;
const rowsOperations = rowsApp.defineOperations({
  // The duration limit defaults; the row limit stays explicit.
  groups: rowsApp.defineOperation({
    policy: { maxQueryRows: 10 },
    async run() {
      return [
        { name: 'Alpha', total: 1, day: '2026-09-24', nested: { id: 1 } },
      ];
    },
  }),
  summary: rowsApp.defineOperation({
    policy: { maxQueryRows: 1 },
    async run() {
      return { rows: [{ name: 'Alpha' }] };
    },
  }),
  unlimited: rowsApp.defineOperation({
    // @ts-expect-error Each operation states its row limit.
    policy: {},
    async run() {
      return 1;
    },
  }),
});
const rowsHooks = createDataHooks(rowsOperations.createDataClient());
const rowsView = rowsHooks.defineView({
  dataContext: rowsContext,
  operation: 'groups',
});
// An operation that returns rows needs no selector, and a column named after a field reads it.
const groupRows = rowsView.dataset({
  name: 'Groups',
  rowKey: row => row.name,
  columns: {
    name: { label: 'Group' },
    total: { format: { kind: 'count' } },
    day: { format: { kind: 'date' } },
    share: { value: row => row.total / 2, format: { kind: 'ratio' } },
    link: { value: row => row.name, format: row => <b>{row.name}</b> },
  },
  evidence: { id: 'groups', glossaryIds: ['total'] },
});
<TableWidget dataset={groupRows} source={{ loading: true }} />;
<TableWidget
  dataset={groupRows}
  source={{ loading: true }}
  limit={1}
  // @ts-expect-error Preview limits and pagination cannot coexist.
  pagination={false}
/>;
rowsView.dataset({
  name: 'Unknown field',
  rowKey: row => row.name,
  // @ts-expect-error A column without `value` must be named after a row field.
  columns: { missing: { label: 'Missing' } },
  evidence: { id: 'unknown-field', glossaryIds: ['total'] },
});
rowsView.dataset({
  name: 'Mismatched format',
  rowKey: row => row.name,
  // @ts-expect-error A metric format needs a numeric field.
  columns: { name: { format: { kind: 'count' } } },
  evidence: { id: 'mismatched-format', glossaryIds: ['total'] },
});
rowsView.dataset({
  name: 'Nested field',
  rowKey: row => row.name,
  // @ts-expect-error Object fields need an accessor that returns a cell value.
  columns: { nested: {} },
  evidence: { id: 'nested-field', glossaryIds: ['total'] },
});
const summaryView = rowsHooks.defineView({
  dataContext: rowsContext,
  operation: 'summary',
});
// @ts-expect-error A result that is not a row array needs `select`.
summaryView.dataset({
  name: 'Summary rows',
  rowKey: (row: { name: string }) => row.name,
  columns: { name: {} },
  evidence: { id: 'summary-rows', glossaryIds: ['total'] },
});
summaryView.dataset({
  name: 'Summary rows',
  select: summary => summary.rows,
  rowKey: row => row.name,
  columns: { name: {} },
  evidence: { id: 'summary-rows', glossaryIds: ['total'] },
});
