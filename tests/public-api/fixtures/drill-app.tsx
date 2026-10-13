import { useState } from 'react';
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  choiceVariable,
  Button,
  DataApp,
  DataSection,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  TextWidget,
  Stack,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
import { BarChart, DataTable } from '@altertable/data-app/react/ui';
import { operations, salesApp } from '@/tests/public-api/fixtures/drill-data';

const client = createDataClient({
  operations,
  lakehouse: {
    async queryAll(statement, options) {
      const response = await fetch('/api/drill-query', {
        method: 'POST',
        body: JSON.stringify({ statement, params: options.params }),
        signal: options.signal,
      });
      if (!response.ok) throw new Error('Sales source is unavailable.');
      return response.json();
    },
  },
});
const context = createDataContext(operations.salesOverview.queryNames)({
  description: 'Sales across regions and customer segments',
  glossary: {
    revenue: {
      term: 'Net revenue',
      definition:
        'Order amount minus discounts and refunds, excluding cancelled orders.',
      queryNames: ['revenue'],
    },
  },
});
const { defineDataView, defineDetailView } = createDataHooks(client);
const view = defineDataView({
  operation: 'salesOverview',
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
  },
  input: ({ month, segment }) => ({
    start: `2026-${month}-01`,
    end: `2026-${month}-${month === '09' ? '30' : '31'}`,
    segment: segment as 'Enterprise' | 'Self serve',
  }),
  describeInput: input => `${input.start}–${input.end} · ${input.segment}`,
  isEmpty: () => false,
  emptyFallback: { title: 'No revenue' },
});
const regions = view.dataset({
  name: 'Regional revenue',
  select: data => data,
  rowKey: row => row.region,
  columns: {
    region: { value: row => row.region },
    revenue: {
      value: row => row.revenue,
      format: { kind: 'currency', currency: 'USD' },
    },
  },
  evidence: { id: 'regions', glossaryIds: ['revenue'] },
});
const total = view.metric(
  {
    id: 'total',
    glossaryId: 'revenue',
    format: { kind: 'currency', currency: 'USD' },
  },
  data => ({ current: data.reduce((sum, row) => sum + row.revenue, 0) })
);
const detailContext = createDataContext(operations.salesOverview.queryNames)({
  description: 'Contributing orders',
  glossary: {
    revenue: {
      term: 'Net revenue',
      definition:
        'Order amount minus discounts and refunds, excluding cancelled orders.',
      queryNames: ['contributingOrders'],
    },
  },
});
const detail = defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'salesOrders',
  dataContext: detailContext,
  parseInput: operations.salesOrders.input,
  describeInput: input =>
    `${input.region} · ${input.start}–${input.end} · ${input.segment}`,
  isEmpty: data => data.length === 0,
  emptyFallback: {
    title: 'No contributing orders',
    description: 'This scope has no non-cancelled orders.',
  },
});
const orders = detail.dataset({
  name: 'Contributing orders',
  select: data => data,
  rowKey: row => row.id,
  columns: {
    id: { label: 'Order', value: row => row.id },
    customer: { value: row => row.customer },
    country: { value: row => row.country },
    day: { value: row => row.day },
    status: { value: row => row.status },
    amount: { value: row => row.amount },
    discount: { value: row => row.discount },
    refund: { value: row => row.refund },
    revenue: { value: row => row.revenue },
  },
  evidence: {
    id: 'orders',
    glossaryIds: ['revenue'],
    queryNames: ['contributingOrders'],
  },
});
const detailContent = detail.content(source => (
  <TableWidget dataset={orders} source={source} pagination={false} />
));
const viewOrders = regions.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: detail,
    input: (row, input) => ({ ...input, region: row.region }),
  }),
}));
const allOrders = total.actions(action => ({
  orders: action.detail({
    label: 'View contributing orders',
    target: detail,
    input: (_, input) => ({ ...input, region: 'All regions' }),
  }),
}));
const content = view.content(source => <Results source={source} />);
type Source = Parameters<Parameters<typeof view.content>[0]>[0];
function Results({ source }: { source: Source }) {
  const [search, setSearch] = useState('');
  return (
    <Stack>
      <MetricWidget metric={total} source={source} actions={allOrders} />
      <TextWidget dataset={regions} source={source} title="Displayed scope">
        {() =>
          source.loading ? null : (
            <p>
              {source.input.start}–{source.input.end} · {source.input.segment}
            </p>
          )
        }
      </TextWidget>
      <VisualizationWidget
        dataset={regions}
        source={source}
        actions={viewOrders}
      >
        {(rows, actions) => (
          <BarChart
            items={rows.map(row => ({
              id: row.region,
              label: row.region,
              value: row.revenue,
              row,
            }))}
            ariaLabel="Net revenue by region"
            unit="USD"
            actionLabel="View orders"
            onItemAction={
              actions
                ? (item, trigger) => actions.run('orders', item.row, trigger)
                : undefined
            }
          />
        )}
      </VisualizationWidget>
      {new URLSearchParams(location.search).has('alternate') && (
        <VisualizationWidget
          title="Regional investigation"
          dataset={regions}
          source={source}
          actions={viewOrders}
          viewLabel="Investigation view"
          views={[
            {
              id: 'summary',
              label: 'Summary',
              render: rows => <p>{rows.length} regions</p>,
            },
            {
              id: 'records',
              label: 'Records',
              render: (rows, actions) => (
                <DataTable>
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Revenue</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.region}>
                        <th scope="row">{row.region}</th>
                        <td>{row.revenue}</td>
                        <td>
                          {actions && (
                            <Button
                              onClick={event =>
                                actions.run('orders', row, event.currentTarget)
                              }
                              aria-label={`Investigate ${row.region}`}
                            >
                              {actions.items(row)[0]?.label}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ),
            },
          ]}
        />
      )}
      <TableWidget
        dataset={regions}
        source={source}
        actions={viewOrders}
        pagination={{ pageSize: 1 }}
        search={{
          label: 'Search regions',
          value: search,
          onChange: setSearch,
          attributes: [{ name: 'region', getter: row => row.region }],
        }}
      />
    </Stack>
  );
}
const sharedOrdersView = defineDataView({
  operation: 'salesOrders',
  dataContext: context,
  input: () => ({
    start: '2026-09-01',
    end: '2026-09-30',
    segment: 'Enterprise',
    region: 'All regions',
  }),
  describeInput: () => 'All enterprise orders in September',
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No shared orders' },
});
const sharedOrders = sharedOrdersView.dataset({
  name: 'Shared orders',
  select: data => data,
  rowKey: row => row.id,
  columns: { order: { value: row => row.id } },
  evidence: { id: 'shared-orders', queryNames: ['contributingOrders'] },
});
const sharedContent = sharedOrdersView.content(source => (
  <TableWidget dataset={sharedOrders} source={source} pagination={false} />
));
function App() {
  return (
    <DataApp
      view={view}
      datasets={[regions]}
      details={[detailContent]}
      story={snapshot => [
        {
          id: 'revenue',
          headline: 'Revenue by region',
          context: view.scope(snapshot),
          visual: <TableWidget dataset={regions} source={snapshot} />,
          evidence: regions,
        },
      ]}
    >
      <DataSection content={content} />
      {new URLSearchParams(location.search).has('shared') && (
        <DataSection content={sharedContent} label="Shared orders" />
      )}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: salesApp, component: App });
