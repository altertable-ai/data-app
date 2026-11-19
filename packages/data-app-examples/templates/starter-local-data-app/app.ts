import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  // Replace the demo title, description, and scope labels with the app's identity.
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
  -- Fictional allocation batches in integer cents.
  -- Replace this CTE with verified billing data.
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
  -- Fictional allocation batches in integer cents.
  -- Replace this CTE with verified billing data.
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
  -- Fictional allocation batches in integer cents.
  -- Replace this CTE with verified billing data.
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
  -- Fictional allocation batches in integer cents.
  -- Replace this CTE with verified billing data.
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
-- The four fictional batch dates match the week_1 through week_4 columns.
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
  -- Fictional allocation batches in integer cents.
  -- Replace this CTE with verified billing data.
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
