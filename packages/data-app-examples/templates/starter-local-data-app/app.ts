import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  title: 'Infrastructure costs',
  description: 'September 2026 · USD · Fictional data',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    costsByService: {
      projections: {
        service_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT service_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs
GROUP BY service_name
ORDER BY cost_cents DESC, service_name LIMIT $limit`,
      params: { limit: { type: 'number', defaultValue: 10 } },
    },
    totalCost: {
      projections: { cost_cents: { type: 'number' } },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs HAVING COUNT(*) > 0`,
      params: {},
    },
    costsByCustomer: {
      projections: {
        customer_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT customer_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs
WHERE service_name = $serviceName
GROUP BY customer_name
ORDER BY cost_cents DESC, customer_name LIMIT $limit`,
      params: {
        serviceName: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
  },
});
