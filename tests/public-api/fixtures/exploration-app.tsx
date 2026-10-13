import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  choiceVariable,
  DataApp,
  DataSection,
  TableWidget,
  MetricWidget,
  VisualizationWidget,
  TextWidget,
  Stack,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
import { BarChart } from '@altertable/data-app/react/ui';
import {
  app,
  operations,
  region,
  country,
  geography,
  type Input,
} from '@/tests/public-api/fixtures/exploration-data';
const client = createDataClient({
  operations,
  lakehouse: {
    async queryAll(statement, options) {
      const response = await fetch('/api/drill-query', {
        method: 'POST',
        body: JSON.stringify({ statement, params: options.params }),
        signal: options.signal,
      });
      if (!response.ok) throw new Error('Revenue source unavailable.');
      return response.json();
    },
  },
});
const { defineDataView, defineDetailView } = createDataHooks(client);
const context = createDataContext(operations.overview.queryNames)({
  description: 'Net revenue after discounts and refunds',
  glossary: {
    revenue: {
      term: 'Net revenue',
      definition:
        'Order value minus discounts and refunds; cancelled orders excluded.',
      queryNames: ['geographicRevenue'],
    },
  },
});
function describe(input: Input) {
  return `${input.start}–${input.end} · ${input.segment} · Region: ${region.describe?.(input.region)} · Country: ${country.describe?.(input.country)} · ${geography.describe?.(input.geography)} · ${geography.level(input.geography).label}`;
}
const view = defineDataView({
  operation: 'overview',
  dataContext: context,
  variables: {
    month: choiceVariable({
      key: 'month',
      label: 'Month',
      options: [
        { id: '09', label: 'September' },
        { id: '10', label: 'October' },
      ],
      defaultValue: '09',
    }),
    segment: choiceVariable({
      key: 'segment',
      label: 'Segment',
      options: [
        { id: 'Enterprise', label: 'Enterprise' },
        { id: 'Self serve', label: 'Self serve' },
      ],
      defaultValue: 'Enterprise',
    }),
    region,
    country,
    geography,
  },
  input: values => ({
    start: `2026-${values.month}-01`,
    end: `2026-${values.month}-${values.month === '09' ? '30' : '31'}`,
    segment: values.segment as Input['segment'],
    region: values.region,
    country: values.country,
    geography: values.geography,
  }),
  describeInput: describe,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No groups match this scope' },
});
const groups = view.dataset({
  name: 'Revenue groups',
  select: data => data,
  rowKey: row => row.id,
  columns: {
    group: { value: row => row.label },
    revenue: {
      value: row => row.revenue,
      format: { kind: 'currency', currency: 'USD' },
    },
  },
  evidence: { id: 'groups', glossaryIds: ['revenue'] },
});
const total = view.metric(
  {
    id: 'revenue',
    glossaryId: 'revenue',
    format: { kind: 'currency', currency: 'USD' },
  },
  data => ({ current: data.reduce((sum, row) => sum + row.revenue, 0) })
);
const detailContext = createDataContext(operations.overview.queryNames)({
  description: 'Contributing orders',
  glossary: {
    revenue: {
      term: 'Net revenue',
      definition:
        'Order amount minus discounts and refunds, excluding cancelled orders.',
      queryNames: ['geographicOrders'],
    },
  },
});
const detail = defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'orders',
  dataContext: detailContext,
  parseInput: operations.orders.input,
  describeInput: input => `${input.selected.label} · ${describe(input)}`,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No contributing orders' },
});
const orders = detail.dataset({
  name: 'Contributing orders',
  select: data => data,
  rowKey: row => row.id,
  columns: {
    order: { value: row => row.id },
    customer: { value: row => row.customer },
    country: { value: row => row.country },
    day: { value: row => row.day },
    revenue: { value: row => row.revenue },
  },
  evidence: { id: 'orders', glossaryIds: ['revenue'] },
});
const detailContent = detail.content(
  source => <TableWidget dataset={orders} source={source} pagination={false} />,
  {
    datasets: [orders],
    story: snapshot => [
      {
        id: 'orders',
        headline: `${snapshot.data.reduce((sum, row) => sum + row.revenue, 0)} net revenue`,
        context: detail.scope(snapshot),
        visual: <TableWidget dataset={orders} source={snapshot} />,
        evidence: orders,
      },
    ],
  }
);
const actions = groups.actions(
  action => ({
    orders: action.detail({
      label: 'View orders',
      target: detail,
      input: (row, input) => ({ ...input, selected: row }),
    }),
    filter: action.filter({
      label: row => `Filter to this ${row.level}`,
      when: row => row.level !== 'customer',
      target: view,
      values: row =>
        row.level === 'region'
          ? ({
              region: {
                kind: 'include',
                members: [{ kind: 'value', value: row.id }],
              },
              country: { kind: 'all' },
            } as const)
          : ({
              country: {
                kind: 'include',
                members: [{ kind: 'value', value: row.id }],
              },
            } as const),
    }),
    descend: action.descend({
      target: view.breakdown('geography'),
      member: row => ({ id: row.id, label: row.label }),
    }),
  }),
  {
    primary:
      new URLSearchParams(location.search).get('primary') === 'descend'
        ? 'descend'
        : new URLSearchParams(location.search).has('primary')
          ? 'orders'
          : undefined,
  }
);
const content = view.content(source => (
  <Stack>
    <MetricWidget metric={total} source={source} />
    <TextWidget title="Displayed scope" dataset={groups} source={source}>
      {() => (source.loading ? null : <p>{describe(source.input)}</p>)}
    </TextWidget>
    <VisualizationWidget
      title={
        source.loading
          ? 'Revenue'
          : `Revenue by ${geography.level(source.input.geography).label.toLowerCase()}`
      }
      dataset={groups}
      source={source}
      actions={actions}
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel="Geographic revenue"
          unit="USD"
          items={rows.map(row => ({ ...row, value: row.revenue }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    <TableWidget
      dataset={groups}
      source={source}
      actions={actions}
      pagination={false}
    />
  </Stack>
));
function App() {
  return (
    <DataApp
      view={view}
      datasets={[groups]}
      details={[detailContent]}
      story={snapshot => [
        {
          id: 'scope',
          headline: `Revenue by ${geography.level(snapshot.input.geography).label.toLowerCase()}`,
          context: describe(snapshot.input),
          visual: <TableWidget dataset={groups} source={snapshot} />,
          evidence: groups,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
