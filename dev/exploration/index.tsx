import { createDataClient } from '@altertable/data-app/client';
import {
  formatCount,
  formatMetric,
  formatPercent,
} from '@altertable/data-app/format';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  MetricWidget,
  Stack,
  TableWidget,
  TextContent,
  TextWidget,
  VisualizationWidget,
  Button,
  dateRangeVariable,
  injectDataAppStyles,
  mountDataApp,
  useDetailNavigation,
} from '@altertable/data-app/react';
import { BarChart, LineChart, PieChart } from '@altertable/data-app/react/ui';
import {
  app,
  calendar,
  region,
  country,
  customer,
  breakdownOptions,
  placeFilter,
  revenueBy,
  ordersBy,
  operations,
  scopeForPlace,
  type RecordsInput,
  type Place,
} from '@/dev/exploration/data';

const client = createDataClient<typeof operations>();
const hooks = createDataHooks(client);
const currency = { kind: 'currency', currency: 'USD' } as const;
function dollars(value: number) {
  return formatMetric(value, currency);
}
function describeScope(
  input: RecordsInput | Parameters<typeof operations.overview.run>[1]
) {
  const labels = [
    region.describe(input.region),
    country.describe(input.country),
    customer.describe(input.customer),
  ].filter(
    (_, index) =>
      [input.region, input.country, input.customer][index]!.kind !== 'all'
  );
  return `${calendar.describeInput(input.period.range)} · ${labels.join(' · ') || 'All customers'}${'day' in input && input.day ? ` · ${input.day}` : ''}`;
}
const context = createDataContext(operations.overview.queryNames)({
  description:
    'Deterministic sample-store orders for October 1–14, 2026. Every chart and record query includes paid orders only. Refunded orders are excluded.',
  glossary: {
    revenue: {
      term: 'Paid revenue',
      definition:
        'The sum of paid order amounts in USD, attributed to the order date. Refunded orders are excluded. This is sample data.',
      queryNames: ['totals', 'places', 'days'],
    },
    orders: {
      term: 'Paid orders',
      definition:
        'One record per paid order in the selected dates and filters. Its contributing records use exactly the same inclusion rule.',
      queryNames: ['totals', 'places', 'days'],
    },
    customers: {
      term: 'Paying customers',
      definition:
        'Distinct customers with at least one paid order in scope. Customers are counted once across the period, so daily counts would not be additive.',
      queryNames: ['totals'],
    },
  },
});
const recordsContext = createDataContext(operations.records.queryNames)({
  description: context.description,
  glossary: {
    revenue: { ...context.glossary.revenue, queryNames: ['records'] },
    orders: { ...context.glossary.orders, queryNames: ['records'] },
    customers: { ...context.glossary.customers, queryNames: ['records'] },
  },
});
const view = hooks.defineDataView({
  operation: 'overview',
  dataContext: context,
  variables: {
    period: dateRangeVariable({
      key: 'period',
      label: 'Period',
      contract: calendar,
      defaultValue: { kind: 'dates', start: '2026-10-01', end: '2026-10-14' },
    }),
    region,
    country,
    customer,
    revenueBy,
    ordersBy,
  },
  describeInput: describeScope,
  isEmpty: data => data.totals.orders === 0,
  emptyFallback: {
    title: 'No paid orders',
    description: 'Choose another period or clear the filters.',
  },
});
const recordsView = hooks.defineDetailView({
  id: 'paid-orders',
  title: 'Contributing paid orders',
  operation: 'records',
  dataContext: recordsContext,
  parseInput: operations.records.input,
  describeInput: describeScope,
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No paid orders in this scope' },
});
const orderView = hooks.defineDetailView({
  id: 'order',
  title: 'Order detail',
  operation: 'records',
  dataContext: recordsContext,
  parseInput(value) {
    const input = operations.records.input(value);
    if (input.orderId === undefined) throw new Error('Choose an order.');
    return input;
  },
  describeInput: input => `Order #${input.orderId} · ${describeScope(input)}`,
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'This order is outside the selected scope' },
});
const recordColumns = {
  id: { label: 'Order', value: (row: Order) => row.id },
  day: {
    label: 'Date',
    value: (row: Order) => row.day,
    format: { kind: 'date' } as const,
  },
  customer: { label: 'Customer', value: (row: Order) => row.customer },
  country: { label: 'Country', value: (row: Order) => row.country },
  amount: {
    label: 'Paid amount',
    value: (row: Order) => row.amount,
    format: currency,
  },
};
type Order = Awaited<ReturnType<typeof operations.records.run>>['rows'][number];
const orderDataset = orderView.dataset<Order>({
  name: 'Order',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: recordColumns,
  evidence: { id: 'order', glossaryIds: ['orders', 'revenue'] },
});
const orderDetail = orderView.content(source => (
  <TableWidget dataset={orderDataset} source={source} pagination={false} />
));
type RecordSource = Parameters<Parameters<typeof recordsView.content>[0]>[0];
function ContributingOrders({ source }: { source: RecordSource }) {
  const navigation = useDetailNavigation();
  const dataset = recordsView.dataset<Order>({
    name: 'Paid orders',
    select: data => data.rows,
    rowKey: row => row.id,
    columns: {
      ...recordColumns,
      id: {
        ...recordColumns.id,
        format: (row: Order) => (
          <Button
            variant="inline"
            onClick={event => {
              if (!source.loading)
                navigation.open(
                  orderView,
                  { ...source.input, orderId: row.id },
                  event.currentTarget
                );
            }}
          >
            #{row.id}
          </Button>
        ),
      },
    },
    evidence: { id: 'paid-orders', glossaryIds: ['orders', 'revenue'] },
  });
  return (
    <Stack>
      <TextContent>
        <p>
          {source.loading
            ? 'Loading contributing orders…'
            : source.data.total > source.data.rows.length
              ? `Showing ${source.data.rows.length} of ${source.data.total} paid orders. This view is limited to 200 records.`
              : `All ${formatCount(source.data.total)} matching paid orders are included.`}{' '}
          Select an order number for its details.
        </p>
      </TextContent>
      <TableWidget
        dataset={dataset}
        source={source}
        pagination={{ pageSize: 10 }}
      />
    </Stack>
  );
}
const recordsDetail = recordsView.content(source => (
  <ContributingOrders source={source} />
));
const revenue = view.metric(
  { id: 'revenue', glossaryId: 'revenue', format: currency },
  data => ({ current: data.totals.revenue })
);
const paidOrders = view.metric(
  { id: 'orders', glossaryId: 'orders', format: { kind: 'count' } },
  data => ({ current: data.totals.orders })
);
const customers = view.metric(
  { id: 'customers', glossaryId: 'customers', format: { kind: 'count' } },
  data => ({ current: data.totals.customers })
);
const revenueRecords = revenue.records({
  target: recordsView,
  input: input => ({
    period: input.period,
    region: input.region,
    country: input.country,
    customer: input.customer,
    day: undefined,
    orderId: undefined,
  }),
});
const orderRecords = paidOrders.records({
  target: recordsView,
  input: input => ({
    period: input.period,
    region: input.region,
    country: input.country,
    customer: input.customer,
    day: undefined,
    orderId: undefined,
  }),
});
const columns = {
  place: { value: (row: Place) => row.label },
  revenue: {
    label: 'Paid revenue',
    value: (row: Place) => row.revenue,
    format: currency,
  },
  orders: { label: 'Paid orders', value: (row: Place) => row.orders },
};
const revenuePlaces = view.dataset<Place>({
  name: 'Revenue breakdown',
  select: data => data.revenue,
  rowKey: row => row.id,
  columns,
  evidence: { id: 'revenue-breakdown', glossaryIds: ['revenue'] },
});
const orderPlaces = view.dataset<Place>({
  name: 'Order breakdown',
  select: data => data.orders,
  rowKey: row => row.id,
  columns,
  evidence: { id: 'order-breakdown', glossaryIds: ['orders'] },
});
const days = view.dataset({
  name: 'Paid revenue per day',
  select: data => data.days,
  rowKey: row => row.day,
  columns: {
    day: { value: row => row.day, format: { kind: 'date' } },
    orders: { label: 'Paid orders', value: row => row.orders },
    revenue: {
      label: 'Paid revenue',
      value: row => row.revenue,
      format: currency,
    },
  },
  evidence: { id: 'daily-revenue', glossaryIds: ['revenue', 'orders'] },
});
const totals = view.dataset({
  name: 'Scope totals',
  select: data => [data.totals],
  rowKey: () => 'total',
  columns: {
    revenue: {
      label: 'Paid revenue',
      value: row => row.revenue,
      format: currency,
    },
    orders: { label: 'Paid orders', value: row => row.orders },
    customers: { label: 'Paying customers', value: row => row.customers },
  },
  evidence: { id: 'totals', glossaryIds: ['revenue', 'orders', 'customers'] },
});
const revenueActions = revenuePlaces.actions(
  action => ({
    orders: action.detail({
      label: 'View paid orders',
      target: recordsView,
      input: (row, input) => scopeForPlace(input, row),
    }),
    filter: action.filter({
      label: 'Filter to this value',
      target: view.filter(),
      values: placeFilter,
    }),
    drill: action.filter({
      label: 'Drill down',
      when: row => row.dimension !== 'customer',
      target: view.filter(),
      values: placeFilter,
      breakdown: {
        target: view.breakdown('revenueBy'),
        value: row => (row.dimension === 'region' ? 'country' : 'customer'),
      },
    }),
  }),
  { primary: 'orders' }
);
const orderActions = orderPlaces.actions(
  action => ({
    orders: action.detail({
      label: 'View paid orders',
      target: recordsView,
      input: (row, input) => scopeForPlace(input, row),
    }),
    drill: action.filter({
      label: 'Drill down',
      when: row => row.dimension !== 'customer',
      target: view.filter(),
      values: placeFilter,
      breakdown: {
        target: view.breakdown('ordersBy'),
        value: row => (row.dimension === 'region' ? 'country' : 'customer'),
      },
    }),
    filter: action.filter({
      label: 'Filter to this value',
      target: view.filter(),
      values: placeFilter,
    }),
  }),
  { primary: 'orders' }
);
const dayActions = days.actions(action => ({
  orders: action.detail({
    label: 'View paid orders for this day',
    target: recordsView,
    input: (row, input) => ({
      period: input.period,
      region: input.region,
      country: input.country,
      customer: input.customer,
      day: row.day,
      orderId: undefined,
    }),
  }),
}));
const content = view.content(source => (
  <Stack>
    <TextWidget
      title="What this scope shows"
      dataset={revenuePlaces}
      source={source}
    >
      {rows => {
        const leader = rows[0];
        const total = rows.reduce((sum, row) => sum + row.revenue, 0);
        return (
          <p>
            {leader
              ? `${leader.label} contributes ${formatPercent(leader.revenue / total)} of ${dollars(total)} in paid revenue. Change either chart’s breakdown to compare the same population by another dimension.`
              : 'No paid revenue in this scope.'}
          </p>
        );
      }}
    </TextWidget>
    <Grid columns={3}>
      <MetricWidget
        metric={revenue}
        source={source}
        records={revenueRecords}
        description="Paid orders only. Explore the title to see contributing records."
      />
      <MetricWidget
        metric={paidOrders}
        source={source}
        records={orderRecords}
        description="Every contributing paid order, counted once."
      />
      <MetricWidget
        metric={customers}
        source={source}
        description="Distinct customers with a paid order in this scope."
      />
    </Grid>
    <Grid columns={2}>
      <VisualizationWidget
        dataset={revenuePlaces}
        source={source}
        actions={revenueActions}
        breakdown={view.breakdown('revenueBy')}
        title={
          source.loading
            ? 'Paid revenue'
            : `Paid revenue by ${breakdownOptions.find(option => option.id === source.input.revenueBy)!.label.toLowerCase()}`
        }
        description="Select a bar to see its paid orders, or open its label menu."
      >
        {(rows, actions) => (
          <BarChart
            ariaLabel="Paid revenue by place"
            unit="USD"
            items={rows.map(row => ({ ...row, value: row.revenue }))}
            itemActions={actions}
            formatValue={dollars}
          />
        )}
      </VisualizationWidget>
      <VisualizationWidget
        dataset={orderPlaces}
        source={source}
        actions={orderActions}
        breakdown={view.breakdown('ordersBy')}
        title={
          source.loading
            ? 'Paid orders'
            : `Paid orders by ${breakdownOptions.find(option => option.id === source.input.ordersBy)!.label.toLowerCase()}`
        }
        description="Select a slice for its orders. Open a legend row for exploration and copy actions."
      >
        {(rows, actions) => (
          <PieChart
            ariaLabel="Paid order shares"
            unit="orders"
            items={rows.map(row => ({ ...row, value: row.orders }))}
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
    </Grid>
    <VisualizationWidget
      dataset={days}
      source={source}
      actions={dayActions}
      description="Daily paid revenue, including zero-activity days. Select a day to inspect its orders."
    >
      {(rows, actions) => (
        <LineChart
          ariaLabel="Daily paid revenue"
          unit="USD"
          items={rows.map(row => ({
            ...row,
            id: row.day,
            label: row.day,
            value: row.revenue,
          }))}
          itemActions={actions}
          formatValue={dollars}
        />
      )}
    </VisualizationWidget>
  </Stack>
));
function App() {
  return (
    <DataApp
      view={view}
      datasets={[totals, revenuePlaces, orderPlaces, days]}
      details={[recordsDetail, orderDetail]}
      footer={
        <p>
          Sample data · October 1–14, 2026 · USD · UTC. Every display includes
          paid orders only. Refunds are excluded. Record inspection shows all
          matching orders, with a visible limit if more than 200 match.
        </p>
      }
      story={snapshot => {
        const leader = snapshot.data.revenue[0];
        return [
          {
            id: 'overview',
            headline: `${dollars(snapshot.data.totals.revenue)} from ${formatCount(snapshot.data.totals.orders)} paid orders`,
            context: describeScope(snapshot.input),
            visual: (
              <Grid columns={2}>
                <MetricWidget metric={revenue} source={snapshot} />
                <MetricWidget metric={paidOrders} source={snapshot} />
              </Grid>
            ),
            evidence: totals,
          },
          ...(leader
            ? [
                {
                  id: 'leader',
                  headline: `${leader.label} leads paid revenue`,
                  context: `${dollars(leader.revenue)} in the displayed breakdown. ${describeScope(snapshot.input)}`,
                  visual: (
                    <TableWidget
                      dataset={revenuePlaces}
                      source={snapshot}
                      pagination={false}
                    />
                  ),
                  evidence: revenuePlaces,
                },
              ]
            : []),
        ];
      }}
    >
      <Stack>
        <TextContent>
          <p>
            <strong>Try it:</strong> select a revenue bar to see its orders, use
            Filters to narrow the shared population, or change a chart’s
            breakdown independently. Explore a metric title for Records,
            Glossary, and Queries.
          </p>
        </TextContent>
        <DataSection content={content} />
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
