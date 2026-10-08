import { defineDataApp } from '@altertable/data-app/config';
import { createDataContext as registerContext } from '@altertable/data-app/react';
import * as authoring from '@altertable/data-app/react';
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
} from '@altertable/data-app/react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  DataAppProvider,
  DataApp as StaticApp,
  MetricWidget as StaticMetric,
  useAppVariables,
  PresentStory,
  AboutData,
} from '@altertable/data-app/react/ui';

const context = registerContext({ count: 'count' })({
  description: 'Fixture context',
  glossary: {
    count: { term: 'Count', definition: 'Count', queryNames: ['count'] },
  },
});

const hooks = createDataHooks<{
  count: DataOperation<Record<string, never>, number>;
}>(createDataClient());
const view = hooks.defineDataView({
  dataContext: context,
  operation: 'count',
  describeInput: () => 'all',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
});
const dataApp = defineDataApp({
  title: 'Test',
  scope: { organization: 'a', environment: 'b' },
  appearance: {},
  queries: {},
});

const base = {
  dataContext: { description: 'Test', glossary: {} },
  children: null,
};
const dataset = view.dataset({
  name: 'Values',
  select: data => [data],
  rowKey: row => row,
  columns: { value: { value: row => row } },
  evidence: { id: 'values', queryNames: ['count'] },
});
const app: DataAppProps<number, Record<string, never>> = {
  ...base,
  view,
  story: () => [],
  datasets: [dataset],
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
<StaticApp {...base}>
  <StaticMetric label="Count" value={1} format={{ kind: 'count' }} />
</StaticApp>;
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
void [withoutView, useAppVariables, PresentStory, AboutData];

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
// @ts-expect-error Resolved input mapping is private after declaration.
void view.input;
// @ts-expect-error Variables are accessed through the displayed result.
void view.variables;
// @ts-expect-error Date bindings are private after declaration.
void view.date;
// @ts-expect-error Field bindings are private after declaration.
void view.bindings;
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
hooks.defineDataView({
  operation: 'count',
  describeInput: () => 'all',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
});
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
  story={() => [
    {
      id: 'raw',
      headline: 'Raw',
      visual: null,
      // @ts-expect-error Story evidence must be the registered binding, not raw metadata.
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
    scope: { organization: 'a', environment: 'b' },
    appearance: {},
    queries: {},
  },
  children: null,
});

// @ts-expect-error App fields are direct; there is no separate configuration wrapper.
void dataApp.config;
