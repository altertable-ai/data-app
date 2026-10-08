import {
  defineOperation,
  defineQueryNames,
  parseCount,
} from '@altertable/data-app/contract';
import { formatCount, formatPercent } from '@altertable/data-app/format';

export type CountryRevenue = {
  country: string;
  orderCount: number;
  revenue: number;
};
export type OrderDay = { day: string; orderCount: number };
export type OrderBand = { band: string; orderCount: number };
export type OrderOverview = {
  countries: CountryRevenue[];
  days: OrderDay[];
  bands: OrderBand[];
};

export const queryNames = defineQueryNames({
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
export const operations = {
  orderOverview: defineOperation({
    queryNames,
    input: parseCountryFilter,
    output: parseOrderOverview,
    checks: [{ country: '' }, { country: 'US' }, { country: 'missing' }],
    policy: { maxQueryRows: 50, maxDurationMs: 15000 },
    async run({ query }, { country }) {
      // Demo tables seeded by `bun run dev`; statements live in dev/queries.json.
      const [countries, days, bands] = await Promise.all([
        query(queryNames.ordersByCountry, { country }),
        query(queryNames.ordersByDay, { country }),
        query(queryNames.ordersByValue, { country }),
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

function sum<Row>(rows: Row[], value: (row: Row) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

/** Orders in the latest 7 days against the 7 before, for the line chart's takeaway. */
export function describeWeeklyOrderTrend(days: readonly OrderDay[]) {
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

export function summarizeOrders({ countries, days, bands }: OrderOverview) {
  return {
    orderCount: sum(days, day => day.orderCount),
    revenue: sum(countries, country => country.revenue),
    leadingCountry: countries[0],
    largestValueBand: largestBand(bands),
  };
}
