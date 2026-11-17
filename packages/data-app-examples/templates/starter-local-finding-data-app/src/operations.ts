import {
  parseCount,
  queryDateTimeRangeParams,
} from '@altertable/data-app/contract';

import { operationFilters } from '#app/filters.ts';
import { dataApp } from '#config';
// One query per widget: each section loads its own result when it nears the viewport.
const policy = { maxQueryRows: 500, maxDurationMs: 15000 };
export const operations = dataApp.defineOperations({
  sampleTotal: dataApp.defineOperation({
    filters: operationFilters.sampleTotal,
    policy,
    async run({ query }, { period }) {
      const bounds = queryDateTimeRangeParams(
        operationFilters.sampleTotal.period,
        period,
        'period'
      );
      const current = await query('sampleTotal', bounds.current);
      const previous = bounds.comparison
        ? await query('sampleTotal', bounds.comparison)
        : null;
      return {
        current: parseCount(current.rows[0]!.sample_count),
        previous: previous && parseCount(previous.rows[0]!.sample_count),
      };
    },
  }),
  samplesOverTime: dataApp.defineOperation({
    filters: operationFilters.samplesOverTime,
    policy,
    async run({ query }, { period, grain }) {
      // With the comparison on, the trend starts at the previous period.
      const bounds = queryDateTimeRangeParams(
        operationFilters.samplesOverTime.period,
        period,
        'period'
      );
      const result = await query('samplesOverTime', {
        ...bounds.combined,
        grain,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  samplesByMember: dataApp.defineOperation({
    filters: operationFilters.samplesByMember,
    policy,
    async run({ query }, { period, breakdown }) {
      const bounds = queryDateTimeRangeParams(
        operationFilters.samplesByMember.period,
        period,
        'period'
      );
      const result = await query('samplesByMember', {
        ...bounds.current,
        breakdown,
      });
      return result.rows.map(row => ({
        member: row.member,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  sampleRows: dataApp.defineOperation({
    filters: operationFilters.sampleRows,
    policy,
    async run({ query }, { period, grain, breakdown }) {
      const bounds = queryDateTimeRangeParams(
        operationFilters.sampleRows.period,
        period,
        'period'
      );
      const result = await query('sampleRows', {
        ...bounds.current,
        grain,
        breakdown,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        member: row.member,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
});
