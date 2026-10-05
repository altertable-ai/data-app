import { createDataClient } from '@altertable/data-app/client';
import type { DataAppConfig } from '@altertable/data-app/config';
import {
  defineOperation,
  defineQueryNames,
  parseCount,
} from '@altertable/data-app/contract';
import {
  formatCount,
  formatMetric,
  formatPercent,
  type MetricFormat,
} from '@altertable/data-app/format';
import {
  chartColor,
  createDataContext,
  createDataHooks,
  DataApp,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  Ranking,
  textVariable,
  VisualizationWidget,
} from '@altertable/data-app/react';

type CountryRevenue = { country: string; orderCount: number; revenue: number };
type OrderDay = { day: string; orderCount: number };
type OrderBand = { band: string; orderCount: number };
type OrderOverview = {
  countries: CountryRevenue[];
  days: OrderDay[];
  bands: OrderBand[];
};

const currency: MetricFormat = { kind: 'currency', currency: 'USD' };
const queryNames = defineQueryNames({
  ordersByCountry: 'orders-by-country',
  ordersByDay: 'orders-by-day',
  ordersByValue: 'orders-by-value',
});
function parseCountryFilter(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('country' in value) ||
    typeof value.country !== 'string' ||
    value.country.length > 64
  )
    throw new Error('Expected a country of at most 64 characters.');
  return { country: value.country };
}
function parseRows<Row>(
  value: unknown,
  label: string,
  parseRow: (row: Record<string, unknown>) => Row
): Row[] {
  if (!Array.isArray(value)) throw new Error(`Expected ${label}.`);
  return value.map(row => {
    if (!row || typeof row !== 'object') throw new Error(`Expected ${label}.`);
    return parseRow(row);
  });
}
function parseText(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Expected ${label}.`);
  return value;
}
function parseOrderOverview(value: unknown): OrderOverview {
  if (!value || typeof value !== 'object')
    throw new Error('Expected an order overview.');
  const { countries, days, bands } = value as Record<string, unknown>;
  return {
    countries: parseRows(countries, 'revenue by country', row => {
      const revenue = Number(row.revenue);
      if (!Number.isFinite(revenue) || revenue < 0)
        throw new Error('Expected revenue.');
      return {
        country: parseText(row.country, 'a country'),
        orderCount: parseCount(row.orderCount),
        revenue,
      };
    }),
    days: parseRows(days, 'orders by day', row => {
      const day = parseText(row.day, 'a day');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Expected a day.');
      return { day, orderCount: parseCount(row.orderCount) };
    }),
    bands: parseRows(bands, 'orders by value', row => ({
      band: parseText(row.band, 'an order value band'),
      orderCount: parseCount(row.orderCount),
    })),
  };
}
const operations = {
  orderOverview: defineOperation({
    queryNames,
    input: parseCountryFilter,
    output: parseOrderOverview,
    checks: [{ country: '' }, { country: 'US' }, { country: 'missing' }],
    policy: { maxQueryRows: 50, maxDurationMs: 15000, exposeSql: true },
    async run({ query }, { country }) {
      // Demo tables seeded by `bun run dev`. Escape the validated SQL literal.
      const escapedCountry = country.replaceAll("'", "''");
      const countryFilter = `('${escapedCountry}' = '' OR c.country = '${escapedCountry}')`;
      const window = `o.ordered_at >= current_date - INTERVAL 29 DAY`;
      const [countries, days, bands] = await Promise.all([
        query(
          queryNames.ordersByCountry,
          `
SELECT c.country,
  count(o.id) AS order_count,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status <> 'refunded'), 0) AS DOUBLE) AS revenue
FROM demo.customers c
LEFT JOIN demo.orders o ON o.customer_id = c.id AND ${window}
WHERE ${countryFilter}
GROUP BY c.country
ORDER BY revenue DESC, c.country LIMIT 50`
        ),
        query(
          queryNames.ordersByDay,
          `
SELECT CAST(g.day AS DATE) AS day, count(o.id) AS order_count
FROM generate_series(
  current_date - INTERVAL 29 DAY, CAST(current_date AS TIMESTAMP), INTERVAL 1 DAY
) g(day)
LEFT JOIN (
  SELECT o.id, o.ordered_at
  FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
  WHERE ${countryFilter}
) o ON CAST(o.ordered_at AS DATE) = CAST(g.day AS DATE)
GROUP BY 1 ORDER BY 1 LIMIT 50`
        ),
        query(
          queryNames.ordersByValue,
          `
