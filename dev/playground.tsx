import { createDataClient } from '@altertable/data-app/client';
import type { DataAppConfig } from '@altertable/data-app/config';
import {
  formatCount,
  formatMetric,
  formatPercent,
  type MetricFormat,
} from '@altertable/data-app/format';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  DataValue,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  textVariable,
  VisualizationWidget,
} from '@altertable/data-app/react';
import { type DataContentState } from '@/src/react/content';
import { type DisplayedSnapshot } from '@/src/core/data-view';

import {
  operations,
  queryNames,
  summarizeOrders,
  describeWeeklyOrderTrend,
  type OrderOverview,
} from '@/dev/orders';
import {
  CountryRanking,
  DailyLineChart,
  OrderValuePieChart,
} from '@/dev/order-charts';

const currency: MetricFormat = { kind: 'currency', currency: 'USD' };
const appConfig: DataAppConfig = {
  title: 'Orders',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
};
const orderDataContext = createDataContext(queryNames)({
  description:
    'Orders and customers from the demo schema seeded for local development, over the last 30 days. Replace them with inspected source data before publishing findings.',
  glossary: {
    orders: {
      term: 'Orders',
      definition:
        'Orders placed in the last 30 days, in any status. Days and countries without orders count as a measured zero.',
      queryNames: [queryNames.ordersByCountry, queryNames.ordersByDay],
    },
    revenue: {
      term: 'Revenue',
      definition: 'Order amounts in USD, excluding refunded orders.',
      queryNames: [queryNames.ordersByCountry],
    },
    orderValue: {
      term: 'Order value',
      definition:
        'The order amount in USD, grouped into $50 bands. Refunded orders are included.',
      queryNames: [queryNames.ordersByValue],
    },
  },
});
const ordersPerDayEvidence = {
  id: 'orders-per-day',
  glossaryIds: ['orders'],
} as const;
const orderValueEvidence = {
  id: 'order-values',
  glossaryIds: ['orderValue'],
} as const;
const revenueEvidence = {
  id: 'revenue',
  glossaryIds: ['revenue', 'orders'],
} as const;
const { defineDataView } = createDataHooks(createDataClient({ operations }));
const orderView = defineDataView({
  dataContext: orderDataContext,
  operation: 'orderOverview',
  variables: {
    country: textVariable({
      key: 'country',
      label: 'Country',
      defaultValue: '',
    }),
  },
  describeInput: ({ country }) =>
    country ? `country ${country}` : 'all countries',
  isEmpty: ({ countries }) => countries.length === 0,
  emptyFallback: {
    title: 'No matching countries',
    description: 'Enter a country code such as US, or clear the filter.',
  },
});

const orderCountMetric = orderView.metric(
  {
    id: 'order-count',
    glossaryId: 'orders',
    label: 'Orders',
    format: { kind: 'count' },
  },
  data => ({ current: summarizeOrders(data).orderCount })
);
const revenueMetric = orderView.metric(
  {
    id: 'order-revenue',
    glossaryId: 'revenue',
    label: 'Revenue',
    format: currency,
  },
  data => ({ current: summarizeOrders(data).revenue })
);
function OrderResults({
  result,
}: {
  result: DataContentState<OrderOverview, { country: string }>;
}) {
  return (
    <Stack aria-label="Order results">
      <TextContent>
        <h2>Orders</h2>
        <p>
          How much did customers order over the last 30 days, and where does the
          revenue come from? Filter by a country code such as US to compare
          markets.
        </p>
        <p>
          Showing <DataValue scope={result.scope} />
        </p>
      </TextContent>
      <Grid columns={2}>
        <MetricWidget
          metric={orderCountMetric}
          description="Orders placed in any status."
          source={result}
        />
        <MetricWidget
          metric={revenueMetric}
          description="Paid and pending orders; refunds excluded."
          source={result}
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
          description="Share of orders by amount, in $50 bands."
          dataset={valueDataset}
          source={result}
        >
          {bands => <OrderValuePieChart bands={bands} />}
        </VisualizationWidget>
      </Grid>
      <VisualizationWidget
        title="Revenue by country"
        description="Highest revenue first. Countries whose customers placed no orders show $0."
        dataset={countryDataset}
        source={result}
        skeleton={{ variant: 'ranking', rows: 5 }}
      >
        {countries => <CountryRanking countries={countries} />}
      </VisualizationWidget>
    </Stack>
  );
}
const orderContent = orderView.content(result => (
  <OrderResults result={result} />
));

type OrderSnapshot = DisplayedSnapshot<OrderOverview, { country: string }>;

const countryDataset = orderView.dataset({
  name: 'Revenue by country',
  select: data => data.countries,
  rowKey: row => row.country,
  evidence: revenueEvidence,
  columns: {
    country: { value: row => row.country },
    orderCount: { label: 'Orders', value: row => row.orderCount },
    revenue: { value: row => row.revenue, format: currency },
  },
});
const dayDataset = orderView.dataset({
  name: 'Orders per day',
  select: data => data.days,
  rowKey: row => row.day,
  evidence: ordersPerDayEvidence,
  columns: {
    day: { value: row => row.day },
    orderCount: { label: 'Orders', value: row => row.orderCount },
  },
});
const valueDataset = orderView.dataset({
  name: 'Orders by value',
  select: data => data.bands,
  rowKey: row => row.band,
  evidence: orderValueEvidence,
  columns: {
    band: { label: 'Order value', value: row => row.band },
    orderCount: { label: 'Orders', value: row => row.orderCount },
  },
});

function presentOrders({ data, input }: OrderSnapshot) {
  const { countries, days, bands } = data;

  const scope = `Last 30 days in ${input.country || 'all countries'}.`;
  const { leadingCountry, largestValueBand, orderCount } =
    summarizeOrders(data);
  const findings = [];
  if (leadingCountry) {
    findings.push({
      id: 'revenue',
      headline: `${leadingCountry.country} brought in ${formatMetric(leadingCountry.revenue, currency)}`,
      context: scope,
      visual: <CountryRanking countries={countries} />,
      evidence: countryDataset,
    });
  }
  findings.push({
    id: 'orders-per-day',
    headline: `${formatCount(orderCount)} orders over the last 30 days`,
    context: `${scope} ${describeWeeklyOrderTrend(days)}`,
    visual: <DailyLineChart days={days} />,
    evidence: dayDataset,
  });
  if (largestValueBand) {
    findings.push({
      id: 'order-values',
      headline: `${largestValueBand.band} is the most common order value`,
      context: `${scope} ${formatPercent(largestValueBand.orderCount / orderCount)} of orders.`,
      visual: <OrderValuePieChart bands={bands} />,
      evidence: valueDataset,
    });
  }
  return findings;
}

function App() {
  return (
    <DataApp
      config={appConfig}
      view={orderView}
      datasets={[countryDataset, dayDataset, valueDataset]}
      story={presentOrders}
    >
      <DataSection content={orderContent} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });
