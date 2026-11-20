import { parseCount } from '@altertable/data-app/contract';

import { dataApp } from '@/tests/public-api/fixtures/cost-dashboard-local/app';
import {
  month,
  customer,
  breakdown,
} from '@/tests/public-api/fixtures/cost-dashboard-local/src/filters';

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
      // These service names match the fictional SQL rows and chart series.
      // Update the pivot and chart series together when changing the services.
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
