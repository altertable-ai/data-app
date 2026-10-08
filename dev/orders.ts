import { dataApp } from '@/dev/app';
import {
  dimensionFilter,
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
const checkRange = calendar.request(
  { start: calendar.bounds().maxDate, end: calendar.bounds().maxDate },
  true
);
export const operations = {
  orderOverview: dataApp.defineOperation({
    input: parseInput,
    output: parseOrderOverview,
    checks: [
      { period: checkRange, country: { kind: 'all' } },
      {
        period: checkRange,
        country: { kind: 'include', members: [{ kind: 'value', value: 'FI' }] },
      },
    ] satisfies OrderInput[],
    policy: { maxQueryRows: 300, maxDurationMs: 15000 },
    async run({ query }, { country, period }) {
      const member = country.kind === 'all' ? undefined : country.members[0];
      const params = {
        start: period.range.start,
        end: period.range.end,
        countryMode: country.kind,
        country: member?.kind === 'value' ? member.value : null,
      };
      const [
        countryResult,
        dayResult,
        bandResult,
        previousResult,
        orderResult,
        itemResult,
      ] = await Promise.all([
        query('ordersByCountry', params),
        query('ordersByDay', params),
        query('ordersByValue', params),
        query('previousPeriod', {
          ...params,
          start: period.comparison?.start ?? period.range.start,
          end: period.comparison?.end ?? period.range.end,
          enabled: period.comparison !== null,
        }),
        query('orders', params),
        query('items', params),
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
export const queryNames = operations.orderOverview.queryNames;

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
