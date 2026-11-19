import { defineDataApp } from '@altertable/data-app';
import {
  Button,
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  injectDataAppStyles,
  MetricWidget,
  mountDataApp,
  Stack,
  TableWidget,
  TextContent,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import type { QueryResult } from '@altertable/data-app/contract';
// A real SDK app with an injected dummy lakehouse. No account or credentials needed.
const dataApp = defineDataApp({
  title: 'Widget loading lab',
  description:
    'Dummy store data · independent requests with different response times.',
  scope: { organization: 'demo', environment: 'loading-lab' },
  queries: {
    revenue: {
      statement: 'SELECT 48250 AS revenue',
      params: {},
      projections: { revenue: { type: 'number' } },
    },
    orders: {
      statement: 'SELECT 1248 AS orders',
      params: {},
      projections: { orders: { type: 'number' } },
    },
    recent: {
      statement: "SELECT 'Northstar' AS customer, 120 AS amount",
      params: {},
      projections: { customer: { type: 'string' }, amount: { type: 'number' } },
    },
  },
});
const policy = { maxQueryRows: 5, maxDurationMs: 30_000 };
const operations = {
  revenue: dataApp.defineOperation({
    policy,
    async run({ query }) {
      return (await query('revenue', {})).rows[0]!.revenue;
    },
  }),
  orders: dataApp.defineOperation({
    policy,
    async run({ query }) {
      return (await query('orders', {})).rows[0]!.orders;
    },
  }),
  recent: dataApp.defineOperation({
    policy,
    async run({ query }) {
      return (await query('recent', {})).rows;
    },
  }),
};

type QueryName = keyof typeof operations;
const delays = { revenue: 1500, orders: 3500, recent: 5500 };
const versions = { revenue: 0, orders: 0, recent: 0 };
const client = createDataClient({
  operations,
  lakehouse: {
    async queryAll(statement, { signal }) {
      const name: QueryName = statement.includes('AS revenue')
        ? 'revenue'
        : statement.includes('AS orders')
          ? 'orders'
          : 'recent';
      signal.throwIfAborted();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', abort);
          resolve();
        }, delays[name]);
        function abort() {
          clearTimeout(timer);
          reject(signal.reason);
        }
        signal.addEventListener('abort', abort, { once: true });
      });
      const version = versions[name]++;
      const result: QueryResult =
        name === 'recent'
          ? {
              columns: [{ name: 'customer' }, { name: 'amount' }],
              rows: [
                'Northstar',
                'Acme Studio',
                'Juniper',
                'Orbit Labs',
                'Forma',
              ].map((customer, index) => [
                customer,
                120 + index * 37 + version * 4,
              ]),
            }
          : {
              columns: [{ name }],
              rows: [
                [
                  name === 'revenue'
                    ? 48250 + version * 420
                    : 1248 + version * 12,
                ],
              ],
            };
      return result;
    },
  },
});
const context = createDataContext({
  ...operations.revenue.queryNames,
  ...operations.orders.queryNames,
  ...operations.recent.queryNames,
})({
  description: 'Fictional store figures for inspecting loading behavior.',
  glossary: {
    revenue: {
      term: 'Revenue',
      definition: 'Fictional payments received, in euros.',
      queryNames: ['revenue'],
    },
    orders: {
      term: 'Orders',
      definition: 'Fictional number of completed purchases.',
      queryNames: ['orders'],
    },
  },
});
const { defineView } = createDataHooks(client);
const revenueView = defineView({ operation: 'revenue', dataContext: context });
const ordersView = defineView({ operation: 'orders', dataContext: context });
const recentView = defineView({ operation: 'recent', dataContext: context });
const revenue = revenueView.metric(
  {
    id: 'revenue',
    glossaryId: 'revenue',
    label: 'Revenue',
    format: { kind: 'currency', currency: 'EUR' },
  },
  current => ({ current })
);
const orders = ordersView.metric(
  {
    id: 'orders',
    glossaryId: 'orders',
    label: 'Orders',
    format: { kind: 'count' },
  },
  current => ({ current })
);
const recent = recentView.dataset({
  name: 'Recent orders',
  select: rows => rows,
  rowKey: row => row.customer,
  columns: {
    customer: { label: 'Customer', value: row => row.customer },
    amount: {
      label: 'Amount',
      value: row => row.amount,
      format: { kind: 'currency', currency: 'EUR' },
    },
  },
  evidence: { id: 'recent', queryNames: ['recent'] },
});

const revenueContent = revenueView.content(source => (
  <MetricWidget
    metric={revenue}
    source={source}
    description="Payments received · 1.5 s response"
  />
));
const ordersContent = ordersView.content(source => (
  <MetricWidget
    metric={orders}
    source={source}
    description="Completed purchases · 3.5 s response"
  />
));
const recentContent = recentView.content(source => (
  <TableWidget
    dataset={recent}
    source={source}
    description="Latest purchases · 5.5 s response"
    pagination={false}
  />
));
function App() {
  return (
    <DataApp
      view={revenueView}
      summaryViews={[ordersView, recentView]}
      toolbarActions={
        <Button onClick={() => window.location.reload()}>
          Replay initial load
        </Button>
      }
      showSearch={false}
      showFilters={false}
    >
      <Stack>
        <TextContent>
          <p>
            Refresh data to run all three requests. Each widget marks its
            results as updating until its own request finishes.
          </p>
        </TextContent>
        <Grid columns={2}>
          <DataSection content={revenueContent} />
          <DataSection content={ordersContent} />
        </Grid>
        <DataSection content={recentContent} />
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
