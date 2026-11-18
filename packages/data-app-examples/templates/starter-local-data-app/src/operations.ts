import { parseCount } from '@altertable/data-app/contract';

import { groupName } from '#app/filters.ts';
import { dataApp } from '#config';

type SampleGroup = Exclude<typeof groupName.defaultValue, 'all'>;

/** The fixture queries read an empty group name as every group. */
function queryGroup(groupName: string) {
  return groupName === 'all' ? '' : groupName;
}
export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', {
        groupName: queryGroup(groupName),
      });
      return queryResult.rows.map(
        (row): { groupName: SampleGroup; sampleCount: number } => {
          const groupName = row.group_name;
          if (
            groupName !== 'Alpha' &&
            groupName !== 'Gamma' &&
            groupName !== 'Delta' &&
            groupName !== 'Beta'
          )
            throw new Error('Unexpected fixture group.');
          return { groupName, sampleCount: parseCount(row.sample_count) };
        }
      );
    },
  }),
  sampleTotal: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleTotal', {
        groupName: queryGroup(groupName),
      });
      const row = queryResult.rows[0];
      return row ? { sampleCount: parseCount(row.sample_count) } : null;
    },
  }),
});
