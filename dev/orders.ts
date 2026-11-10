import type { InputOf, OutputOf } from '@altertable/data-app/client';
import {
  dimensionFilter,
  parseCount,
  type QueryRow,
} from '@altertable/data-app/contract';
import { formatCount, formatPercent } from '@altertable/data-app/format';

import { dataApp } from '@/dev/app';
import { countries, period } from '@/dev/commerce';

const countryFilter = dimensionFilter({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  options: countries,
});
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
export const operations = {
  orderOverview: dataApp.defineOperation({
    filters: { period, country: countryFilter },
    policy: { maxQueryRows: 300, maxDurationMs: 15000 },
    async run({ query }, { country, period }) {
      const member = country.kind === 'all' ? undefined : country.members[0];
      const params = {
        window: period.range,
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
          window: period.comparison ?? period.range,
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
export type OrderInput = InputOf<typeof operations.orderOverview>;
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
