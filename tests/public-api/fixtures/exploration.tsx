import { variableInput, dimensionFilter } from '@altertable/data-app/contract';
import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import { Component, useState, type ReactNode } from 'react';
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
  useDetailNavigation,
  searchVariable,
  choiceVariable,
} from '@altertable/data-app-react';
import {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ExplorationActionControl,
  type ItemActions,
} from '@altertable/data-app-react/ui';

const app = defineDataApp({
  title: 'Exploration',
  description: 'Explore orders by place.',
  scope: { organization: 'test', environment: 'test' },
  queries: {
    countries: {
      statement:
        'SELECT value, label FROM countries WHERE ($member IS NULL OR value = $member)',
      params: { member: { type: 'string', nullable: true } },
      projections: { value: { type: 'string' }, label: { type: 'string' } },
    },
    sales: {
      statement: 'SELECT sales',
      params: {},
      projections: { sales: { type: 'number' } },
    },
    orders: {
      statement: 'SELECT orders',
      params: {},
      projections: { orders: { type: 'number' } },
    },
  },
});
const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  presentation: { prominence: 'secondary' },
  options: [
    { value: 'eu', label: 'Europe' },
    { value: 'us', label: 'America' },
  ],
});
const country = app.defineDimension({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  presentation: {
    prominence: 'secondary',
    control: new URLSearchParams(location.search).has('widget-country')
      ? 'widget'
      : 'toolbar',
  },
  source: { query: 'countries' },
});
const filters = { region, country };
const defaultFilters = {
  region: region.defaultValue,
  country: country.defaultValue,
};
function describeFilters(input: typeof defaultFilters) {
  return (
    Object.entries(filters)
      .filter(
        ([key, filter]) =>
          !filter.same(input[key as keyof typeof filters], filter.defaultValue)
      )
      .map(([key, filter]) =>
        filter.describe(input[key as keyof typeof filters])
      )
      .join(' / ') || 'All countries'
  );
}
const choices = [
  { id: 'region', label: 'Region' },
  { id: 'country', label: 'Country' },
] as const;
const revenueBy = choiceVariable({
  key: 'revenue-by',
  label: 'Revenue breakdown',
  defaultValue: 'region',
  options: choices,
  presentation: { group: 'display', control: 'widget' },
});
const ordersBy = choiceVariable({
  key: 'orders-by',
  label: 'Orders breakdown',
  defaultValue: 'region',
  options: choices,
  presentation: { group: 'display', control: 'widget' },
});
const windowChoice = choiceVariable({
  key: 'window',
  label: 'Window',
  defaultValue: 'recent',
  options: [
    { id: 'recent', label: 'Recent' },
    { id: 'previous', label: 'Previous' },
  ],
});
const search = searchVariable({ key: 'q', label: 'Search' });
const parseInput = variableInput(
  (value: unknown) => {
    const input = value as { search: unknown; windowId: unknown };
    if (!input || typeof input.search !== 'string')
      throw new Error('Invalid search');
    if (input.windowId !== 'recent' && input.windowId !== 'previous')
      throw new Error('Invalid window');
    return { search: input.search, windowId: input.windowId } as const;
  },
  { ...filters, revenueBy, ordersBy }
);
type Input = ReturnType<typeof parseInput>;
type Row = {
  id: string;
  label: string;
  revenue: number;
  dimension: 'region' | 'country';
};
const parseOrders = variableInput((value: unknown) => {
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
}, filters);
const operations = {
  sales: app.defineOperation({
    input: parseInput,
    checks: [
      {
        search: '',
        windowId: 'recent',
        ...defaultFilters,
        revenueBy: 'region',
        ordersBy: 'region',
      } as Input,
    ],
    policy: { maxQueryRows: 200, maxDurationMs: 10000 },
    async run({ query, signal }, input) {
      await query('sales');
      if (input.windowId === 'previous')
        await new Promise<void>((resolve, reject) => {
          window.addEventListener('release-sales', () => resolve(), {
            once: true,
            signal,
          });
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        });
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
        const dimension = input[by === revenueBy ? 'revenueBy' : 'ordersBy'];
        return dimension === 'region'
          ? [
              { id: 'eu', label: 'Europe', revenue: 10, dimension },
              { id: 'us', label: 'America', revenue: 5, dimension },
            ]
          : [{ id: 'fr', label: 'France', revenue: 10, dimension }];
      }
      return { revenue: rows(revenueBy), orders: rows(ordersBy), input };
    },
  }),
  orders: app.defineOperation({
    input: parseOrders,
    checks: [{ ...defaultFilters, placeId: undefined, search: '' }],
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
            scope: describeFilters(input),
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
                : params?.member === 'fr'
                  ? [['fr', 'France']]
                  : [],
        };
      }
      return { columns: [], rows: [] };
    },
  },
});
client.query = new Proxy(client.query, {
  apply(query, receiver, [name, input, options]) {
    if (
      String(name).startsWith('__dimension:') &&
      input?.member != null &&
      new URLSearchParams(location.search).has('fail-label') &&
      document.body.dataset.retryLabels !== 'true'
    )
      return Promise.reject(new Error('Selected label unavailable'));
    return Reflect.apply(query, receiver, [name, input, options]);
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
  variables: { ...filters, revenueBy, ordersBy, search, window: windowChoice },
  input: ({ window, ...values }) => ({ ...values, windowId: window }),
  bindings: { window: input => input.windowId },
  describeInput: input => describeFilters(input),
  isEmpty: () => false,
  emptyFallback: { title: 'No sales' },
});
const otherSales = hooks.defineDataView({
  operation: 'sales',
  dataContext: context,
  variables: { ...filters, revenueBy, ordersBy, search, window: windowChoice },
  input: ({ window, ...values }) => ({ ...values, windowId: window }),
  bindings: { window: input => input.windowId },
  describeInput: describeFilters,
  isEmpty: () => false,
  emptyFallback: { title: 'No sales' },
});
class ConfigurationBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  override state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  override render() {
    return this.state.error ? (
      <p role="alert">{this.state.error}</p>
    ) : (
      this.props.children
    );
  }
}
const ordersView = hooks.defineDetailView({
  id: 'orders',
  title: 'Contributing orders',
  operation: 'orders',
  dataContext: context,
  parseInput: operations.orders.input,
  describeInput: input =>
    `${describeFilters(input)}: ${input.placeId ?? 'all'}`,
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No orders' },
});
function DetailRouteProbe() {
  const navigation = useDetailNavigation();
  const [error, setError] = useState('');
  return (
    <>
      <button
        onClick={() => {
          try {
            navigation.open(ordersView, {
              ...defaultFilters,
              search: '',
              placeId: 'x'.repeat(
                Number(new URLSearchParams(location.search).get('input-size'))
              ),
            });
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        Open bounded detail
      </button>
      <output aria-label="Detail navigation error">{error}</output>
    </>
  );
}
const routeProbe = new URLSearchParams(location.search).has('route-probe');
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
    {routeProbe && <DetailRouteProbe />}
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
const drillActions = places.actions(action => ({
  drill: action.filter({
    label: 'Drill down',
    when: row => row.dimension === 'region',
    target: sales.filter(),
    values: row => ({
      region: { kind: 'include', members: [{ kind: 'value', value: row.id }] },
    }),
    breakdown: { target: sales.breakdown('revenueBy'), value: () => 'country' },
  }),
}));
const details = orderPlaces.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: ordersView,
    input: (row, displayed) => ({ ...displayed, placeId: row.id }),
  }),
}));
const menuActions = places.actions(
  action => ({
    orders: action.detail({
      label: 'View orders',
      target: ordersView,
      input: (row, displayed) => ({ ...displayed, placeId: row.id }),
    }),
    drill: action.filter({
      label: 'Drill down',
      when: row => row.dimension === 'region',
      target: sales.filter(),
      values: row => ({
        region: {
          kind: 'include',
          members: [{ kind: 'value', value: row.id }],
        },
      }),
      breakdown: {
        target: sales.breakdown('revenueBy'),
        value: () => 'country',
      },
    }),
  }),
  {
    primary:
      new URLSearchParams(location.search).get('primary') === 'orders'
        ? 'orders'
        : new URLSearchParams(location.search).has('primary')
          ? 'drill'
          : undefined,
  }
);
const pieMenuActions = orderPlaces.actions(
  action => ({
    orders: action.detail({
      label: 'View orders',
      target: ordersView,
      input: (row, displayed) => ({ ...displayed, placeId: row.id }),
    }),
    filter: action.filter({
      label: 'Filter region',
      target: sales.filter(),
      values: row => ({
        region: {
          kind: 'include',
          members: [{ kind: 'value', value: row.id }],
        },
      }),
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
const widgetActions = new URLSearchParams(location.search).has(
  'widget-actions'
);
const totalActions = total.actions(action => ({
  orders: action.detail({
    label: 'View all orders',
    target: ordersView,
    input: (_row, input) => ({ ...input, placeId: undefined }),
  }),
}));
const alternateViews = new URLSearchParams(location.search).has(
  'alternate-views'
);
const foreignBreakdown = new URLSearchParams(location.search).has(
  'foreign-breakdown'
);
const revenueViews = [
  {
    id: 'bars',
    label: 'Bars',
    render: (rows: readonly Row[], actions: ItemActions<Row>) => (
      <BarChart
        ariaLabel="Alternate bars"
        unit="USD"
        items={rows.map(row => ({ ...row, value: row.revenue }))}
        itemActions={actions}
      />
    ),
  },
  {
    id: 'shares',
    label: 'Shares',
    render: (rows: readonly Row[], actions: ItemActions<Row>) => (
      <PieChart
        ariaLabel="Alternate shares"
        unit="USD"
        items={rows.map(row => ({ ...row, value: row.revenue }))}
        itemActions={actions}
      />
    ),
  },
];
const content = sales.content(source => (
  <>
    {routeProbe && <DetailRouteProbe />}
    <MetricWidget
      metric={total}
      source={source}
      records={records}
      actions={widgetActions ? totalActions : undefined}
    />
    {widgetActions && (
      <TableWidget
        dataset={places}
        source={source}
        title="Places table"
        actions={menuActions}
      />
    )}
    <TextWidget dataset={places} source={source} title="Displayed breakdowns">
      {() => (
        <output aria-label="Displayed breakdowns">
          {source.loading
            ? ''
            : JSON.stringify({
                revenue: source.input.revenueBy,
                orders: source.input.ordersBy,
                search: source.input.search,
                windowId: source.input.windowId,
              })}
        </output>
      )}
    </TextWidget>
    {alternateViews ? (
      <VisualizationWidget
        dataset={places}
        source={source}
        actions={menuActions}
        breakdown={sales.breakdown('revenueBy')}
        views={revenueViews}
        viewLabel="Revenue display"
      />
    ) : (
      <VisualizationWidget
        dataset={places}
        source={source}
        actions={menus ? menuActions : drillActions}
        breakdown={(foreignBreakdown ? otherSales : sales).breakdown(
          'revenueBy'
        )}
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
    )}
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
          visual: (
            <MetricWidget
              metric={total}
              source={snapshot}
              actions={
                new URLSearchParams(location.search).has('story-actions')
                  ? totalActions
                  : undefined
              }
            />
          ),
          evidence: places,
        },
      ]}
    >
      <ConfigurationBoundary>
        <DataSection content={content} />
      </ConfigurationBoundary>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });
