import {
  parseCount,
  queryDateTimeRangeParams,
} from '@altertable/data-app/contract';

import { operationFilters, periodFilter } from '#app/filters.ts';
import { dataApp } from '#config';

const policy = { maxQueryRows: 500, maxDurationMs: 15000 };
export const operations = dataApp.defineOperations({
  samplesOverTime: dataApp.defineOperation({
    filters: operationFilters.samplesOverTime,
    policy,
    async run({ query }, { period, groupName, grain }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesOverTime', {
        ...bounds.current,
        groupName,
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
    async run({ query }, { period, groupName, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesByMember', {
        ...bounds.current,
        groupName,
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
    async run({ query }, { period, groupName, grain, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('sampleRows', {
        ...bounds.current,
        groupName,
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
