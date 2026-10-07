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
  type DisplayedSnapshot,
  type CsvExport,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  textVariable,
  VisualizationWidget,
} from '@altertable/data-app/react';

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
const ordersPerDayEvidence = orderDataContext.evidence({
  id: 'orders-per-day',
  glossaryIds: ['orders'],
});
const orderValueEvidence = orderDataContext.evidence({
  id: 'order-values',
  glossaryIds: ['orderValue'],
});
const revenueEvidence = orderDataContext.evidence({
  id: 'revenue',
  glossaryIds: ['revenue', 'orders'],
});
const { defineDataView, useView } = createDataHooks(
  createDataClient({ operations })
);
const orderView = defineDataView({
  operation: 'orderOverview',
  variables: {
    country: textVariable({
      key: 'country',
      label: 'Country',
      defaultValue: '',
    }),
  },
  input: ({ country }) => ({ country }),
  describeInput: ({ country }) =>
    country ? `country ${country}` : 'all countries',
  isEmpty: ({ countries }) => countries.length === 0,
  empty: {
    title: 'No matching countries',
    description: 'Enter a country code such as US, or clear the filter.',
  },
});

function OrderResults({
  data,
  country,
}: {
  data: OrderOverview;
  country: string;
}) {
  const { countries, days, bands } = data;
  const { orderCount, revenue } = summarizeOrders(data);
  return (
    <Stack aria-label="Order results">
      <TextContent>
        <h2>Orders</h2>
        <p>
          How much did customers order over the last 30 days, and where does the
          revenue come from? Filter by a country code such as US to compare
          markets.
        </p>
        <p>Showing {country || 'all countries'}</p>
      </TextContent>
      <Grid columns={2}>
        <MetricWidget
          label="Orders"
          description="Orders placed in any status."
          value={orderCount}
          format={{ kind: 'count' }}
        />
        <MetricWidget
          label="Revenue"
          description="Paid and pending orders; refunds excluded."
          value={revenue}
          format={currency}
        />
        <VisualizationWidget
          title="Orders per day"
          description="Daily order count. Days without orders stay on the chart as zero."
          evidence={ordersPerDayEvidence}
          visual={<DailyLineChart days={days} />}
        />
        <VisualizationWidget
          title="Order value"
          description="Share of orders by amount, in $50 bands."
          evidence={orderValueEvidence}
          visual={<OrderValuePieChart bands={bands} />}
          empty={
            bands.length
              ? undefined
              : {
                  title: 'No orders',
                  description: 'No orders in the last 30 days.',
                }
          }
        />
      </Grid>
      <VisualizationWidget
        title="Revenue by country"
        description="Highest revenue first. Countries whose customers placed no orders show $0."
        evidence={revenueEvidence}
        visual={<CountryRanking countries={countries} />}
      />
    </Stack>
  );
}

type OrderSnapshot = DisplayedSnapshot<OrderOverview, { country: string }>;

function exportOrders({
  data: { countries, days, bands },
  input,
}: OrderSnapshot): CsvExport {
  return {
    filename: `orders-${input.country || 'all'}`,
    tables: [
      {
        name: 'Revenue by country',
        columns: ['Country', 'Orders', 'Revenue'],
        rows: countries.map(({ country, orderCount, revenue }) => [
          country,
          orderCount,
          revenue,
        ]),
      },
      {
        name: 'Orders per day',
        columns: ['Day', 'Orders'],
        rows: days.map(({ day, orderCount }) => [day, orderCount]),
      },
      {
        name: 'Orders by value',
        columns: ['Order value', 'Orders'],
        rows: bands.map(({ band, orderCount }) => [band, orderCount]),
      },
    ],
  };
}

function presentOrders({ data, input }: OrderSnapshot) {
  const { countries, days, bands } = data;

  const scope = `Last 30 days in ${input.country || 'all countries'}.`;
  const { leadingCountry, largestValueBand, orderCount } =
    summarizeOrders(data);
  const findings = [];
  if (leadingCountry) {
    findings.push(
      orderDataContext.finding({
        id: 'revenue',
        headline: `${leadingCountry.country} brought in ${formatMetric(leadingCountry.revenue, currency)}`,
        context: scope,
        visual: <CountryRanking countries={countries} />,
        evidence: { id: 'revenue', glossaryIds: ['revenue'] },
      })
    );
  }
  findings.push(
    orderDataContext.finding({
      id: 'orders-per-day',
      headline: `${formatCount(orderCount)} orders over the last 30 days`,
      context: `${scope} ${describeWeeklyOrderTrend(days)}`,
      visual: <DailyLineChart days={days} />,
      evidence: { id: 'orders-per-day', glossaryIds: ['orders'] },
    })
  );
  if (largestValueBand) {
    findings.push(
      orderDataContext.finding({
        id: 'order-values',
        headline: `${largestValueBand.band} is the most common order value`,
        context: `${scope} ${formatPercent(largestValueBand.orderCount / orderCount)} of orders.`,
        visual: <OrderValuePieChart bands={bands} />,
        evidence: { id: 'order-values', glossaryIds: ['orderValue'] },
      })
    );
  }
  return findings;
}

function App() {
  const orderRequest = useView(orderView);
  return (
    <DataApp
      config={appConfig}
      dataContext={orderDataContext}
      request={orderRequest}
      csvExport={exportOrders}
      story={presentOrders}
    >
      {(data, displayedInput) => (
        <OrderResults data={data} country={displayedInput.country} />
      )}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });
