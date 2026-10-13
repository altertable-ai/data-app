import { defineDataApp } from '@altertable/data-app';
import {
  breakdownVariable,
  dimensionFilter,
  parseDimensionSelection,
  type BreakdownPath,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  operations as salesOperations,
  type SalesInput,
} from '@/tests/public-api/fixtures/drill-data';
export const geography = breakdownVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    { id: 'region', label: 'Regions' },
    { id: 'country', label: 'Countries' },
    { id: 'customer', label: 'Customers' },
  ],
});
export const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [
    { value: 'Europe', label: 'Europe' },
    { value: 'North America', label: 'North America' },
    { value: 'Asia', label: 'Asia' },
  ],
});
export const country = dimensionFilter<string>({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  options: [
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'United States', label: 'United States' },
    { value: 'Singapore', label: 'Singapore' },
  ],
});
export type Input = SalesInput & {
  region: DimensionSelection<string>;
  country: DimensionSelection<string>;
  geography: BreakdownPath;
};
export type GroupRow = {
  id: string;
  label: string;
  level: string;
  revenue: number;
};
const predicates = `($region IS NULL OR c.region = $region) AND ($country IS NULL OR c.country = $country)
AND ($pathRegion IS NULL OR c.region = $pathRegion) AND ($pathCountry IS NULL OR c.country = $pathCountry)`;
export const app = defineDataApp({
  title: 'Revenue exploration',
  description:
    'Follow net revenue from regions to countries and customers. Dates and customer segments remain in scope.',
  scope: { organization: 'demo', environment: 'sample' },
  queries: {
    geographicRevenue: {
      statement: `WITH customers AS (SELECT DISTINCT customer_id, customer, country, region FROM sales_orders UNION SELECT 'account-future', 'Future account', 'Singapore', 'Asia')
SELECT CASE $groupBy WHEN 'region' THEN c.region WHEN 'country' THEN c.country ELSE c.customer_id END AS id,
CASE $groupBy WHEN 'region' THEN c.region WHEN 'country' THEN c.country ELSE c.customer END AS label,
COALESCE(SUM(o.amount - o.discount - o.refund), 0) AS revenue
FROM customers c LEFT JOIN sales_orders o ON o.customer_id = c.customer_id AND o.day >= $start AND o.day <= $end AND o.segment = $segment AND o.status != 'cancelled'
WHERE ${predicates} GROUP BY 1, 2 ORDER BY revenue DESC, id`,
      params: {
        start: {},
        end: {},
        segment: {},
        region: { defaultValue: null },
        country: { defaultValue: null },
        pathRegion: { defaultValue: null },
        pathCountry: { defaultValue: null },
        groupBy: {},
      },
    },
    geographicOrders: {
      statement: `SELECT c.id, c.customer, c.country, c.day, c.amount - c.discount - c.refund AS revenue
FROM sales_orders c WHERE c.day >= $start AND c.day <= $end AND c.segment = $segment AND c.status != 'cancelled'
AND ${predicates} AND CASE $selectedLevel WHEN 'region' THEN c.region WHEN 'country' THEN c.country ELSE c.customer_id END = $selectedId ORDER BY c.day DESC, c.id`,
      params: {
        start: {},
        end: {},
        segment: {},
        region: { defaultValue: null },
        country: { defaultValue: null },
        pathRegion: { defaultValue: null },
        pathCountry: { defaultValue: null },
        selectedLevel: {},
        selectedId: {},
      },
    },
  },
});
function parseInput(value: unknown): Input {
  const base = salesOperations.salesOverview.input(value);
  const input = value as Record<string, unknown>;
  return {
    ...base,
    region: parseDimensionSelection(input.region, region),
    country: parseDimensionSelection(input.country, country),
    geography: geography.parse(input.geography),
  };
}
function member(selection: DimensionSelection<string>) {
  const value = selection.kind === 'all' ? undefined : selection.members[0];
  return value?.kind === 'value' ? value.value : null;
}
function params(input: Input) {
  return {
    start: input.start,
    end: input.end,
    segment: input.segment,
    region: member(input.region),
    country: member(input.country),
    pathRegion: input.geography[0]?.id ?? null,
    pathCountry: input.geography[1]?.id ?? null,
  };
}
const scope: Input = {
  start: '2026-09-01',
  end: '2026-09-30',
  segment: 'Enterprise',
  region: { kind: 'all' },
  country: { kind: 'all' },
  geography: [],
};
export const operations = {
  overview: app.defineOperation({
    input: parseInput,
    output: (value: unknown) => value as GroupRow[],
    checks: [scope],
    policy: { maxQueryRows: 100, maxDurationMs: 10000 },
    async run({ query }, input) {
      const level = geography.level(input.geography).id;
      const result = await query('geographicRevenue', {
        ...params(input),
        groupBy: level,
      });
      return result.rows.map(([id, label, revenue]) => ({
        id: String(id),
        label: String(label),
        revenue: Number(revenue),
        level,
      }));
    },
  }),
  orders: app.defineOperation({
    input(value: unknown) {
      const scope = parseInput(value);
      const selected = (value as { selected?: GroupRow }).selected;
      if (
        !selected ||
        !geography.levels.some(level => level.id === selected.level) ||
        typeof selected.id !== 'string' ||
        !selected.id ||
        typeof selected.label !== 'string'
      )
        throw new Error('Expected selected group.');
      return {
        ...scope,
        selected: {
          level: selected.level,
          id: selected.id,
          label: selected.label,
        },
      };
    },
    output: (value: unknown) =>
      value as {
        id: string;
        customer: string;
        country: string;
        day: string;
        revenue: number;
      }[],
    checks: [
      {
        ...scope,
        selected: { level: 'region', id: 'Europe', label: 'Europe' },
      },
    ],
    policy: { maxQueryRows: 100, maxDurationMs: 10000 },
    async run({ query }, input) {
      const result = await query('geographicOrders', {
        ...params(input),
        selectedLevel: input.selected.level,
        selectedId: input.selected.id,
      });
      return result.rows.map(([id, customer, country, day, revenue]) => ({
        id: String(id),
        customer: String(customer),
        country: String(country),
        day: String(day),
        revenue: Number(revenue),
      }));
    },
  }),
};
