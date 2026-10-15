import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  VisualizationWidget,
  MetricWidget,
  TableWidget,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
  searchVariable,
} from '@altertable/data-app/react';
import {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ExplorationActionControl,
} from '@altertable/data-app/react/ui';

const app = defineDataApp({
  title: 'Exploration',
  description: 'Explore orders by place.',
  scope: { organization: 'test', environment: 'test' },
  queries: {
    countries: {
      statement:
        'SELECT value, label FROM countries WHERE region = $region AND ($member IS NULL OR value = $member)',
      params: { member: {}, region: {} },
    },
    sales: { statement: 'SELECT sales', params: {} },
    orders: { statement: 'SELECT orders', params: {} },
  },
});
const geography = app.defineHierarchy({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [
        { value: 'eu', label: 'Europe' },
        { value: 'us', label: 'America' },
      ],
    },
    {
      id: 'country',
      label: 'Country',
      valueType: 'string',
      source: { query: 'countries' },
    },
  ],
});
const revenueBy = geography.breakdown({
  key: 'revenue-by',
  label: 'Revenue breakdown',
});
const ordersBy = geography.breakdown({
  key: 'orders-by',
  label: 'Orders breakdown',
});
const search = searchVariable({ key: 'q', label: 'Search' });
const parseInput = geography.input(
  (value: unknown) => {
    const input = value as { search: unknown };
    if (!input || typeof input.search !== 'string')
      throw new Error('Invalid search');
    return { search: input.search };
  },
  { breakdowns: { revenueBy, ordersBy } }
);
type Input = ReturnType<typeof parseInput>;
type Row = {
  id: string;
  label: string;
  revenue: number;
  level: 'region' | 'country';
};
const parseOrders = geography.input((value: unknown) => {
  const input = value as { placeId?: unknown; search?: unknown };
  if (
    !input ||
    (input.placeId !== undefined && typeof input.placeId !== 'string')
  )
    throw new Error('Invalid place');
  return {
    placeId: input.placeId as string | undefined,
    search: typeof input.search === 'string' ? input.search : '',
  };
});
const operations = {
  sales: app.defineOperation({
    input: parseInput,
    checks: [
      {
        search: '',
        geography: geography.defaultValue,
        revenueBy: 'region',
        ordersBy: 'region',
      } as Input,
    ],
    policy: { maxQueryRows: 200, maxDurationMs: 10000 },
    async run({ query, signal }, input) {
      await query('sales');
      if (input.search === 'delay')
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 600);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true }
          );
        });
      function rows(by: typeof revenueBy): Row[] {
        const level = by.level(
          input[by === revenueBy ? 'revenueBy' : 'ordersBy'],
          input.geography
        ).id;
        return level === 'region'
          ? [
              { id: 'eu', label: 'Europe', revenue: 10, level },
              { id: 'us', label: 'America', revenue: 5, level },
            ]
          : [{ id: 'fr', label: 'France', revenue: 10, level }];
      }
      return { revenue: rows(revenueBy), orders: rows(ordersBy), input };
    },
  }),
  orders: app.defineOperation({
    input: parseOrders,
    checks: [
      { geography: geography.defaultValue, placeId: undefined, search: '' },
    ],
    policy: { maxQueryRows: 200, maxDurationMs: 10000 },
    async run({ query }, input) {
      await query('orders');
      document.body.dataset.orderRequests = String(
        Number(document.body.dataset.orderRequests ?? 0) + 1
      );
      return {
        rows: [
          {
            id: 'order-1',
            place: input.placeId ?? 'all',
            scope: geography.describe!(input.geography),
            search: input.search,
          },
        ],
      };
    },
  }),
};
const client = createDataClient({
  operations,
  lakehouse: {
    async queryAll(statement, { params }) {
      if (statement.includes('FROM countries')) {
        if (
          params?.member === null &&
          new URLSearchParams(location.search).has('fail-options')
        )
          throw new Error('Options unavailable');
        return {
          columns: [{ name: 'value' }, { name: 'label' }],
          rows:
            params?.member === 'far'
              ? [['far', 'Far beyond first page']]
              : params?.member === null
                ? [['fr', 'France']]
                : params?.member === 'fr' && params.region === 'eu'
                  ? [['fr', 'France']]
                  : [],
        };
      }
      return { columns: [], rows: [] };
    },
  },
});
const hooks = createDataHooks(client);
const context = createDataContext({
  sales: 'sales',
  countries: 'countries',
  orders: 'orders',
})({
  description: 'Order source context',
  glossary: {
    orderCount: {
      term: 'Order count',
      definition: 'Count every order in the selected population.',
      queryNames: ['sales'],
    },
  },
});
const sales = hooks.defineDataView({
  operation: 'sales',
  dataContext: context,
  variables: { geography, revenueBy, ordersBy, search },
  describeInput: input => geography.describe!(input.geography),
  isEmpty: () => false,
  emptyFallback: { title: 'No sales' },
});
const ordersView = hooks.defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'orders',
  dataContext: context,
  parseInput: operations.orders.input,
  describeInput: input =>
    `${geography.describe!(input.geography)}: ${input.placeId ?? 'all'}`,
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No orders' },
});
const orders = ordersView.dataset({
  name: 'Orders',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: {
    id: { value: row => row.id },
    place: { value: row => row.place },
    scope: { value: row => row.scope },
    search: { value: row => row.search },
  },
  evidence: { id: 'orders', queryNames: ['orders'] },
});
const orderRecordView = hooks.defineDetailView({
  id: 'order-record',
  title: 'Order record',
  operation: 'orders',
  dataContext: context,
  parseInput: operations.orders.input,
  describeInput: input => `Order ${input.placeId}`,
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No order' },
});
const orderRecord = orderRecordView.dataset({
  name: 'Order record',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: { id: { value: row => row.id }, place: { value: row => row.place } },
  evidence: { id: 'order-record', queryNames: ['orders'] },
});
const orderRecordDetail = orderRecordView.content(source => (
  <TableWidget dataset={orderRecord} source={source} />
));
const orderActions = orders.actions(action => ({
  inspect: action.detail({
    label: 'Inspect order',
    target: orderRecordView,
    input: (row, displayed) => ({ ...displayed, placeId: row.id }),
  }),
}));
const ordersDetail = ordersView.content(source => (
  <>
    <p>
      Showing supplied records, up to 200. Local pagination covers these rows.
    </p>
    <TableWidget dataset={orders} source={source} />
    <VisualizationWidget
      title="Order navigation"
      dataset={orders}
      source={source}
      actions={orderActions}
    >
      {(rows, actions) =>
        rows.map(row => (
          <ExplorationActionControl
            key={row.id}
            ariaLabel={row.id}
            actions={actions(row)}
          />
        ))
      }
    </VisualizationWidget>
  </>
));
const places = sales.dataset({
  name: 'Revenue',
  select: data => data.revenue,
  rowKey: row => row.id,
  columns: {
    label: { value: row => row.label },
    revenue: { value: row => row.revenue },
  },
  evidence: { id: 'revenue', queryNames: ['sales'] },
});
const orderPlaces = sales.dataset({
  name: 'Orders chart',
  select: data => data.orders,
  rowKey: row => row.id,
  columns: {
    label: { value: row => row.label },
    revenue: { value: row => row.revenue },
  },
  evidence: { id: 'orders-chart', queryNames: ['sales'] },
});
const descendActions = places.actions(action => ({
  descend: action.descend({
    target: sales.breakdown('revenueBy'),
    member: row => row.id,
  }),
}));
const details = orderPlaces.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: ordersView,
    input: (row, displayed) => ({ ...displayed, placeId: row.id }),
  }),
}));
const menuActions = places.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: ordersView,
    input: (row, displayed) => ({ ...displayed, placeId: row.id }),
  }),
  descend: action.descend({
    target: sales.breakdown('revenueBy'),
    member: row => row.id,
  }),
}));
const pieMenuActions = orderPlaces.actions(
  action => ({
    orders: action.detail({
      label: 'View orders',
      target: ordersView,
      input: (row, displayed) => ({ ...displayed, placeId: row.id }),
    }),
    filter: action.filter({
      label: 'Filter region',
      target: sales.hierarchy('geography'),
      values: row => ({ region: row.id }),
    }),
  }),
  {
    primary: new URLSearchParams(location.search).has('primary')
      ? 'orders'
      : undefined,
  }
);
const menus = new URLSearchParams(location.search).has('menus');
const days = sales.dataset({
  name: 'Days',
  select: data =>
    data.revenue.map((row, index) => ({
      id: `2026-03-0${index + 1}`,
      label: `March ${index + 1}`,
      day: `2026-03-0${index + 1}`,
      value: row.revenue,
    })),
  rowKey: row => row.id,
  columns: {
    day: { value: row => row.day },
    value: { value: row => row.value },
  },
  evidence: { id: 'days', queryNames: ['sales'] },
});
const dayActions = days.actions(action => ({
  orders: action.detail({
    label: 'View day',
    target: ordersView,
    input: (row, displayed) => ({ ...displayed, placeId: row.day }),
  }),
}));
const showDays = new URLSearchParams(location.search).has('days');
const total = sales.metric(
  { id: 'total', glossaryId: 'orderCount', format: { kind: 'count' } },
  () => ({ current: 15 })
);
const records = total.records({
  target: ordersView,
  input: input => ({ ...input, placeId: undefined }),
});
const content = sales.content(source => (
  <>
    <MetricWidget metric={total} source={source} records={records} />
    <TextWidget dataset={places} source={source} title="Displayed levels">
      {() => (
        <output aria-label="Displayed levels">
          {source.loading
            ? ''
            : JSON.stringify({
                revenue: source.input.revenueBy,
                orders: source.input.ordersBy,
                search: source.input.search,
              })}
        </output>
      )}
    </TextWidget>
    <VisualizationWidget
      dataset={places}
      source={source}
      actions={menus ? menuActions : descendActions}
      breakdown={sales.breakdown('revenueBy')}
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel="Revenue bars"
          unit="USD"
          items={rows.map(row => ({ ...row, value: row.revenue }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    <VisualizationWidget
      dataset={orderPlaces}
      source={source}
      actions={menus ? pieMenuActions : details}
      breakdown={sales.breakdown('ordersBy')}
    >
      {(rows, actions) => (
        <PieChart
          ariaLabel="Order shares"
          unit="orders"
          items={rows.map(row => ({ ...row, value: row.revenue }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    {showDays && (
      <>
        <VisualizationWidget
          dataset={days}
          source={source}
          actions={dayActions}
        >
          {(rows, actions) => (
            <LineChart
              ariaLabel="Daily revenue"
              unit="USD"
              items={rows}
              itemActions={actions}
            />
          )}
        </VisualizationWidget>
        <VisualizationWidget
          dataset={days}
          source={source}
          actions={dayActions}
        >
          {(rows, actions) => (
            <AreaChart
              ariaLabel="Daily magnitude"
              unit="USD"
              items={rows}
              itemActions={actions}
            />
          )}
        </VisualizationWidget>
      </>
    )}
  </>
));
function App() {
  return (
    <DataApp
      view={sales}
      datasets={[places, orderPlaces, ...(showDays ? [days] : [])]}
      details={[ordersDetail, orderRecordDetail]}
      story={snapshot => [
        {
          id: 'overview',
          headline: 'Order overview',
          context: 'Every order in scope.',
          visual: <MetricWidget metric={total} source={snapshot} />,
          evidence: places,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
