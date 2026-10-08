import { useMemo, useState } from 'react';
import { createDataClient } from '@altertable/data-app/client';
import { DATA_APP_CONFIG } from '@/dev/app';
import {
  formatCount,
  formatMetric,
  formatPercent,
  type MetricFormat,
} from '@altertable/data-app/format';
import {
  createDataContext,
  defineDataIdentifiers,
  TextWidget,
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  TableWidget,
  Button,
  VisualizationWidget,
  type DatasetDefinition,
} from '@altertable/data-app/react';
import { Sheet } from '@altertable/data-app/react/ui';
import { calendar } from '@/dev/commerce';
import {
  operations,
  queryNames,
  summarizeOrders,
  describeWeeklyOrderTrend,
  countryFilter,
  type OrderOverview,
  type OrderInput,
  type Order,
  type OrderItem,
} from '@/dev/orders';
import {
  CountryRanking,
  DailyLineChart,
  OrderValuePieChart,
} from '@/dev/order-charts';

const currency: MetricFormat = { kind: 'currency', currency: 'USD' };
const identifiers = defineDataIdentifiers({
  tables: {
    orders: { catalog: 'memory', schema: 'demo', name: 'orders' },
    customers: { catalog: 'memory', schema: 'demo', name: 'customers' },
    products: { catalog: 'memory', schema: 'demo', name: 'products' },
    items: { catalog: 'memory', schema: 'demo', name: 'order_items' },
  },
  columns: {
    amount: { table: 'orders', name: 'amount' },
    status: { table: 'orders', name: 'status' },
    orderedAt: { table: 'orders', name: 'ordered_at' },
    country: { table: 'customers', name: 'country' },
    quantity: { table: 'items', name: 'quantity' },
    unitPrice: { table: 'items', name: 'unit_price' },
    product: { table: 'products', name: 'name' },
  },
});
const { DataIdentifier } = identifiers;
const orderDataContext = createDataContext(queryNames)({
  identifiers: identifiers.definitions,
  description: (
    <>
      Sample commerce activity in <DataIdentifier id="tables.orders" /> and{' '}
      <DataIdentifier id="tables.customers" />, with product detail from{' '}
      <DataIdentifier id="tables.products" /> and{' '}
      <DataIdentifier id="tables.items" />. The six-month seed models busier
      weekdays, an Autumn essentials campaign, growing French demand, and a
      recent refund increase.
    </>
  ),
  glossary: {
    orders: {
      term: 'Orders',
      definition: (
        <>
          Orders placed within the selected UTC dates using{' '}
          <DataIdentifier id="columns.orders.orderedAt" />, in any status. Days
          and countries without orders count as a measured zero.
        </>
      ),
      queryNames: [
        queryNames.ordersByCountry,
        queryNames.ordersByDay,
        queryNames.previousPeriod,
      ],
    },
    revenue: {
      term: 'Paid revenue',
      definition: (
        <>
          Sum of <DataIdentifier id="columns.orders.amount" /> in USD where{' '}
          <DataIdentifier id="columns.orders.status" /> is paid. Pending and
          refunded orders are excluded; refunds are reported separately.
        </>
      ),
      queryNames: [queryNames.ordersByCountry, queryNames.previousPeriod],
    },
    refunds: {
      term: 'Refunds',
      definition: (
        <>
          Full <DataIdentifier id="columns.orders.amount" /> of refunded orders
          in USD, attributed to <DataIdentifier id="columns.orders.orderedAt" />{' '}
          rather than a refund date.
        </>
      ),
      queryNames: [queryNames.ordersByCountry, queryNames.previousPeriod],
    },
    orderValue: {
      term: 'Order value',
      definition: (
        <>
          Sum of <DataIdentifier id="columns.orders.amount" /> in USD across all
          statuses, including pending and refunded orders. Amounts are derived
          from <DataIdentifier id="columns.items.quantity" /> ×{' '}
          <DataIdentifier id="columns.items.unitPrice" />.
        </>
      ),
      queryNames: [
        queryNames.ordersByCountry,
        queryNames.ordersByValue,
        queryNames.previousPeriod,
      ],
    },
  },
});
const { defineTimeView } = createDataHooks(createDataClient({ operations }));
const orderView = defineTimeView({
  dataContext: orderDataContext,
  operation: 'orderOverview',
  time: {
    contract: calendar,
    defaultValue: { kind: 'preset', id: 'last-30' },
    comparison: true,
  },
  variables: { country: countryFilter },
  isEmpty: ({ countries }) => countries.length === 0,
  emptyFallback: { title: 'No matching countries' },
});
const orderCountMetric = orderView.metric(
  {
    id: 'order-count',
    glossaryId: 'orders',
    label: 'Orders',
    format: { kind: 'count', compact: true },
  },
  data => ({
    current: summarizeOrders(data).orderCount,
    previous: data.previous?.orderCount,
  })
);
const revenueMetric = orderView.metric(
  {
    id: 'order-revenue',
    glossaryId: 'revenue',
    label: 'Paid revenue',
    format: currency,
  },
  data => ({
    current: summarizeOrders(data).revenue,
    previous: data.previous?.revenue,
  })
);
const orderValueMetric = orderView.metric(
  {
    id: 'total-order-value',
    glossaryId: 'orderValue',
    label: 'Order value',
    format: currency,
  },
  data => ({
    current: summarizeOrders(data).orderValue,
    previous: data.previous?.orderValue,
  })
);
const refundsMetric = orderView.metric(
  {
    id: 'refunds',
    glossaryId: 'refunds',
    label: 'Refunds',
    format: currency,
    favorableDirection: 'down',
  },
  data => ({
    current: summarizeOrders(data).refunds,
    previous: data.previous?.refunds,
  })
);
const countryDataset = orderView.dataset({
  name: 'Paid revenue by country',
  select: data => data.countries,
  rowKey: row => row.country,
  evidence: { id: 'revenue', glossaryIds: ['revenue', 'orders'] },
  columns: {
    country: { value: row => row.country },
    orderCount: { label: 'Orders', value: row => row.orderCount },
    revenue: {
      label: 'Paid revenue',
      value: row => row.revenue,
      format: currency,
    },
    orderValue: { value: row => row.orderValue, format: currency },
    refunds: { value: row => row.refunds, format: currency },
  },
});
const dayDataset = orderView.dataset({
  name: 'Orders per day',
  select: data => data.days,
  rowKey: row => row.day,
  evidence: { id: 'orders-per-day', glossaryIds: ['orders'] },
  columns: {
    day: { value: row => row.day },
    orderCount: { label: 'Orders', value: row => row.orderCount },
  },
});
const valueDataset = orderView.dataset({
  name: 'Orders by value',
  select: data => data.bands,
  rowKey: row => row.band,
  evidence: { id: 'order-values', glossaryIds: ['orderValue'] },
  emptyFallback: {
    title: 'No orders',
    description: 'No orders in the selected UTC dates.',
  },
  columns: {
    band: { label: 'Order value', value: row => row.band },
    orderCount: { label: 'Orders', value: row => row.orderCount },
  },
});
const orderDefinition = {
  name: 'Recent orders',
  select: (data: OrderOverview) => data.orders,
  rowKey: (row: Order) => row.id,
  evidence: {
    id: 'order-details',
    queryNames: [queryNames.orders, queryNames.items],
    glossaryIds: ['orders', 'orderValue'] as const,
  },
  emptyFallback: { title: 'No orders in this range' },
  columns: {
    id: { label: 'Order', value: row => row.id },
    day: { label: 'Date', value: row => row.day },
    customer: { value: row => row.customer },
    country: { value: row => row.country },
    status: { value: row => row.status },
    campaign: { value: row => row.campaign },
    amount: {
      label: 'Order value',
      value: row => row.amount,
      format: currency,
    },
  },
} satisfies DatasetDefinition<OrderOverview, OrderInput, Order>;
const ordersDataset = orderView.dataset(orderDefinition);
const itemDefinition = {
  name: 'Items for recent orders',
  select: (data: OrderOverview) => data.items,
  rowKey: (row: OrderItem) => `${row.orderId}:${row.product}`,
  evidence: {
    id: 'order-items',
    queryNames: [queryNames.orders, queryNames.items],
    glossaryIds: ['orders', 'orderValue'] as const,
  },
  emptyFallback: { title: 'No items' },
  columns: {
    orderId: { label: 'Order ID', value: row => row.orderId },
    product: { value: row => row.product },
    category: { value: row => row.category },
    quantity: { value: row => row.quantity },
    unitPrice: { value: row => row.unitPrice, format: currency },
    lineTotal: { value: row => row.quantity * row.unitPrice, format: currency },
  },
} satisfies DatasetDefinition<OrderOverview, OrderInput, OrderItem>;
const itemsDataset = orderView.dataset(itemDefinition);
const periodDataset = orderView.dataset({
  name: 'Period totals',
  select: (data, input) => [
    { period: 'Selected', ...summarizeOrders(data), ...input.period.range },
    ...(data.previous && input.period.comparison
      ? [{ period: 'Previous', ...data.previous, ...input.period.comparison }]
      : []),
  ],
  rowKey: row => row.period,
  evidence: {
    id: 'period-totals',
    glossaryIds: ['orders', 'revenue', 'orderValue', 'refunds'],
  },
  columns: {
    period: { value: row => row.period },
    start: { value: row => row.start },
    end: { value: row => row.end },
    orderCount: { label: 'Orders', value: row => row.orderCount },
    revenue: {
      label: 'Paid revenue',
      value: row => row.revenue,
      format: currency,
    },
    orderValue: { value: row => row.orderValue, format: currency },
    refunds: { value: row => row.refunds, format: currency },
  },
});

