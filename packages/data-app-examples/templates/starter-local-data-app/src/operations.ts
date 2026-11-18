import { parseCount } from '@altertable/data-app/contract';

import { dataApp } from '#config';

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
export const operations = dataApp.defineOperations({
  costsByService: dataApp.defineOperation({
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('costsByService');
      return result.rows.map(row => ({
        serviceName: row.service_name,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
  totalCost: dataApp.defineOperation({
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('totalCost');
      const row = result.rows[0];
      return row ? { cost: parseCount(row.cost_cents) / 100 } : null;
    },
  }),
  costsByCustomer: dataApp.defineOperation({
    input: parseService,
    checks: [{ serviceName: 'Compute' }],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { serviceName }) {
      const result = await query('costsByCustomer', { serviceName });
      return result.rows.map(row => ({
        customerName: row.customer_name,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
});
