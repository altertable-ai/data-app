import { defineDataApp } from '@altertable/data-app';
import {
  type HierarchyStateOf,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  operations as salesOperations,
  type SalesInput,
} from '@/tests/public-api/fixtures/drill-data';
export type Input = SalesInput & {
  geography: HierarchyStateOf<typeof geography>;
  revenueBy: ReturnType<typeof revenueBy.parse>;
};
export type GroupRow = {
  id: string;
  label: string;
  level: string;
  revenue: number;
};
const largeFacet = new URLSearchParams(location.search).has('large-facet');
const predicates = `($region IS NULL OR c.region = $region) AND ($country IS NULL OR c.country = $country)
AND ($customer IS NULL OR c.customer_id = $customer)`;
export const app = defineDataApp({
  title: 'Revenue exploration',
  description:
    'Follow net revenue from regions to countries and customers. Dates and customer segments remain in scope.',
  scope: { organization: 'demo', environment: 'sample' },
  queries: {
    countries: {
      statement: largeFacet
        ? `WITH RECURSIVE countries(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM countries WHERE n<250)
SELECT 'country-' || printf('%03d', n) AS value, 'Country ' || printf('%03d', n) AS label, n AS count
FROM countries WHERE $region='Europe' AND ($member IS NULL OR 'country-' || printf('%03d', n)=$member) ORDER BY n`
        : 'SELECT DISTINCT country AS value, country AS label FROM sales_orders WHERE ($region IS NULL OR region = $region) AND ($member IS NULL OR country=$member) ORDER BY country',
      params: {
        region: { defaultValue: null },
        member: { defaultValue: null },
      },
    },
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
        customer: { defaultValue: null },
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
        customer: { defaultValue: null },
        selectedLevel: {},
        selectedId: {},
      },
    },
  },
});
export const geography = app.defineHierarchy({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      options: [
        { value: 'Europe', label: 'Europe' },
        { value: 'North America', label: 'North America' },
        { value: 'Asia', label: 'Asia' },
      ],
    },
    {
      id: 'country',
      label: 'Country',
      groupLabel: 'Countries',
      valueType: 'string',
      source: { query: 'countries' },
    },
    {
      id: 'customer',
      label: 'Customer',
      groupLabel: 'Customers',
      valueType: 'string',
      options: [
        { value: 'account-atelier', label: 'Atelier Nord', parent: 'France' },
        { value: 'account-werkhaus', label: 'Werkhaus', parent: 'Germany' },
        {
          value: 'account-pacific',
          label: 'Pacific Works',
          parent: 'United States',
        },
        { value: 'account-petit', label: 'Petit Studio', parent: 'France' },
        {
          value: 'account-future',
          label: 'Future account',
          parent: 'Singapore',
        },
      ],
    },
  ],
});
export const revenueBy = geography.breakdown({ key: 'revenue-by' });
const parseInput = geography.input(salesOperations.salesOverview.input, {
  breakdowns: { revenueBy },
});
function member(selection: DimensionSelection) {
  const value = selection.kind === 'all' ? undefined : selection.members[0];
  return value?.kind === 'value' ? value.value : null;
}
function params(input: Omit<Input, 'revenueBy'>) {
  return {
    start: input.start,
    end: input.end,
    segment: input.segment,
    region: member(input.geography.selection.region),
    country: member(input.geography.selection.country),
    customer: member(input.geography.selection.customer),
  };
}
const scope: Input = {
  start: '2026-09-01',
  end: '2026-09-30',
  segment: 'Enterprise',
  geography: geography.defaultValue,
  revenueBy: revenueBy.defaultValue,
};
export const operations = {
  overview: app.defineOperation({
    input: parseInput,
    output: (value: unknown) => value as GroupRow[],
    checks: [scope],
    policy: { maxQueryRows: 100, maxDurationMs: 10000 },
    async run({ query }, input) {
      const level = revenueBy.level(input.revenueBy, input.geography).id;
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
    input: geography.input((value: unknown) => {
      const scope = salesOperations.salesOverview.input(value);
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
    }),
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
