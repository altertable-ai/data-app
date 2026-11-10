import { parseCount } from '@altertable/data-app/contract';

import { operationFilters } from '#app/filters.ts';
import { dataApp } from '#config';

/** The fixture queries read an empty group name as every group. */
function queryGroup(groupName: string) {
  return groupName === 'all' ? '' : groupName;
}
export const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    filters: operationFilters.sampleCountsByGroup,
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', {
        groupName: queryGroup(groupName),
      });
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
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsBySegment', {
        groupName: queryGroup(groupName),
      });
      return queryResult.rows.map(row => ({
        segmentName: row.segment_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
};
