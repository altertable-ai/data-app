import * as authoring from '@altertable/data-app/react';
import {
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  VisualizationWidget,
  TableWidget,
  type DataAppProps,
  type DataSectionProps,
  type TableWidgetProps,
} from '@altertable/data-app/react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  DataApp as StaticApp,
  MetricWidget as StaticMetric,
  useAppVariables,
  PresentStory,
  AboutData,
} from '@altertable/data-app/react/ui';

const hooks = createDataHooks<{
  count: DataOperation<Record<string, never>, number>;
}>(createDataClient());
const view = hooks.defineDataView({
  operation: 'count',
  describeInput: () => 'all',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
});
const base = {
  config: {
    title: 'Test',
    scope: { organization: 'a', environment: 'b' },
    appearance: {},
  },
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
  view,
  ...content,
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
<DataSection view={{ kind: 'ready', data: 1, input: {} }} {...content} />;
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
    evidence: { id: 'count', queryNames: ['count'] },
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