SELECT CASE
    WHEN o.amount < 50 THEN 'Under $50'
    WHEN o.amount < 100 THEN '$50–100'
    WHEN o.amount < 150 THEN '$100–150'
    ELSE '$150 and over'
  END AS band,
  count(*) AS order_count
FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
WHERE ${window} AND ${countryFilter}
GROUP BY band
ORDER BY min(o.amount) LIMIT 50`
        ),
      ]);
      return parseOrderOverview({
        countries: countries.rows.map(([country, orderCount, revenue]) => ({
          country,
          orderCount,
          revenue,
        })),
        days: days.rows.map(([day, orderCount]) => ({ day, orderCount })),
        bands: bands.rows.map(([band, orderCount]) => ({ band, orderCount })),
      });
    },
  }),
};
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

function sum<Row>(rows: Row[], value: (row: Row) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

function DailyLineChart({ days }: { days: OrderDay[] }) {
  const [width, height, top, bottom] = [400, 160, 18, 22];
  const counts = days.map(day => day.orderCount);
  const max = Math.max(1, ...counts);
  const peakIndex = counts.indexOf(Math.max(...counts));
  function x(index: number) {
    return days.length > 1 ? (index / (days.length - 1)) * width : width / 2;
  }
  function y(count: number) {
    return top + (1 - count / max) * (height - top - bottom);
  }
  const points = days
    .map((day, index) => `${x(index)},${y(day.orderCount)}`)
    .join(' ');
  const color = chartColor('orders');
  const first = days[0]?.day ?? '';
  const last = days.at(-1)?.day ?? '';
  const peak = days[peakIndex];
  /* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG needs an image role and accessible name. */
  return (
    <svg
      role="img"
      aria-label={`${formatCount(sum(days, day => day.orderCount))} orders from ${first} to ${last}, peaking at ${formatCount(peak?.orderCount)} on ${peak?.day}.`}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
    >
      <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--at-border)" />
      <polygon
        points={`0,${y(0)} ${points} ${width},${y(0)}`}
        fill={color}
        opacity={0.15}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {peak && (
        <text
          x={x(peakIndex)}
          y={y(peak.orderCount) - 6}
          textAnchor={
            peakIndex === 0
              ? 'start'
              : peakIndex === days.length - 1
                ? 'end'
                : 'middle'
          }
          fill="currentColor"
          fontSize={12}
        >
          {formatCount(peak.orderCount)}
        </text>
      )}
      <text x={0} y={height - 4} fill="var(--at-muted)" fontSize={11}>
        {first}
      </text>
      <text
        x={width}
        y={height - 4}
        textAnchor="end"
        fill="var(--at-muted)"
        fontSize={11}
      >
        {last}
      </text>
    </svg>
  );
}

function sliceColor(index: number) {
  return `var(--at-chart-${index + 1}, var(--at-accent))`;
}
function piePoint(angle: number) {
  return `${50 + 50 * Math.sin(angle)},${50 - 50 * Math.cos(angle)}`;
}
function OrderValuePieChart({ bands }: { bands: OrderBand[] }) {
  const total = sum(bands, band => band.orderCount);
  const slices = bands.map((band, index) => {
    const before = sum(bands.slice(0, index), previous => previous.orderCount);
    return {
      band,
      index,
      start: (before / total) * 2 * Math.PI,
      end: ((before + band.orderCount) / total) * 2 * Math.PI,
    };
  });
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <svg
        role="img"
        aria-label={bands
          .map(
            band => `${band.band}: ${formatPercent(band.orderCount / total)}`
          )
          .join(', ')}
        viewBox="0 0 100 100"
        style={{ width: 140, height: 140, flex: 'none' }}
      >
        {slices.map(({ band, index, start, end }) =>
          bands.length === 1 ? (
            <circle
              key={band.band}
              cx={50}
              cy={50}
              r={50}
              fill={sliceColor(index)}
            />
          ) : (
            <path
              key={band.band}
              d={`M50,50 L${piePoint(start)} A50,50 0 ${end - start > Math.PI ? 1 : 0} 1 ${piePoint(end)} Z`}
              fill={sliceColor(index)}
              stroke="var(--at-surface)"
              strokeWidth={1}
            />
          )
        )}
      </svg>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 6,
          flex: '1 1 160px',
        }}
      >
        {slices.map(({ band, index }) => (
          <li
            key={band.band}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                flex: 'none',
                background: sliceColor(index),
              }}
            />
            <span style={{ flex: 1 }}>{band.band}</span>
            <span style={{ color: 'var(--at-muted)' }}>
              {formatCount(band.orderCount)} ·{' '}
              {formatPercent(band.orderCount / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
  /* oxlint-enable jsx-a11y/prefer-tag-over-role */
}

/** Orders in the latest 7 days against the 7 before, for the line chart's takeaway. */
function weeklyTrend(days: OrderDay[]) {
  const recent = sum(days.slice(-7), day => day.orderCount);
  const previous = sum(days.slice(-14, -7), day => day.orderCount);
  const orders = `${formatCount(recent)} orders in the last 7 days`;
  if (!previous) return `${orders}.`;
  const change = (recent - previous) / previous;
  return `${orders}, ${change >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(change))} on the week before.`;
}
function largestBand(bands: OrderBand[]) {
  return bands.reduce<OrderBand | undefined>(
    (largest, band) =>
      !largest || band.orderCount > largest.orderCount ? band : largest,
    undefined
  );
}

function CountryRanking({ countries }: { countries: CountryRevenue[] }) {
  return (
    <Ranking
      aria-label="Revenue by country"
      formatValue={value => formatMetric(value, currency)}
      items={countries.map(({ country, orderCount, revenue }) => ({
        id: country,
        label: country,
        value: revenue,
        detail: `${orderCount} orders`,
      }))}
    />
  );
}

function App() {
  const orderRequest = useView(orderView);
  return (
    <DataApp
      config={appConfig}
      dataContext={orderDataContext}
      request={orderRequest}
      csvExport={({ data: { countries, days, bands }, input }) => ({
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
      })}
      story={({ data: { countries, days, bands }, input }) => {
        const scope = `Last 30 days in ${input.country || 'all countries'}.`;
        const [leader] = countries;
        const topBand = largestBand(bands);
        const orders = sum(days, day => day.orderCount);
        return [
          ...(leader
            ? [
                orderDataContext.finding({
                  id: 'revenue',
                  headline: `${leader.country} brought in ${formatMetric(leader.revenue, currency)}`,
                  context: scope,
                  visual: <CountryRanking countries={countries} />,
                  evidence: { id: 'revenue', glossaryIds: ['revenue'] },
                }),
              ]
            : []),
          orderDataContext.finding({
            id: 'orders-per-day',
            headline: `${formatCount(orders)} orders over the last 30 days`,
            context: `${scope} ${weeklyTrend(days)}`,
            visual: <DailyLineChart days={days} />,
            evidence: { id: 'orders-per-day', glossaryIds: ['orders'] },
          }),
          ...(topBand
            ? [
                orderDataContext.finding({
                  id: 'order-values',
                  headline: `${topBand.band} is the most common order value`,
                  context: `${scope} ${formatPercent(topBand.orderCount / orders)} of orders.`,
                  visual: <OrderValuePieChart bands={bands} />,
                  evidence: {
                    id: 'order-values',
                    glossaryIds: ['orderValue'],
                  },
                }),
              ]
            : []),
        ];
      }}
    >
      {({ countries, days, bands }, displayedInput) => {
        const orders = sum(days, day => day.orderCount);
        const revenue = sum(countries, country => country.revenue);
        const [leader] = countries;
        const topBand = largestBand(bands);
        return (
          <Stack aria-label="Order results">
            <TextContent>
              <h2>Orders</h2>
              <p>
                How much did customers order over the last 30 days, and where
                does the revenue come from? Filter by a country code such as US
                to compare markets.
              </p>
              <p>Showing {displayedInput.country || 'all countries'}</p>
            </TextContent>
            <Grid columns={2}>
              <MetricWidget
                label="Orders"
                description="Orders placed in any status."
                value={orders}
                format={{ kind: 'count' }}
              />
              <MetricWidget
                label="Revenue"
                description="Paid and pending orders; refunds excluded."
                value={revenue}
                format={currency}
                insight={
                  orders > 0
                    ? `${formatMetric(revenue / orders, currency)} per order on average.`
                    : undefined
                }
              />
              <VisualizationWidget
                title="Orders per day"
                description="Daily order count. Days without orders stay on the chart as zero."
                evidence={ordersPerDayEvidence}
                visual={<DailyLineChart days={days} />}
                insight={weeklyTrend(days)}
              />
              <VisualizationWidget
                title="Order value"
                description="Share of orders by amount, in $50 bands."
                evidence={orderValueEvidence}
                visual={<OrderValuePieChart bands={bands} />}
                insight={
                  topBand
                    ? `Largest band: ${topBand.band}, with ${formatPercent(topBand.orderCount / orders)} of orders.`
                    : undefined
                }
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
              insight={
                leader && revenue > 0
                  ? `${leader.country} brings in ${formatPercent(leader.revenue / revenue)} of revenue.`
                  : undefined
              }
            />
          </Stack>
        );
      }}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });
