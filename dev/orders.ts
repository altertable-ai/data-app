import {
  defineOperation,
  defineQueryNames,
  dimensionFilter,
  dimensionPredicate,
  parseDimensionSelection,
  parseCount,
  type DateRangeRequest,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { formatCount, formatPercent } from '@altertable/data-app/format';
import { calendar, countries } from '@/dev/commerce';

export const countryFilter = dimensionFilter({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  options: countries,
});
export type OrderInput = {
  period: DateRangeRequest;
  country: DimensionSelection<string>;
};
export type CountryRevenue = {
  country: string;
  orderCount: number;
  revenue: number;
  orderValue: number;
  refunds: number;
};
export type OrderDay = { day: string; orderCount: number };
export type OrderBand = { band: string; orderCount: number };
export type OrderTotals = {
  orderCount: number;
  revenue: number;
  orderValue: number;
  refunds: number;
};
export type Order = {
  id: number;
  customer: string;
  country: string;
  day: string;
  status: string;
  campaign: string;
  amount: number;
};
export type OrderItem = {
  orderId: number;
  product: string;
  category: string;
  quantity: number;
  unitPrice: number;
};
export type OrderOverview = {
  countries: CountryRevenue[];
  days: OrderDay[];
  bands: OrderBand[];
  orders: Order[];
  items: OrderItem[];
  previous: OrderTotals | null;
};
export const queryNames = defineQueryNames({
  ordersByCountry: 'orders-by-country',
  ordersByDay: 'orders-by-day',
  ordersByValue: 'orders-by-value',
  previousPeriod: 'previous-period',
  orders: 'recent-orders',
  items: 'order-items',
});
function parseInput(value: unknown): OrderInput {
  if (!value || typeof value !== 'object')
    throw new Error('Expected order filters.');
  const input = value as Record<string, unknown>;
  return {
    period: calendar.parseRequest(input.period),
    country: parseDimensionSelection(input.country, countryFilter),
  };
}
function parseRows<Row>(
  value: unknown,
  parseRow: (row: Record<string, unknown>) => Row
): Row[] {
  if (!Array.isArray(value)) throw new Error('Expected rows.');
  return value.map(row => {
    if (!row || typeof row !== 'object') throw new Error('Expected a row.');
    return parseRow(row);
  });
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected text.');
  return value;
}
function amount(value: unknown): number {
  const number =
    typeof value === 'number' || (typeof value === 'string' && value.trim())
      ? Number(value)
      : NaN;
  if (!Number.isFinite(number) || number < 0)
    throw new Error('Expected a nonnegative amount.');
  return number;
}
function totals(row: Record<string, unknown>): OrderTotals {
  return {
    orderCount: parseCount(row.orderCount),
    revenue: amount(row.revenue),
    orderValue: amount(row.orderValue),
    refunds: amount(row.refunds),
  };
}
function parseOrderOverview(value: unknown): OrderOverview {
  if (!value || typeof value !== 'object')
    throw new Error('Expected an order overview.');
  const data = value as Record<string, unknown>;
  return {
    countries: parseRows(data.countries, row => ({
      country: text(row.country),
      ...totals(row),
    })),
    days: parseRows(data.days, row => ({
      day: text(row.day),
      orderCount: parseCount(row.orderCount),
    })),
    bands: parseRows(data.bands, row => ({
      band: text(row.band),
      orderCount: parseCount(row.orderCount),
    })),
    orders: parseRows(data.orders, row => ({
      id: parseCount(row.id),
      customer: text(row.customer),
      country: text(row.country),
      day: text(row.day),
      status: text(row.status),
      campaign: text(row.campaign),
      amount: amount(row.amount),
    })),
    items: parseRows(data.items, row => ({
      orderId: parseCount(row.orderId),
      product: text(row.product),
      category: text(row.category),
      quantity: parseCount(row.quantity),
      unitPrice: amount(row.unitPrice),
    })),
    previous:
      data.previous === null
        ? null
        : totals(data.previous as Record<string, unknown>),
  };
}
const aggregates = `count(o.id) AS order_count,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'paid'), 0) AS DOUBLE) AS revenue,
  CAST(coalesce(sum(o.amount), 0) AS DOUBLE) AS order_value,
  CAST(coalesce(sum(o.amount) FILTER (WHERE o.status = 'refunded'), 0) AS DOUBLE) AS refunds`;
const checkRange = calendar.request(
  { start: calendar.bounds().maxDate, end: calendar.bounds().maxDate },
  true
);
export const operations = {
  orderOverview: defineOperation({
    queryNames,
    input: parseInput,
    output: parseOrderOverview,
    checks: [
      { period: checkRange, country: { kind: 'all' } },
      {
        period: checkRange,
        country: { kind: 'include', members: [{ kind: 'value', value: 'FI' }] },
      },
    ] satisfies OrderInput[],
    policy: { maxQueryRows: 300, maxDurationMs: 15000, exposeSql: true },
    async run({ query }, { country, period }) {
      const filter =
        dimensionPredicate('c.country', country, ['c.country']) || 'TRUE';
      function rangeSql(range: DateRangeRequest['range']) {
        return `o.ordered_at >= DATE '${range.start}' AND o.ordered_at < DATE '${range.end}' + INTERVAL 1 DAY`;
      }
      const scope = `${rangeSql(period.range)} AND ${filter}`;
      const recentOrders = `SELECT o.id, c.name AS customer, c.country, CAST(o.ordered_at AS DATE) AS day, o.status, o.campaign, CAST(o.amount AS DOUBLE) AS amount
        FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
        WHERE ${scope} ORDER BY o.ordered_at DESC, o.id DESC LIMIT 100`;
      const [
        countryResult,
        dayResult,
        bandResult,
        previousResult,
        orderResult,
        itemResult,
      ] = await Promise.all([
        query(
          queryNames.ordersByCountry,
          `SELECT c.country, ${aggregates}
          FROM demo.customers c LEFT JOIN demo.orders o ON o.customer_id = c.id AND ${rangeSql(period.range)}
          WHERE ${filter} GROUP BY c.country ORDER BY revenue DESC, c.country`
        ),
        query(
          queryNames.ordersByDay,
          `SELECT CAST(g.day AS DATE) AS day, count(o.id) AS order_count
          FROM generate_series(DATE '${period.range.start}', DATE '${period.range.end}', INTERVAL 1 DAY) g(day)
          LEFT JOIN (SELECT o.id, o.ordered_at FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id WHERE ${scope}) o
          ON CAST(o.ordered_at AS DATE) = CAST(g.day AS DATE) GROUP BY 1 ORDER BY 1`
        ),
        query(
          queryNames.ordersByValue,
          `SELECT CASE WHEN o.amount < 100 THEN 'Under $100' WHEN o.amount < 250 THEN '$100–250' WHEN o.amount < 500 THEN '$250–500' ELSE '$500 and over' END AS band, count(*) AS order_count
          FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id WHERE ${scope}
          GROUP BY band ORDER BY min(o.amount)`
        ),
        // Keep a disclosed query for every registered evidence source, even when comparison is off.
        query(
          queryNames.previousPeriod,
          `SELECT ${aggregates}
          FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
          WHERE ${period.comparison ? rangeSql(period.comparison) : 'FALSE'} AND ${filter}`
        ),
        query(queryNames.orders, recentOrders),
        query(
          queryNames.items,
          `WITH recent AS (${recentOrders})
          SELECT i.order_id, p.name, p.category, i.quantity, CAST(i.unit_price AS DOUBLE) AS unit_price
          FROM recent r JOIN demo.order_items i ON i.order_id = r.id JOIN demo.products p ON p.id = i.product_id
          ORDER BY i.order_id DESC, p.id`
        ),
      ]);
      return parseOrderOverview({
        countries: countryResult.rows.map(
          ([country, orderCount, revenue, orderValue, refunds]) => ({
            country,
            orderCount,
            revenue,
            orderValue,
            refunds,
          })
        ),
        days: dayResult.rows.map(([day, orderCount]) => ({ day, orderCount })),
        bands: bandResult.rows.map(([band, orderCount]) => ({
          band,
          orderCount,
        })),
        orders: orderResult.rows.map(
          ([id, customer, country, day, status, campaign, amount]) => ({
            id,
            customer,
            country,
            day,
            status,
            campaign,
            amount,
          })
        ),
        items: itemResult.rows.map(
          ([orderId, product, category, quantity, unitPrice]) => ({
            orderId,
            product,
            category,
            quantity,
            unitPrice,
          })
        ),
        previous: period.comparison
          ? (() => {
              const [orderCount, revenue, orderValue, refunds] =
                previousResult.rows[0]!;
              return { orderCount, revenue, orderValue, refunds };
            })()
          : null,
      });
    },
  }),
};
function sum<Row>(rows: readonly Row[], value: (row: Row) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}
export function describeWeeklyOrderTrend(days: readonly OrderDay[]) {
  if (days.length < 14)
    return `${formatCount(sum(days, day => day.orderCount))} orders in the selected range.`;
  const recent = sum(days.slice(-7), day => day.orderCount);
  const previous = sum(days.slice(-14, -7), day => day.orderCount);
  const orders = `${formatCount(recent)} orders in the final 7 days`;
  if (!previous) return `${orders}; the preceding 7 days had no orders.`;
  const change = (recent - previous) / previous;
  return `${orders}, ${change >= 0 ? 'up' : 'down'} ${formatPercent(Math.abs(change))} on the 7 days before.`;
}
export function summarizeOrders({ countries, days, bands }: OrderOverview) {
  return {
    orderCount: sum(days, day => day.orderCount),
    revenue: sum(countries, country => country.revenue),
    orderValue: sum(countries, country => country.orderValue),
    refunds: sum(countries, country => country.refunds),
    leadingCountry: countries[0],
    largestValueBand: bands.reduce<OrderBand | undefined>(
      (largest, band) =>
        !largest || band.orderCount > largest.orderCount ? band : largest,
      undefined
    ),
  };
}
