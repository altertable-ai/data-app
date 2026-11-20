import { parseCount } from '@altertable/data-app/contract';

import { operationFilters } from '#app/filters.ts';
import { dataApp } from '#config';

export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: operationFilters.sampleCountsByGroup,
    policy: { maxQueryRows: 10 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', { groupName });
      return queryResult.rows.map(
        (row): { groupName: 'Alpha' | 'Beta'; sampleCount: number } => {
          if (row.group_name !== 'Alpha' && row.group_name !== 'Beta')
            throw new Error('Unexpected fixture group.');
          return {
            groupName: row.group_name,
            sampleCount: parseCount(row.sample_count),
          };
        }
      );
    },
  }),
  sampleCountsBySegment: dataApp.defineOperation({
    filters: operationFilters.sampleCountsBySegment,
    policy: { maxQueryRows: 10 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsBySegment', { groupName });
      return queryResult.rows.map(row => ({
        segmentName: row.segment_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
});
