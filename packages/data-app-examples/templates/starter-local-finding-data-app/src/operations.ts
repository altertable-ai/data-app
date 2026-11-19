import {
  parseCount,
  queryDateTimeRangeParams,
} from '@altertable/data-app/contract';

import { operationFilters, periodFilter } from '#app/filters.ts';
import { dataApp } from '#config';

const policy = { maxQueryRows: 500, maxDurationMs: 15000 };
export const operations = dataApp.defineOperations({
  sampleTotals: dataApp.defineOperation({
    filters: operationFilters.sampleTotals,
    policy,
    async run({ query }, { period, groupName }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const [current, previous] = await Promise.all([
        query('sampleTotals', { ...bounds.current, groupName }),
        bounds.comparison
          ? query('sampleTotals', { ...bounds.comparison, groupName })
          : null,
      ]);
      const row = current.rows[0];
      if (!row) return [];
      const baseline = previous?.rows[0];
      return [
        {
          currentCount: parseCount(row.sample_count),
          previousCount: baseline ? parseCount(baseline.sample_count) : null,
        },
      ];
    },
  }),
  samplesOverTime: dataApp.defineOperation({
    filters: operationFilters.samplesOverTime,
    policy,
    async run({ query }, { period, groupName, grain }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesOverTime', {
        ...bounds.combined,
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
      const [current, previous] = await Promise.all([
        query('samplesByMember', { ...bounds.current, groupName, breakdown }),
        bounds.comparison
          ? query('samplesByMember', {
              ...bounds.comparison,
              groupName,
              breakdown,
            })
          : null,
      ]);
      const currentCounts = new Map(
        current.rows.map(row => [row.member, parseCount(row.sample_count)])
      );
      const previousCounts = new Map(
        previous?.rows.map(row => [row.member, parseCount(row.sample_count)])
      );
      const members = new Set([
        ...currentCounts.keys(),
        ...previousCounts.keys(),
      ]);
      return [...members]
        .map(member => {
          const currentCount = currentCounts.get(member) ?? null;
          const previousCount = previousCounts.get(member) ?? null;
          const change =
            currentCount !== null && previousCount !== null
              ? currentCount - previousCount
              : null;
          return {
            member,
            currentCount,
            previousCount,
            change,
            changeRate:
              change !== null && previousCount !== null && previousCount > 0
                ? change / previousCount
                : null,
          };
        })
        .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0));
    },
  }),
  sampleRows: dataApp.defineOperation({
    filters: operationFilters.sampleRows,
    policy,
    async run({ query }, { period, groupName, grain, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('sampleRows', {
        ...bounds.combined,
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
