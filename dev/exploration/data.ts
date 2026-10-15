import {
  choiceVariable,
  type AppVariableValues,
} from '@altertable/data-app/react';
import { defineDataApp } from '@altertable/data-app';
import {
  defineDateRangeContract,
  dimensionFilter,
  variableInput,
  type DimensionSelection,
  parseCount,
  parseLabel,
  rowsAsRecords,
  type QueryResult,
} from '@altertable/data-app/contract';

export const app = defineDataApp({
  title: 'Sales explorer',
  description:
    'Explore paid revenue by region, country, or customer and inspect contributing orders.',
  scope: { organization: 'Sample store', environment: 'Demo' },
  queries: {
    countries: {
      statement: `SELECT code AS value, name AS label FROM countries
        WHERE ($member IS NULL OR code = $member) ORDER BY name LIMIT 200`,
      params: { member: {} },
    },
    customers: {
      statement: `SELECT c.id AS value, c.name AS label FROM customers c
        WHERE ($member IS NULL OR c.id = $member)
        ORDER BY c.name LIMIT 200`,
      params: { member: {} },
    },
    totals: {
      statement: `SELECT COUNT(*) AS orders, COALESCE(SUM(o.amount_cents), 0) / 100.0 AS revenue,
        COUNT(DISTINCT c.id) AS customers FROM orders o JOIN customers c ON c.id = o.customer_id
        JOIN countries g ON g.code = c.country
        WHERE o.status = 'paid' AND o.day BETWEEN $start AND $end
          AND ($region IS NULL OR g.region = $region) AND ($country IS NULL OR c.country = $country)
          AND ($customer IS NULL OR c.id = $customer)`,
      params: { start: {}, end: {}, region: {}, country: {}, customer: {} },
    },
    places: {
      statement: `SELECT CASE $dimension WHEN 'region' THEN g.region WHEN 'country' THEN g.code ELSE CAST(c.id AS TEXT) END AS member,
        CASE $dimension WHEN 'region' THEN g.region WHEN 'country' THEN g.name ELSE c.name END AS label,
        COUNT(*) AS orders, SUM(o.amount_cents) / 100.0 AS revenue
        FROM orders o JOIN customers c ON c.id = o.customer_id JOIN countries g ON g.code = c.country
        WHERE o.status = 'paid' AND o.day BETWEEN $start AND $end
          AND ($region IS NULL OR g.region = $region) AND ($country IS NULL OR c.country = $country)
          AND ($customer IS NULL OR c.id = $customer)
        GROUP BY member, label ORDER BY revenue DESC, member`,
      params: {
        start: {},
        end: {},
        region: {},
        country: {},
        customer: {},
        dimension: {},
      },
    },
    days: {
      statement: `WITH RECURSIVE dates(day) AS (SELECT $start UNION ALL SELECT date(day, '+1 day') FROM dates WHERE day < $end),
        paid AS (SELECT o.day, COUNT(*) AS orders, SUM(o.amount_cents) / 100.0 AS revenue
          FROM orders o JOIN customers c ON c.id = o.customer_id JOIN countries g ON g.code = c.country
          WHERE o.status = 'paid' AND o.day BETWEEN $start AND $end
            AND ($region IS NULL OR g.region = $region) AND ($country IS NULL OR c.country = $country)
            AND ($customer IS NULL OR c.id = $customer) GROUP BY o.day)
        SELECT dates.day, COALESCE(paid.orders, 0) AS orders, COALESCE(paid.revenue, 0) AS revenue
        FROM dates LEFT JOIN paid ON paid.day = dates.day ORDER BY dates.day`,
      params: { start: {}, end: {}, region: {}, country: {}, customer: {} },
    },
    records: {
      statement: `SELECT o.id, o.day, c.name AS customer, g.name AS country, o.amount_cents / 100.0 AS amount,
        COUNT(*) OVER () AS total FROM orders o JOIN customers c ON c.id = o.customer_id
        JOIN countries g ON g.code = c.country
        WHERE o.status = 'paid' AND o.day BETWEEN $start AND $end
          AND ($region IS NULL OR g.region = $region) AND ($country IS NULL OR c.country = $country)
          AND ($customer IS NULL OR c.id = $customer) AND ($day IS NULL OR o.day = $day)
          AND ($orderId IS NULL OR o.id = $orderId) ORDER BY o.day DESC, o.id DESC LIMIT 200`,
      params: {
        start: {},
        end: {},
        region: {},
        country: {},
        customer: {},
        day: { defaultValue: null },
        orderId: { defaultValue: null },
      },
    },
  },
});
export const calendar = defineDateRangeContract({
  minDate: '2026-10-01',
  maxDate: '2026-10-14',
  maxRangeDays: 14,
  timeZone: 'UTC',
});
export const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  presentation: { prominence: 'secondary' },
  options: [
    { value: 'Europe', label: 'Europe' },
    { value: 'North America', label: 'North America' },
  ],
});
export const country = app.defineDimension({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  presentation: { prominence: 'secondary' },
  source: { query: 'countries' },
});
export const customer = app.defineDimension({
  key: 'customer',
  label: 'Customer',
  valueType: 'number',
  selectionMode: 'single',
  presentation: { prominence: 'secondary' },
  source: { query: 'customers' },
});
export const filters = { region, country, customer };
export const breakdownOptions = [
  { id: 'region', label: 'Region' },
  { id: 'country', label: 'Country' },
  { id: 'customer', label: 'Customer' },
] as const;
export const revenueBy = choiceVariable({
  key: 'revenue-by',
  label: 'Revenue breakdown',
  defaultValue: 'region',
  options: breakdownOptions,
  presentation: { group: 'display', control: 'widget' },
});
export const ordersBy = choiceVariable({
  key: 'orders-by',
  label: 'Orders breakdown',
  defaultValue: 'region',
  options: breakdownOptions,
  presentation: { group: 'display', control: 'widget' },
});
export function selectedValue<Value extends string | number>(
  selection: DimensionSelection<Value>
): Value | null {
  return selection.kind === 'all' || selection.members[0]?.kind !== 'value'
    ? null
    : selection.members[0].value;
}
export function placeFilter(
  row: Place
): Partial<AppVariableValues<typeof filters>> {
  if (row.dimension === 'customer')
    return {
      customer: {
        kind: 'include',
        members: [{ kind: 'value', value: row.member }],
      },
    };
  if (row.dimension === 'country')
    return {
      country: {
        kind: 'include',
        members: [{ kind: 'value', value: row.member }],
      },
    };
  return {
    region: {
      kind: 'include',
      members: [{ kind: 'value', value: row.member }],
    },
  };
}
function parsePeriod(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Choose a period.');
  return {
    period: calendar.parseRequest((value as { period: unknown }).period),
  };
}
const parseOverview = variableInput(parsePeriod, {
  ...filters,
  revenueBy,
  ordersBy,
});
export type OverviewInput = ReturnType<typeof parseOverview>;
const parseRecords = variableInput((value: unknown) => {
  const { period } = parsePeriod(value);
  const input = value as { day?: unknown; orderId?: unknown };
  const day =
    input.day === undefined
      ? undefined
      : calendar.parse({ start: input.day, end: input.day }).start;
  if (day && (day < period.range.start || day > period.range.end))
    throw new Error('Day is outside the selected period.');
  return {
    period,
    day,
    orderId:
      input.orderId === undefined ? undefined : parseCount(input.orderId),
  };
}, filters);
export type RecordsInput = ReturnType<typeof parseRecords>;
export type Place = {
  id: string;
  label: string;
  revenue: number;
  orders: number;
} & (
  | { dimension: 'region' | 'country'; member: string }
  | { dimension: 'customer'; member: number }
);
function amount(value: unknown) {
  const parsed =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : NaN;
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error('Invalid revenue.');
  return parsed;
}
function places(result: QueryResult, dimension: Place['dimension']): Place[] {
  return rowsAsRecords(result, ['member', 'label', 'orders', 'revenue']).map(
    row => ({
      id: `${dimension}:${dimension === 'customer' ? parseCount(row.member) : parseLabel(row.member)}`,
      label: parseLabel(row.label),
      orders: parseCount(row.orders),
      revenue: amount(row.revenue),
      ...(dimension === 'customer'
        ? { dimension, member: parseCount(row.member) }
        : { dimension, member: parseLabel(row.member) }),
    })
  );
}
function parameters(
  input: Pick<OverviewInput, 'period' | 'region' | 'country' | 'customer'>
) {
  return {
    ...input.period.range,
    region: selectedValue(input.region),
    country: selectedValue(input.country),
    customer: selectedValue(input.customer),
  };
}
const defaultScope = {
  period: calendar.request({ start: '2026-10-01', end: '2026-10-14' }),
  region: region.defaultValue,
  country: country.defaultValue,
  customer: customer.defaultValue,
};
export const operations = {
  overview: app.defineOperation({
    input: parseOverview,
    checks: [
      {
        ...defaultScope,
        revenueBy: 'region',
        ordersBy: 'region',
      } as OverviewInput,
    ],
    policy: { maxQueryRows: 200, maxDurationMs: 10000 },
    async run({ query }, input) {
      const params = parameters(input);
      const revenueDimension = input.revenueBy;
      const orderDimension = input.ordersBy;
      const [totals, revenue, orders, days] = await Promise.all([
        query('totals', params),
        query('places', { ...params, dimension: revenueDimension }),
        query('places', { ...params, dimension: orderDimension }),
        query('days', params),
      ]);
      const total = rowsAsRecords(totals, [
        'orders',
        'revenue',
        'customers',
      ])[0]!;
      return {
        totals: {
          orders: parseCount(total.orders),
          revenue: amount(total.revenue),
          customers: parseCount(total.customers),
        },
        revenue: places(revenue, revenueDimension),
        orders: places(orders, orderDimension),
        days: rowsAsRecords(days, ['day', 'orders', 'revenue']).map(row => ({
          day: parseLabel(row.day),
          orders: parseCount(row.orders),
          revenue: amount(row.revenue),
        })),
      };
    },
  }),
  records: app.defineOperation({
    input: parseRecords,
    checks: [{ ...defaultScope, day: undefined, orderId: undefined }],
    policy: { maxQueryRows: 200, maxDurationMs: 10000 },
    async run({ query }, input) {
      const result = rowsAsRecords(
        await query('records', {
          ...parameters(input),
          day: input.day ?? null,
          orderId: input.orderId ?? null,
        }),
        ['id', 'day', 'customer', 'country', 'amount', 'total']
      );
      return {
        total: result.length ? parseCount(result[0]!.total) : 0,
        rows: result.map(row => ({
          id: parseCount(row.id),
          day: parseLabel(row.day),
          customer: parseLabel(row.customer),
          country: parseLabel(row.country),
          amount: amount(row.amount),
        })),
      };
    },
  }),
};
export function scopeForPlace(input: OverviewInput, row: Place): RecordsInput {
  const { period, region, country, customer } = input;
  return {
    period,
    region,
    country,
    customer,
    ...placeFilter(row),
    day: undefined,
    orderId: undefined,
  };
}
