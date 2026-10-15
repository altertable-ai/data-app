import {
  createDataHooks,
  createDataContext,
  MetricWidget,
  DataApp,
  DataValue,
  TableWidget,
  VisualizationWidget,
  TextWidget,
} from '@altertable/data-app/react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
const { defineDataView } =
  createDataHooks(
    createDataClient<{
      sales: DataOperation<Record<string, never>, { amount: number }>;
      users: DataOperation<{ team: string }, { count: number }>;
    }>()
  );
const dataContext = createDataContext({ sales: 'sales', users: 'users' })({
  description: 'Types',
  glossary: { amount: { term: 'Amount', definition: 'A number' } },
});
const sales = defineDataView({
  operation: 'sales',
  dataContext,
  describeInput: () => 'sales',
  isEmpty: () => false,
  emptyFallback: { title: 'None' },
});
const users = defineDataView({
  operation: 'users',
  dataContext,
  input: () => ({ team: 'all' }),
  describeInput: input => input.team,
  isEmpty: () => false,
  emptyFallback: { title: 'None' },
});
const metric = sales.metric(
  { id: 'amount', glossaryId: 'amount', format: { kind: 'count' } },
  data => ({ current: data.amount })
);
const dataset = sales.dataset({
  name: 'Sales',
  select: data => [data],
  rowKey: () => 'sales',
  evidence: { id: 'sales', queryNames: ['sales'] },
  columns: { amount: { value: row => row.amount } },
});
// @ts-expect-error Every bound widget requires its explicit source.
const missing = <MetricWidget metric={metric} />;
const content = sales.content(source => {
  // @ts-expect-error Error, empty and loading sources have no displayed data.
  const _unsafe = source.data;
  if ('data' in source) {
    const amount: number = source.data.amount;
    const reading = metric.read(source);
    void [amount, reading];
  }
  if (source.state !== 'error' && source.state !== 'empty') {
    // @ts-expect-error A loading-or-displayed reading must be narrowed before accessing its value.
    const _value = metric.read(source).value;
  }
  if (source.state === 'error' || source.state === 'empty') {
    // @ts-expect-error Selectors only accept readable sources.
    metric.read(source);
  }
  return <MetricWidget metric={metric} source={source} />;
});
const other = users.content(source => (
  // @ts-expect-error Sources retain their data and input types.
  <MetricWidget metric={metric} source={source} />
));
const app = (
  <DataApp
    view={sales}
    datasets={[dataset]}
    story={snapshot => [
      {
        id: 'sales',
        headline: String(snapshot.data.amount),
        visual: <MetricWidget metric={metric} source={snapshot} />,
        evidence: metric,
      },
    ]}
  >
    {null}
  </DataApp>
);
void [missing, content, other, app];

// @ts-expect-error Tables require an explicit source.
<TableWidget dataset={dataset} />;
// @ts-expect-error Visualizations require an explicit source.
<VisualizationWidget dataset={dataset}>
  {rows => String(rows.length)}
</VisualizationWidget>;
// @ts-expect-error Bound narratives require an explicit source.
<TextWidget metric={metric} />;
// @ts-expect-error Inline bound values require an explicit source.
<DataValue metric={metric} />;
