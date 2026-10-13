import { defineDataApp } from '@altertable/data-app';

export const salesApp = defineDataApp({
  title: 'Sales performance',
  description:
    'Net revenue after discounts and refunds. Cancelled orders are excluded.',
  scope: { organization: 'demo', environment: 'sample' },
  queries: {
    revenue: {
      statement: `WITH regions(region) AS (VALUES ('Europe'), ('North America'), ('Asia'), ('Latin America'), ('Middle East'), ('Oceania'))
SELECT r.region, COALESCE(SUM(o.amount - o.discount - o.refund), 0) AS revenue
FROM regions r LEFT JOIN sales_orders o ON o.region = r.region AND o.day >= $start
AND o.day <= $end AND o.segment = $segment AND o.status != 'cancelled'
GROUP BY r.region ORDER BY revenue DESC, r.region`,
      params: { start: {}, end: {}, segment: {} },
    },
    contributingOrders: {
      statement: `SELECT id, customer, country, day, status, amount, discount, refund,
amount - discount - refund AS revenue FROM sales_orders
WHERE day >= $start AND day <= $end AND segment = $segment AND status != 'cancelled'
AND ($region = 'All regions' OR region = $region) ORDER BY day DESC, id`,
      params: { start: {}, end: {}, segment: {}, region: {} },
    },
  },
});
export type SalesInput = {
  start: string;
  end: string;
  segment: 'Enterprise' | 'Self serve';
};
export type OrderInput = SalesInput & { region: string };
export type RevenueRow = { region: string; revenue: number };
export type OrderRow = {
  id: string;
  customer: string;
  country: string;
  day: string;
  status: string;
  amount: number;
  discount: number;
  refund: number;
  revenue: number;
};
function parseSalesInput(value: unknown): SalesInput {
  if (!value || typeof value !== 'object')
    throw new Error('Expected sales scope.');
  const input = value as SalesInput;
  if (
    !['2026-09-01', '2026-10-01'].includes(input.start) ||
    !['2026-09-30', '2026-10-31'].includes(input.end) ||
    input.start.slice(0, 7) !== input.end.slice(0, 7)
  )
    throw new Error('Expected a complete reporting month.');
  if (!['Enterprise', 'Self serve'].includes(input.segment))
    throw new Error('Expected customer segment.');
  return { start: input.start, end: input.end, segment: input.segment };
}
function parseOrdersInput(value: unknown): OrderInput {
  const scope = parseSalesInput(value);
  const { region } = value as OrderInput;
  if (
    ![
      'All regions',
      'Europe',
      'North America',
      'Asia',
      'Latin America',
      'Middle East',
      'Oceania',
    ].includes(region)
  )
    throw new Error('Unknown region.');
  return { ...scope, region };
}
const scope: SalesInput = {
  start: '2026-09-01',
  end: '2026-09-30',
  segment: 'Enterprise',
};
export const operations = {
  salesOverview: salesApp.defineOperation({
    input: parseSalesInput,
    output: (value: unknown) => value as RevenueRow[],
    checks: [scope],
    policy: { maxQueryRows: 6, maxDurationMs: 10000 },
    async run({ query }, input) {
      const result = await query('revenue', input);
      return result.rows.map(([region, revenue]) => ({
        region: String(region),
        revenue: Number(revenue),
      }));
    },
  }),
  salesOrders: salesApp.defineOperation({
    input: parseOrdersInput,
    output: (value: unknown) => value as OrderRow[],
    checks: [{ ...scope, region: 'Europe' }],
    policy: { maxQueryRows: 100, maxDurationMs: 10000 },
    async run({ query }, input) {
      const result = await query('contributingOrders', input);
      return result.rows.map(
        ([
          id,
          customer,
          country,
          day,
          status,
          amount,
          discount,
          refund,
          revenue,
        ]) => ({
          id: String(id),
          customer: String(customer),
          country: String(country),
          day: String(day),
          status: String(status),
          amount: Number(amount),
          discount: Number(discount),
          refund: Number(refund),
          revenue: Number(revenue),
        })
      );
    },
  }),
};
