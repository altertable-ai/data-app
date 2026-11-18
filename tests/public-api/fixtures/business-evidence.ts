import { defineDataApp } from '@altertable/data-app';
import {
  choiceFilter,
  dateTimeRangeFilter,
  parseCount,
  queryDateTimeRangeParams,
} from '@altertable/data-app/contract';

import { dataApp as categoricalApp } from '@/packages/data-app-examples/templates/starter-local-metric-data-app/app';
import { operationFilters } from '@/packages/data-app-examples/templates/starter-local-metric-data-app/src/filters';

const measures = {
  visits: { type: 'number', nullable: true },
  conversions: { type: 'number', nullable: true },
  revenue: { type: 'number', nullable: true },
  orders: { type: 'number', nullable: true },
  conversion_rate: { type: 'number', nullable: true },
  average_order_value: { type: 'number', nullable: true },
} as const;
const params = {
  period_from: { type: 'string' },
  period_to: { type: 'string' },
  segment: { type: 'string' },
} as const;
const scope = `WHERE traffic.day >= CAST($period_from AS DATE)
  AND traffic.day < CAST($period_to AS DATE)
  AND ($segment = 'all' OR traffic.segment = $segment)`;
const semanticMeasures = `traffic.visits, traffic.conversions, traffic.revenue, traffic.orders,
  conversion_rate, average_order_value`;
export const dataApp = defineDataApp({
  title: 'Business evidence validation',
  description: 'SQL-backed fixtures for findings and semantic metrics.',
  scope: { organization: 'Test', environment: 'mock' },
  queries: {
    sampleCountsByGroup: categoricalApp.queries.sampleCountsByGroup,
    businessTotals: {
      projections: measures,
      params,
      statement: `SELECT visits, conversions, revenue, orders, conversion_rate, average_order_value
FROM SEMANTIC_VIEW(starter_business_performance METRICS ${semanticMeasures} ${scope})`,
    },
    businessBySegment: {
      projections: { segment: { type: 'string' }, ...measures },
      params,
      statement: `SELECT segment, visits, conversions, revenue, orders, conversion_rate, average_order_value
FROM SEMANTIC_VIEW(starter_business_performance DIMENSIONS traffic.segment
  METRICS ${semanticMeasures} ${scope}) ORDER BY segment`,
    },
    businessRevenueByDay: {
      projections: { day: { type: 'string' }, revenue: { type: 'number' } },
      params,
      statement: `SELECT strftime(day, '%Y-%m-%d') AS day, revenue
FROM SEMANTIC_VIEW(starter_business_performance DIMENSIONS traffic.day
  METRICS traffic.revenue ${scope}) ORDER BY day`,
    },
  },
});
export const segment = choiceFilter({
  key: 'segment',
  label: 'Segment',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All segments' },
    { id: 'New', label: 'New' },
    { id: 'Returning', label: 'Returning' },
  ],
});
export const findingPeriod = dateTimeRangeFilter({
  key: 'period',
  comparison: 'on',
  defaultValue: {
    from: new Date('2026-03-09T00:00:00Z'),
    to: new Date('2026-03-16T00:00:00Z'),
  },
  minDate: '2026-02-01',
  maxDate: '2026-03-15',
  maxRangeDays: 28,
});
export const metricPeriod = dateTimeRangeFilter({
  key: 'period',
  defaultValue: {
    from: new Date('2026-03-02T00:00:00Z'),
    to: new Date('2026-03-16T00:00:00Z'),
  },
  minDate: '2026-03-02',
  maxDate: '2026-03-15',
  maxRangeDays: 14,
});
export const nonAdditivePeriod = dateTimeRangeFilter({
  key: 'period',
  defaultValue: {
    from: new Date('2026-03-02T00:00:00Z'),
    to: new Date('2026-03-09T00:00:00Z'),
  },
  minDate: '2026-03-02',
  maxDate: '2026-03-15',
  maxRangeDays: 14,
});
export const groupName = operationFilters.sampleCountsByGroup.groupName;
const policy = { maxQueryRows: 50, maxDurationMs: 15000 };
function readMeasures(row: {
  visits: number | null;
  conversions: number | null;
  revenue: number | null;
  orders: number | null;
  conversion_rate: number | null;
  average_order_value: number | null;
}) {
  if (row.conversion_rate === null || row.average_order_value === null)
    throw new Error('No measured rate or average in this scope.');
  return {
    visits: parseCount(row.visits),
    conversions: parseCount(row.conversions),
    revenue: parseCount(row.revenue),
    orders: parseCount(row.orders),
    rate: row.conversion_rate,
    mean: row.average_order_value,
  };
}
export const rateFindingOperations = dataApp.defineOperations({
  conversion: dataApp.defineOperation({
    filters: { period: findingPeriod, segment },
    policy,
    async run({ query }, { period, segment }) {
      const bounds = queryDateTimeRangeParams(findingPeriod, period, 'period');
      const current = await query('businessTotals', {
        ...bounds.current,
        segment,
      });
      const previous = bounds.comparison
        ? await query('businessTotals', { ...bounds.comparison, segment })
        : null;
      const breakdown = await query('businessBySegment', {
        ...bounds.current,
        segment,
      });
      return {
        current: readMeasures(current.rows[0]!),
        previous: previous ? readMeasures(previous.rows[0]!) : null,
        rows: breakdown.rows.map(row => ({
          segment: row.segment,
          ...readMeasures(row),
        })),
      };
    },
  }),
});
export const categoricalFindingOperations = dataApp.defineOperations({
  distribution: dataApp.defineOperation({
    filters: { groupName },
    policy,
    async run({ query }, { groupName }) {
      const result = await query('sampleCountsByGroup', {
        groupName: groupName === 'all' ? '' : groupName,
      });
      return result.rows.map(row => ({
        group: row.group_name,
        samples: parseCount(row.sample_count),
      }));
    },
  }),
});
export const temporalMetricOperations = dataApp.defineOperations({
  revenue: dataApp.defineOperation({
    filters: { period: metricPeriod, segment },
    policy,
    async run({ query }, { period, segment }) {
      const bounds = queryDateTimeRangeParams(metricPeriod, period, 'period');
      const result = await query('businessRevenueByDay', {
        ...bounds.current,
        segment,
      });
      return result.rows.map(row => ({
        day: row.day,
        revenue: parseCount(row.revenue),
      }));
    },
  }),
});
export const nonAdditiveMetricOperations = dataApp.defineOperations({
  efficiency: dataApp.defineOperation({
    filters: { period: nonAdditivePeriod, segment },
    policy,
    async run({ query }, { period, segment }) {
      const bounds = queryDateTimeRangeParams(
        nonAdditivePeriod,
        period,
        'period'
      );
      const total = await query('businessTotals', {
        ...bounds.current,
        segment,
      });
      const breakdown = await query('businessBySegment', {
        ...bounds.current,
        segment,
      });
      return {
        total: readMeasures(total.rows[0]!),
        rows: breakdown.rows.map(row => ({
          segment: row.segment,
          ...readMeasures(row),
        })),
      };
    },
  }),
});
