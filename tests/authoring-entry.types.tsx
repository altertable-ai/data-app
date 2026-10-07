import {
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
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
// @ts-expect-error Default metrics require registered definitions and readings.
<MetricWidget label="Count" value={1} format={{ kind: 'count' }} />;
const rawTable: TableWidgetProps<number> = {
  title: 'Rows',
  // @ts-expect-error Default tables consume readings, not directly authored row state.
  rows: [1],
  rowKey: (value: number) => String(value),
  columns: [{ id: 'value', header: 'Value', cell: String }],
  emptyFallback: { title: 'Empty' },
};
<TableWidget {...rawTable} />;
void [withoutView, useAppVariables, PresentStory, AboutData];
