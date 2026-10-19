import { dataApp } from '@/dev/app';
import type { OutputOf } from '@altertable/data-app/client';
import {
  dimensionFilter,
  parseDimensionSelection,
  parseCount,
  type DateRangeRequest,
  type DimensionSelection,
  type QueryRow,
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
function parseInput(value: unknown): OrderInput {
  if (!value || typeof value !== 'object')
    throw new Error('Expected order filters.');
  const input = value as Record<string, unknown>;
  return {
    period: calendar.parseRequest(input.period),
    country: parseDimensionSelection(input.country, countryFilter),
  };
}
function amount(value: number): number {
  if (value < 0) throw new Error('Expected a nonnegative amount.');
  return value;
}
function totals(
  row: QueryRow<typeof dataApp.queries.previousPeriod.projections>
) {
  return {
    orderCount: parseCount(row.order_count),
    revenue: amount(row.revenue),
    orderValue: amount(row.order_value),
    refunds: amount(row.refunds),
  };
}
const checkRange = calendar.request(
  { start: calendar.bounds().maxDate, end: calendar.bounds().maxDate },
  true
);
export const operations = {
  orderOverview: dataApp.defineOperation({
    input: parseInput,
    checks: [
      { period: checkRange, country: { kind: 'all' } },
      {
        period: checkRange,
        country: { kind: 'include', members: [{ kind: 'value', value: 'FI' }] },
      },
    ] satisfies [OrderInput, ...OrderInput[]],
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
      return {
        countries: countryResult.rows.map(row => ({
          country: row.country,
          ...totals(row),
        })),
        days: dayResult.rows.map(row => ({
          day: row.day,
          orderCount: parseCount(row.order_count),
        })),
        bands: bandResult.rows.map(row => ({
          band: row.band,
          orderCount: parseCount(row.order_count),
        })),
        orders: orderResult.rows.map(row => ({
          ...row,
          id: parseCount(row.id),
          amount: amount(row.amount),
        })),
        items: itemResult.rows.map(row => ({
          orderId: parseCount(row.order_id),
          product: row.name,
          category: row.category,
          quantity: parseCount(row.quantity),
          unitPrice: amount(row.unit_price),
        })),
        previous: period.comparison ? totals(previousResult.rows[0]!) : null,
      };
    },
  }),
};
export const queryNames = operations.orderOverview.queryNames;
export type OrderOverview = OutputOf<typeof operations.orderOverview>;
export type CountryRevenue = OrderOverview['countries'][number];
export type OrderDay = OrderOverview['days'][number];
export type OrderBand = OrderOverview['bands'][number];
export type Order = OrderOverview['orders'][number];
export type OrderItem = OrderOverview['items'][number];

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