type OrderSource = Parameters<Parameters<typeof orderView.content>[0]>[0];

function OrderResults({ result }: { result: OrderSource }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const selectedOrder = result.loading
    ? undefined
    : result.data.orders.find(order => order.id === selectedId);
  const tableDataset = useMemo(
    () =>
      orderView.dataset({
        ...orderDefinition,
        columns: {
          ...orderDefinition.columns,
          id: {
            label: 'Order',
            value: row => row.id,
            format: row => (
              <Button variant="ghost" onClick={() => setSelectedId(row.id)}>
                #{row.id}
              </Button>
            ),
          },
        },
      }),
    []
  );
  const detailDataset = useMemo(
    () =>
      orderView.dataset<OrderItem>({
        ...itemDefinition,
        name: 'Products',
        select: data => data.items.filter(item => item.orderId === selectedId),
      }),
    [selectedId]
  );
  return (
    <Stack aria-label="Order results">
      <TextWidget
        title="What the selected period shows"
        dataset={countryDataset}
        source={result}
      >
        {countries => {
          const count = countries.reduce((sum, row) => sum + row.orderCount, 0);
          const paid = countries.reduce((sum, row) => sum + row.revenue, 0);
          const leading = countries[0];
          return (
            <p>
              {count === 0
                ? 'No orders were placed in this scope; the zero values below are measured.'
                : paid > 0 && leading
                  ? `${leading.country} contributes ${formatPercent(leading.revenue / paid)} of paid revenue across ${formatCount(count, { compact: true })} orders. Compare periods to see how sales and refunds change.`
                  : `${formatCount(count, { compact: true })} orders were placed, with no paid revenue in this scope.`}
            </p>
          );
        }}
      </TextWidget>
      <Grid columns={2}>
        <MetricWidget
          metric={orderCountMetric}
          source={result}
          description="Orders placed in any status."
        />
        <MetricWidget
          metric={revenueMetric}
          source={result}
          description="Paid orders only; pending and refunded orders excluded."
        />
        <MetricWidget
          metric={orderValueMetric}
          source={result}
          description="All statuses, including pending orders and refunds."
        />
        <MetricWidget
          metric={refundsMetric}
          source={result}
          description="Refunded order value, attributed to the order date."
        />
        <VisualizationWidget
          title="Orders per day"
          description="Daily order count. Days without orders stay on the chart as zero."
          dataset={dayDataset}
          source={result}
        >
          {days => <DailyLineChart days={days} />}
        </VisualizationWidget>
        <VisualizationWidget
          title="Order value"
          description="Share of orders by amount, in value bands."
          dataset={valueDataset}
          source={result}
        >
          {bands => <OrderValuePieChart bands={bands} />}
        </VisualizationWidget>
      </Grid>
      <VisualizationWidget
        title="Paid revenue by country"
        description="Highest paid revenue first. Countries whose customers placed no orders show $0."
        dataset={countryDataset}
        source={result}
        skeleton={{ variant: 'ranking', rows: 5 }}
      >
        {countries => <CountryRanking countries={countries} />}
      </VisualizationWidget>
      <TableWidget
        dataset={tableDataset}
        source={result}
        description="Latest 100 orders in the selected range. Select an order to inspect its products."
        pagination={{ pageSize: 10 }}
        search={{
          label: 'Search recent orders',
          value: search,
          onChange: setSearch,
          attributes: [
            { name: 'order', getter: order => String(order.id) },
            { name: 'customer', getter: order => order.customer },
            { name: 'country', getter: order => order.country },
            { name: 'status', getter: order => order.status },
            { name: 'campaign', getter: order => order.campaign },
          ],
        }}
      />
      <Sheet
        open={!!selectedOrder}
        onOpenChange={open => {
          if (!open) setSelectedId(null);
        }}
        title={`Order #${selectedOrder?.id ?? ''}`}
        description={
          selectedOrder
            ? `${selectedOrder.customer} · ${selectedOrder.country} · ${selectedOrder.day} · ${selectedOrder.status}`
            : undefined
        }
      >
        {selectedOrder && (
          <Stack>
            <TextContent>
              <p>
                {selectedOrder.campaign} ·{' '}
                {formatMetric(selectedOrder.amount, currency)} total order
                value.
              </p>
            </TextContent>
            <TableWidget
              dataset={detailDataset}
              description="Items in this order. CSV export includes all items for the latest 100 orders in scope."
              source={result}
              pagination={false}
            />
          </Stack>
        )}
      </Sheet>
    </Stack>
  );
}
const orderContent = orderView.content(result => (
  <OrderResults key={JSON.stringify(result.input)} result={result} />
));
type OrderSnapshot = Parameters<typeof orderView.scope>[0];
function presentOrders(snapshot: OrderSnapshot) {
  const { data, input } = snapshot;
  const { countries, days, bands } = data;
  const scope = orderView.scope(snapshot);
  const { leadingCountry, largestValueBand, orderCount } =
    summarizeOrders(data);
  const findings = [];
  if (data.previous && input.period.comparison) {
    const current = summarizeOrders(data);
    const change =
      data.previous.revenue > 0
        ? (current.revenue - data.previous.revenue) / data.previous.revenue
        : null;
    findings.push({
      id: 'period-comparison',
      headline:
        change === null
          ? `Paid revenue reached ${formatMetric(current.revenue, currency)}`
          : `Paid revenue ${change >= 0 ? 'rose' : 'fell'} ${formatPercent(Math.abs(change))} against the previous period`,
      context: `${scope}. Compared with ${calendar.describeInput(input.period.comparison)}.`,
      visual: (
        <Grid columns={2}>
          <MetricWidget metric={revenueMetric} source={snapshot} />
          <MetricWidget metric={refundsMetric} source={snapshot} />
        </Grid>
      ),
      evidence: periodDataset,
    });
  }
  if (leadingCountry && leadingCountry.revenue > 0)
    findings.push({
      id: 'revenue',
      headline: `${leadingCountry.country} earned paid revenue of ${formatMetric(leadingCountry.revenue, currency)}`,
      context: scope,
      visual: <CountryRanking countries={countries} />,
      evidence: countryDataset,
    });
  findings.push({
    id: 'orders-per-day',
    headline: `${formatMetric(orderCount, orderCountMetric.definition.format)} orders over the selected UTC dates`,
    context: `${scope}. ${describeWeeklyOrderTrend(days)}`,
    visual: <DailyLineChart days={days} />,
    evidence: dayDataset,
  });
  if (largestValueBand)
    findings.push({
      id: 'order-values',
      headline: `${largestValueBand.band} is the most common order value`,
      context: `${scope}. ${formatPercent(largestValueBand.orderCount / orderCount)} of orders.`,
      visual: <OrderValuePieChart bands={bands} />,
      evidence: valueDataset,
    });
  return findings;
}
function App() {
  return (
    <DataApp
      config={DATA_APP_CONFIG}
      view={orderView}
      datasets={[
        countryDataset,
        dayDataset,
        valueDataset,
        ordersDataset,
        itemsDataset,
        periodDataset,
      ]}
      story={presentOrders}
    >
      <DataSection content={orderContent} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: DATA_APP_CONFIG, component: App });
