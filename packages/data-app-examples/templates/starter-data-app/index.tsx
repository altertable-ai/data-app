import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  mountDataApp,
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  Stack,
} from '@altertable/data-app-react';
import { BarChart, ComposedChart } from '@altertable/data-app-react/ui';
import {
  parseCount,
  choiceFilter,
  displayChoice,
} from '@altertable/data-app/contract';
import { formatDateRange } from '@altertable/data-app/format';

export const dataApp = defineDataApp({
  // Demo identity and scope; replace these for the app being built.
  title: 'Infrastructure costs',
  description: 'USD · Fictional weekly allocations',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    costBreakdown: {
      projections: {
        member_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(month, service_name, customer_name, week_1, week_2, week_3, week_4) AS (
  -- Placeholder allocations only. Replace this CTE with verified billing data.
  -- Each week_N value is a recorded demo allocation batch, in integer cents.
  VALUES
    ('2026-09', 'Compute', 'Atlas', 84000, 126000, 84000, 126000),
    ('2026-09', 'Compute', 'Beacon', 42000, 63000, 42000, 63000),
    ('2026-09', 'Compute', 'Cedar', 18000, 27000, 18000, 27000),
    ('2026-09', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-09', 'Storage', 'Beacon', 84000, 56000, 84000, 56000),
    ('2026-09', 'Storage', 'Cedar', 36000, 24000, 36000, 24000),
    ('2026-09', 'Networking', 'Atlas', 3000, 6000, 9000, 12000),
    ('2026-09', 'Networking', 'Beacon', 6000, 12000, 18000, 24000),
    ('2026-09', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-09', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Cedar', 0, 0, 0, 0),
    ('2026-08', 'Compute', 'Atlas', 76000, 114000, 76000, 114000),
    ('2026-08', 'Compute', 'Beacon', 40000, 60000, 40000, 60000),
    ('2026-08', 'Compute', 'Cedar', 16000, 24000, 16000, 24000),
    ('2026-08', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-08', 'Storage', 'Beacon', 75000, 50000, 75000, 50000),
    ('2026-08', 'Storage', 'Cedar', 33000, 22000, 33000, 22000),
    ('2026-08', 'Networking', 'Atlas', 2000, 4000, 6000, 8000),
    ('2026-08', 'Networking', 'Beacon', 5000, 10000, 15000, 20000),
    ('2026-08', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-08', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Cedar', 0, 0, 0, 0)
),
selected_costs AS (
  SELECT service_name, customer_name,
    week_1 + week_2 + week_3 + week_4 AS cost_cents
  FROM infrastructure_costs
  WHERE month = $month AND ($customerName = '' OR customer_name = $customerName)
)
SELECT CASE WHEN $breakdown = 'service' THEN service_name ELSE customer_name END AS member_name,
  CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM selected_costs GROUP BY member_name
ORDER BY cost_cents DESC, member_name LIMIT $limit`,
      params: {
        month: { type: 'string', defaultValue: '2026-09' },
        customerName: { type: 'string', defaultValue: '' },
        breakdown: { type: 'string', defaultValue: 'service' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    totalCost: {
      projections: {
        cost_cents: { type: 'number' },
        customer_count: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(month, service_name, customer_name, week_1, week_2, week_3, week_4) AS (
  -- Placeholder allocations only. Replace this CTE with verified billing data.
  -- Each week_N value is a recorded demo allocation batch, in integer cents.
  VALUES
    ('2026-09', 'Compute', 'Atlas', 84000, 126000, 84000, 126000),
    ('2026-09', 'Compute', 'Beacon', 42000, 63000, 42000, 63000),
    ('2026-09', 'Compute', 'Cedar', 18000, 27000, 18000, 27000),
    ('2026-09', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-09', 'Storage', 'Beacon', 84000, 56000, 84000, 56000),
    ('2026-09', 'Storage', 'Cedar', 36000, 24000, 36000, 24000),
    ('2026-09', 'Networking', 'Atlas', 3000, 6000, 9000, 12000),
    ('2026-09', 'Networking', 'Beacon', 6000, 12000, 18000, 24000),
    ('2026-09', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-09', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Cedar', 0, 0, 0, 0),
    ('2026-08', 'Compute', 'Atlas', 76000, 114000, 76000, 114000),
    ('2026-08', 'Compute', 'Beacon', 40000, 60000, 40000, 60000),
    ('2026-08', 'Compute', 'Cedar', 16000, 24000, 16000, 24000),
    ('2026-08', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-08', 'Storage', 'Beacon', 75000, 50000, 75000, 50000),
    ('2026-08', 'Storage', 'Cedar', 33000, 22000, 33000, 22000),
    ('2026-08', 'Networking', 'Atlas', 2000, 4000, 6000, 8000),
    ('2026-08', 'Networking', 'Beacon', 5000, 10000, 15000, 20000),
    ('2026-08', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-08', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Cedar', 0, 0, 0, 0)
),
selected_costs AS (
  SELECT service_name, customer_name,
    week_1 + week_2 + week_3 + week_4 AS cost_cents
  FROM infrastructure_costs
  WHERE month = $month AND ($customerName = '' OR customer_name = $customerName)
)
SELECT CAST(SUM(cost_cents) AS BIGINT) AS cost_cents,
  COUNT(DISTINCT customer_name) AS customer_count
FROM selected_costs HAVING COUNT(*) > 0`,
      params: {
        month: { type: 'string', defaultValue: '2026-09' },
        customerName: { type: 'string', defaultValue: '' },
      },
    },
    costsByCustomer: {
      projections: {
        customer_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(month, service_name, customer_name, week_1, week_2, week_3, week_4) AS (
  -- Placeholder allocations only. Replace this CTE with verified billing data.
  -- Each week_N value is a recorded demo allocation batch, in integer cents.
  VALUES
    ('2026-09', 'Compute', 'Atlas', 84000, 126000, 84000, 126000),
    ('2026-09', 'Compute', 'Beacon', 42000, 63000, 42000, 63000),
    ('2026-09', 'Compute', 'Cedar', 18000, 27000, 18000, 27000),
    ('2026-09', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-09', 'Storage', 'Beacon', 84000, 56000, 84000, 56000),
    ('2026-09', 'Storage', 'Cedar', 36000, 24000, 36000, 24000),
    ('2026-09', 'Networking', 'Atlas', 3000, 6000, 9000, 12000),
    ('2026-09', 'Networking', 'Beacon', 6000, 12000, 18000, 24000),
    ('2026-09', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-09', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Cedar', 0, 0, 0, 0),
    ('2026-08', 'Compute', 'Atlas', 76000, 114000, 76000, 114000),
    ('2026-08', 'Compute', 'Beacon', 40000, 60000, 40000, 60000),
    ('2026-08', 'Compute', 'Cedar', 16000, 24000, 16000, 24000),
    ('2026-08', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-08', 'Storage', 'Beacon', 75000, 50000, 75000, 50000),
    ('2026-08', 'Storage', 'Cedar', 33000, 22000, 33000, 22000),
    ('2026-08', 'Networking', 'Atlas', 2000, 4000, 6000, 8000),
    ('2026-08', 'Networking', 'Beacon', 5000, 10000, 15000, 20000),
    ('2026-08', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-08', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Cedar', 0, 0, 0, 0)
),
selected_costs AS (
  SELECT service_name, customer_name,
    week_1 + week_2 + week_3 + week_4 AS cost_cents
  FROM infrastructure_costs
  WHERE month = $month AND ($customerName = '' OR customer_name = $customerName)
)
SELECT customer_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM selected_costs WHERE service_name = $serviceName
GROUP BY customer_name ORDER BY cost_cents DESC, customer_name LIMIT $limit`,
      params: {
        month: { type: 'string', defaultValue: '2026-09' },
        customerName: { type: 'string', defaultValue: '' },
        serviceName: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    costTrend: {
      projections: {
        period_start: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(month, service_name, customer_name, week_1, week_2, week_3, week_4) AS (
  -- Placeholder allocations only. Replace this CTE with verified billing data.
  -- Each week_N value is a recorded demo allocation batch, in integer cents.
  VALUES
    ('2026-09', 'Compute', 'Atlas', 84000, 126000, 84000, 126000),
    ('2026-09', 'Compute', 'Beacon', 42000, 63000, 42000, 63000),
    ('2026-09', 'Compute', 'Cedar', 18000, 27000, 18000, 27000),
    ('2026-09', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-09', 'Storage', 'Beacon', 84000, 56000, 84000, 56000),
    ('2026-09', 'Storage', 'Cedar', 36000, 24000, 36000, 24000),
    ('2026-09', 'Networking', 'Atlas', 3000, 6000, 9000, 12000),
    ('2026-09', 'Networking', 'Beacon', 6000, 12000, 18000, 24000),
    ('2026-09', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-09', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Cedar', 0, 0, 0, 0),
    ('2026-08', 'Compute', 'Atlas', 76000, 114000, 76000, 114000),
    ('2026-08', 'Compute', 'Beacon', 40000, 60000, 40000, 60000),
    ('2026-08', 'Compute', 'Cedar', 16000, 24000, 16000, 24000),
    ('2026-08', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-08', 'Storage', 'Beacon', 75000, 50000, 75000, 50000),
    ('2026-08', 'Storage', 'Cedar', 33000, 22000, 33000, 22000),
    ('2026-08', 'Networking', 'Atlas', 2000, 4000, 6000, 8000),
    ('2026-08', 'Networking', 'Beacon', 5000, 10000, 15000, 20000),
    ('2026-08', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-08', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Cedar', 0, 0, 0, 0)
),
-- Demo batch dates correspond to the four week_N fixture columns.
weeks(day) AS (VALUES ('01'), ('08'), ('15'), ('22'))
SELECT $month || '-' || day AS period_start,
  CAST(SUM(CASE day WHEN '01' THEN week_1 WHEN '08' THEN week_2
    WHEN '15' THEN week_3 ELSE week_4 END) AS BIGINT) AS cost_cents
FROM infrastructure_costs CROSS JOIN weeks
WHERE month = $month AND ($customerName = '' OR customer_name = $customerName)
GROUP BY day ORDER BY day LIMIT $limit`,
      params: {
        month: { type: 'string', defaultValue: '2026-09' },
        customerName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    customerServiceMix: {
      projections: {
        customer_name: { type: 'string' },
        service_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(month, service_name, customer_name, week_1, week_2, week_3, week_4) AS (
  -- Placeholder allocations only. Replace this CTE with verified billing data.
  -- Each week_N value is a recorded demo allocation batch, in integer cents.
  VALUES
    ('2026-09', 'Compute', 'Atlas', 84000, 126000, 84000, 126000),
    ('2026-09', 'Compute', 'Beacon', 42000, 63000, 42000, 63000),
    ('2026-09', 'Compute', 'Cedar', 18000, 27000, 18000, 27000),
    ('2026-09', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-09', 'Storage', 'Beacon', 84000, 56000, 84000, 56000),
    ('2026-09', 'Storage', 'Cedar', 36000, 24000, 36000, 24000),
    ('2026-09', 'Networking', 'Atlas', 3000, 6000, 9000, 12000),
    ('2026-09', 'Networking', 'Beacon', 6000, 12000, 18000, 24000),
    ('2026-09', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-09', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-09', 'Logging', 'Cedar', 0, 0, 0, 0),
    ('2026-08', 'Compute', 'Atlas', 76000, 114000, 76000, 114000),
    ('2026-08', 'Compute', 'Beacon', 40000, 60000, 40000, 60000),
    ('2026-08', 'Compute', 'Cedar', 16000, 24000, 16000, 24000),
    ('2026-08', 'Storage', 'Atlas', 24000, 16000, 24000, 16000),
    ('2026-08', 'Storage', 'Beacon', 75000, 50000, 75000, 50000),
    ('2026-08', 'Storage', 'Cedar', 33000, 22000, 33000, 22000),
    ('2026-08', 'Networking', 'Atlas', 2000, 4000, 6000, 8000),
    ('2026-08', 'Networking', 'Beacon', 5000, 10000, 15000, 20000),
    ('2026-08', 'Networking', 'Cedar', 3000, 6000, 9000, 12000),
    ('2026-08', 'Logging', 'Atlas', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Beacon', 0, 0, 0, 0),
    ('2026-08', 'Logging', 'Cedar', 0, 0, 0, 0)
),
selected_costs AS (
  SELECT service_name, customer_name,
    week_1 + week_2 + week_3 + week_4 AS cost_cents
  FROM infrastructure_costs
  WHERE month = $month AND ($customerName = '' OR customer_name = $customerName)
)
SELECT customer_name, service_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM selected_costs GROUP BY customer_name, service_name
ORDER BY customer_name, service_name LIMIT $limit`,
      params: {
        month: { type: 'string', defaultValue: '2026-09' },
        customerName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 20 },
      },
    },
  },
});

// Demo periods: replace with the billing months available in the source.
const month = choiceFilter({
  key: 'month',
  label: 'Month',
  defaultValue: '2026-09',
  options: [
    { id: '2026-09', label: 'September 2026' },
    { id: '2026-08', label: 'August 2026' },
  ],
});
// Demo customers: replace with source-backed customer choices.
const customer = choiceFilter({
  key: 'customer',
  label: 'Customer',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All customers' },
    { id: 'Atlas', label: 'Atlas' },
    { id: 'Beacon', label: 'Beacon' },
    { id: 'Cedar', label: 'Cedar' },
  ],
});
const breakdown = displayChoice({
  key: 'breakdown',
  label: 'Breakdown',
  defaultValue: 'service',
  options: [
    { id: 'service', label: 'Service' },
    { id: 'customer', label: 'Customer' },
  ],
});

function parseService(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('serviceName' in value) ||
    typeof value.serviceName !== 'string' ||
    value.serviceName.trim().length === 0 ||
    value.serviceName.length > 100
  )
    throw new Error('Choose a service to inspect its customer costs.');
  return { serviceName: value.serviceName };
}
function queryScope(input: { month: string; customer: string }) {
  return {
    month: input.month,
    customerName: input.customer === 'all' ? '' : input.customer,
  };
}
export const operations = dataApp.defineOperations({
  costBreakdown: dataApp.defineOperation({
    filters: { month, customer, breakdown },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('costBreakdown', {
        ...queryScope(input),
        breakdown: input.breakdown,
      });
      return result.rows.map(row => ({
        memberName: row.member_name,
        dimension: input.breakdown,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
  totalCost: dataApp.defineOperation({
    filters: { month, customer },
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('totalCost', queryScope(input));
      const row = result.rows[0];
      if (!row) return null;
      const cost = parseCount(row.cost_cents) / 100;
      const customerCount = parseCount(row.customer_count);
      if (customerCount === 0)
        throw new Error('Allocations must identify at least one customer.');
      return {
        cost,
        customerCount,
        averageCost: cost / customerCount,
      };
    },
  }),
  costsByCustomer: dataApp.defineOperation({
    filters: { month, customer },
    input: parseService,
    checks: [{ serviceName: 'Compute' }],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('costsByCustomer', {
        ...queryScope(input),
        serviceName: input.serviceName,
      });
      return result.rows.map(row => ({
        customerName: row.customer_name,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
  costTrend: dataApp.defineOperation({
    filters: { month, customer },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('costTrend', queryScope(input));
      return result.rows.map(row => ({
        periodStart: row.period_start,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
  customerServiceMix: dataApp.defineOperation({
    filters: { month, customer },
    policy: { maxQueryRows: 20, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query('customerServiceMix', queryScope(input));
      // Demo service columns: adapt this pivot when replacing the billing source.
      const customers = new Map<
        string,
        {
          customerName: string;
          Compute: number;
          Storage: number;
          Networking: number;
          Logging: number;
          total: number;
        }
      >();
      for (const row of result.rows) {
        const service = row.service_name;
        if (
          service !== 'Compute' &&
          service !== 'Storage' &&
          service !== 'Networking' &&
          service !== 'Logging'
        )
          throw new Error('Unexpected fixture service.');
        const entry = customers.get(row.customer_name) ?? {
          customerName: row.customer_name,
          Compute: 0,
          Storage: 0,
          Networking: 0,
          Logging: 0,
          total: 0,
        };
        const cost = parseCount(row.cost_cents) / 100;
        entry[service] += cost;
        entry.total += cost;
        customers.set(row.customer_name, entry);
      }
      return [...customers.values()].sort(
        (a, b) =>
          b.total - a.total || a.customerName.localeCompare(b.customerName)
      );
    },
  }),
});

const queryNames = {
  ...operations.costBreakdown.queryNames,
  ...operations.totalCost.queryNames,
  ...operations.costsByCustomer.queryNames,
  ...operations.costTrend.queryNames,
  ...operations.customerServiceMix.queryNames,
};
// Illustrative definitions and coverage; verify them against the real source.
const costDataContext = createDataContext(queryNames)({
  description:
    'Fictional weekly customer allocations for August and September 2026. Scope filters apply to every chart and its contributing records.',
  glossary: {
    allocatedCost: {
      term: 'Allocated cost',
      definition:
        'USD charges in the selected billing month and customer scope. Four recorded allocation batches, dated the 1st, 8th, 15th and 22nd, sum to each monthly allocation. Customers sum to services; services sum to the total. Zero is a recorded charge of zero.',
      queryNames: Object.values(queryNames),
    },
    customerCount: {
      term: 'Customers',
      definition:
        'Distinct customers with recorded allocations in the selected scope, including recorded zero charges.',
      queryNames: [queryNames.totalCost],
    },
    averageCustomerCost: {
      term: 'Average per customer',
      definition:
        'Total allocated cost divided by the number of distinct customers in the same selected scope, including customers with zero charges.',
      queryNames: [queryNames.totalCost],
    },
  },
});

// Demo reporting currency: align this format with the verified billing unit.
const costFormat = { kind: 'currency', currency: 'USD' } as const;
const { defineView, defineDetailView } = createDataHooks(
  operations.createDataClient()
);
const emptyFallback = {
  title: 'No allocations',
  description: 'Choose another month or customer.',
};
const servicesView = defineView({
  dataContext: costDataContext,
  operation: 'costBreakdown',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const serviceCosts = servicesView.dataset({
  name: 'Cost breakdown',
  select: rows => rows,
  rowKey: row => row.memberName,
  columns: {
    memberName: { label: 'Member', value: row => row.memberName },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'cost-breakdown', glossaryIds: ['allocatedCost'] },
});
const totalView = defineView({
  dataContext: costDataContext,
  operation: 'totalCost',
  isEmpty: total => total === null,
  emptyFallback: { title: 'No total available' },
});
const totalCost = totalView.metric(
  {
    id: 'total-cost',
    glossaryId: 'allocatedCost',
    label: 'Total cost',
    format: costFormat,
  },
  total => {
    if (total === null)
      throw new Error('No allocated total for this selection.');
    return { current: total.cost };
  }
);
const customerCount = totalView.metric(
  {
    id: 'customer-count',
    glossaryId: 'customerCount',
    label: 'Customers',
    format: { kind: 'count' },
  },
  total => {
    if (total === null)
      throw new Error('No customer count for this selection.');
    return { current: total.customerCount };
  }
);
const averageCost = totalView.metric(
  {
    id: 'average-cost',
    glossaryId: 'averageCustomerCost',
    label: 'Average per customer',
    format: costFormat,
  },
  total => {
    if (total === null) throw new Error('No average cost for this selection.');
    return { current: total.averageCost };
  }
);
const totalContent = totalView.content(result => (
  <Grid columns={3}>
    <MetricWidget metric={totalCost} source={result} />
    <MetricWidget metric={customerCount} source={result} />
    <MetricWidget metric={averageCost} source={result} />
  </Grid>
));
const customersView = defineDetailView({
  id: 'service-customers',
  title: 'Customer costs',
  operation: 'costsByCustomer',
  dataContext: costDataContext,
  parseInput: operations.costsByCustomer.input,
  describeInput: input =>
    `${input.serviceName} · ${month.describe?.(input.month)} · USD`,
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No customer allocations',
    description:
      'No allocations are recorded for this service in the selected month and customer scope.',
  },
});
const customerCosts = customersView.dataset({
  name: 'Customer allocations',
  select: rows => rows,
  rowKey: row => row.customerName,
  columns: {
    customerName: { label: 'Customer', value: row => row.customerName },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'costs-by-customer', glossaryIds: ['allocatedCost'] },
});
const customersDetail = customersView.content(result => (
  <TableWidget
    dataset={customerCosts}
    source={result}
    title="Cost by customer"
    pagination={false}
  />
));
const serviceActions = serviceCosts.actions(
  action => ({
    customers: action.detail({
      label: 'View customers',
      target: customersView,
      when: row => row.dimension === 'service',
      input: row => ({ serviceName: row.memberName }),
    }),
  }),
  { primary: 'customers' }
);
const breakdownContent = servicesView.content(result => {
  const byService = result.loading || result.input.breakdown === 'service';
  return (
    <VisualizationWidget
      dataset={serviceCosts}
      source={result}
      title={byService ? 'Cost by service' : 'Cost by customer'}
      actions={serviceActions}
      breakdown={servicesView.breakdown('breakdown')}
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel={byService ? 'Costs by service' : 'Costs by customer'}
          unit="USD"
          showYAxis
          scrollToEnd={false}
          valueFormat={costFormat}
          items={rows.map(row => ({
            ...row,
            id: row.memberName,
            label: row.memberName,
            value: row.cost,
          }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
  );
});
const trendView = defineView({
  dataContext: costDataContext,
  operation: 'costTrend',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const weeklyCosts = trendView.dataset({
  name: 'Weekly allocations',
  select: rows => rows,
  rowKey: row => row.periodStart,
  columns: {
    periodStart: { label: 'Allocation date', value: row => row.periodStart },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'cost-trend', glossaryIds: ['allocatedCost'] },
});
const trendContent = trendView.content(result => (
  <VisualizationWidget
    dataset={weeklyCosts}
    source={result}
    title="Weekly allocated cost"
  >
    {rows => (
      <ComposedChart
        data={rows}
        ariaLabel="Costs over time"
        valueFormat={costFormat}
      >
        <ComposedChart.XAxis
          dataKey="periodStart"
          tickFormatter={value =>
            formatDateRange({ start: String(value), end: String(value) })
          }
        />
        <ComposedChart.YAxis domain={[0, 'auto']} />
        <ComposedChart.Tooltip />
        <ComposedChart.Line dataKey="cost" name="Allocated cost" />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
const mixView = defineView({
  dataContext: costDataContext,
  operation: 'customerServiceMix',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const customerMix = mixView.dataset({
  name: 'Customer service mix',
  select: rows => rows,
  rowKey: row => row.customerName,
  columns: {
    customerName: { label: 'Customer', value: row => row.customerName },
    Compute: { value: row => row.Compute, format: costFormat },
    Storage: { value: row => row.Storage, format: costFormat },
    Networking: { value: row => row.Networking, format: costFormat },
    Logging: { value: row => row.Logging, format: costFormat },
  },
  evidence: { id: 'customer-service-mix', glossaryIds: ['allocatedCost'] },
});
const mixContent = mixView.content(result => (
  <VisualizationWidget
    dataset={customerMix}
    source={result}
    title="Service mix by customer"
  >
    {rows => (
      <ComposedChart
        data={rows}
        ariaLabel="Service mix by customer"
        valueFormat={costFormat}
      >
        <ComposedChart.XAxis dataKey="customerName" />
        <ComposedChart.YAxis domain={[0, 'auto']} />
        <ComposedChart.Tooltip />
        <ComposedChart.Legend />
        {/* Demo services: keep these series aligned with the source and pivot. */}
        <ComposedChart.Bar dataKey="Compute" name="Compute" stackId="cost" />
        <ComposedChart.Bar
          dataKey="Storage"
          name="Storage"
          stackId="cost"
          fill="var(--atbl-chart-2)"
        />
        <ComposedChart.Bar
          dataKey="Networking"
          name="Networking"
          stackId="cost"
          fill="var(--atbl-chart-3)"
        />
        <ComposedChart.Bar
          dataKey="Logging"
          name="Logging"
          stackId="cost"
          fill="var(--atbl-chart-4)"
        />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
function App() {
  return (
    <DataApp
      view={servicesView}
      summaryViews={[totalView]}
      details={[customersDetail]}
    >
      <Stack>
        <DataSection content={totalContent} label="Cost summary" />
        <Grid columns={2}>
          <DataSection content={trendContent} label="Cost trend" />
          <DataSection content={breakdownContent} label="Cost overview" />
        </Grid>
        <DataSection content={mixContent} label="Customer composition" />
      </Stack>
    </DataApp>
  );
}

mountDataApp({ app: dataApp, component: App });
