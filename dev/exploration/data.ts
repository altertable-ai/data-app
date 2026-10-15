import { defineDataApp } from '@altertable/data-app';
import {
  defineDateRangeContract,
  parseCount,
  parseLabel,
  rowsAsRecords,
  type QueryResult,
} from '@altertable/data-app/contract';

export const app = defineDataApp({
  title: 'Sales explorer',
  description:
    'Follow paid revenue from region to country to customer, then inspect the orders behind it.',
  scope: { organization: 'Sample store', environment: 'Demo' },
  queries: {
    countries: {
      statement: `SELECT code AS value, name AS label FROM countries
        WHERE region = $region AND ($member IS NULL OR code = $member) ORDER BY name LIMIT 200`,
      params: { region: {}, member: {} },
    },
    customers: {
      statement: `SELECT c.id AS value, c.name AS label FROM customers c JOIN countries g ON g.code = c.country
        WHERE g.region = $region AND c.country = $country AND ($member IS NULL OR c.id = $member)
        ORDER BY c.name LIMIT 200`,
      params: { region: {}, country: {}, member: {} },
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
      statement: `SELECT CASE $level WHEN 'region' THEN g.region WHEN 'country' THEN g.code ELSE CAST(c.id AS TEXT) END AS member,
        CASE $level WHEN 'region' THEN g.region WHEN 'country' THEN g.name ELSE c.name END AS label,
        COUNT(*) AS orders, SUM(o.amount_cents) / 100.0 AS revenue, MIN(g.region) AS region, MIN(g.code) AS country
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
        level: {},
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
export const geography = app.defineHierarchy({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [
        { value: 'Europe', label: 'Europe' },
        { value: 'North America', label: 'North America' },
      ],
    },
    {
      id: 'country',
      label: 'Country',
      valueType: 'string',
      source: { query: 'countries' },
    },
    {
      id: 'customer',
      label: 'Customer',
      valueType: 'number',
      source: { query: 'customers' },
    },
  ],
});
export const revenueBy = geography.breakdown({
  key: 'revenue-by',
  label: 'Revenue breakdown',
});
export const ordersBy = geography.breakdown({
  key: 'orders-by',
  label: 'Orders breakdown',
});
function parsePeriod(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Choose a period.');
  return {
    period: calendar.parseRequest((value as { period: unknown }).period),
  };
}
const parseOverview = geography.input(parsePeriod, {
  breakdowns: { revenueBy, ordersBy },
});
export type OverviewInput = ReturnType<typeof parseOverview>;
const parseRecords = geography.input((value: unknown) => {
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
});
export type RecordsInput = ReturnType<typeof parseRecords>;
export type Place = {
  id: string;
  label: string;
  region: string;
  country: string;
  revenue: number;
  orders: number;
} & (
  | { level: 'region' | 'country'; member: string }
  | { level: 'customer'; member: number }
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
function places(result: QueryResult, level: Place['level']): Place[] {
  return rowsAsRecords(result, [
    'member',
    'label',
    'orders',
    'revenue',
    'region',
    'country',
  ]).map(row => ({
    id: `${level}:${level === 'customer' ? parseCount(row.member) : parseLabel(row.member)}`,
    label: parseLabel(row.label),
    orders: parseCount(row.orders),
    revenue: amount(row.revenue),
    region: parseLabel(row.region),
    country: parseLabel(row.country),
    ...(level === 'customer'
      ? { level, member: parseCount(row.member) }
      : { level, member: parseLabel(row.member) }),
  }));
}
function parameters(input: {
  period: OverviewInput['period'];
  geography: OverviewInput['geography'];
}) {
  const { selection } = input.geography;
  return {
    ...input.period.range,
    region:
      selection.region.kind === 'all'
        ? null
        : selection.region.members[0].value,
    country:
      selection.country.kind === 'all'
        ? null
        : selection.country.members[0].value,
    customer:
      selection.customer.kind === 'all'
        ? null
        : selection.customer.members[0].value,
  };
}
const defaultScope = {
  period: calendar.request({ start: '2026-10-01', end: '2026-10-14' }),
  geography: geography.defaultValue,
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
      const revenueLevel = revenueBy.level(input.revenueBy, input.geography).id;
      const orderLevel = ordersBy.level(input.ordersBy, input.geography).id;
      const [totals, revenue, orders, days] = await Promise.all([
        query('totals', params),
        query('places', { ...params, level: revenueLevel }),
        query('places', { ...params, level: orderLevel }),
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
        revenue: places(revenue, revenueLevel),
        orders: places(orders, orderLevel),
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
  const scope =
    row.level === 'customer'
      ? geography.transition(input.geography, {
          region: row.region,
          country: row.country,
          customer: row.member,
        })
      : row.level === 'country'
        ? geography.transition(input.geography, {
            region: row.region,
            country: row.member,
          })
        : geography.transition(input.geography, { region: row.member });
  return {
    period: input.period,
    geography: scope,
    day: undefined,
    orderId: undefined,
  };
}
