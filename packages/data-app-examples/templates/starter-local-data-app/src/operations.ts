import { parseCount } from '@altertable/data-app/contract';

import { groupName } from '#app/filters.ts';
import { dataApp } from '#config';

export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', { groupName });
      return queryResult.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  sampleTotal: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleTotal', { groupName });
      const row = queryResult.rows[0];
      return row ? { sampleCount: parseCount(row.sample_count) } : null;
    },
  }),
});
