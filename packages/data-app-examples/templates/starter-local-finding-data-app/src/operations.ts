import { parseCount } from '@altertable/data-app/contract';

import { operationFilters } from '#app/filters.ts';
import { dataApp } from '#config';
export const operations = {
  samples: dataApp.defineOperation({
    filters: operationFilters.samples,
    policy: { maxQueryRows: 500, maxDurationMs: 15000 },
    async run({ query }, { period: { range, comparison }, grain, breakdown }) {
      const result = await query('samples', {
        start: (comparison?.from ?? range.from).toISOString(),
        end: range.to.toISOString(),
        selected_start: range.from.toISOString(),
        grain,
        breakdown,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        member: row.member,
        sampleCount: parseCount(row.sample_count),
        selected: row.selected,
      }));
    },
  }),
};
