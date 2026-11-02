import { parseCount } from '@altertable/data-app/contract';

import { dataApp } from '#config';
export const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    input: value => {
      if (
        !value ||
        typeof value !== 'object' ||
        !('groupName' in value) ||
        typeof value.groupName !== 'string' ||
        !['all', 'Alpha', 'Beta'].includes(value.groupName)
      )
        throw new Error('Expected a fixture group.');
      return { groupName: value.groupName };
    },
    checks: [
      { groupName: 'all' },
      { groupName: 'Alpha' },
      { groupName: 'Beta' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const [groups, segments] = await Promise.all([
        query('sampleCountsByGroup', {
          groupName: groupName === 'all' ? '' : groupName,
        }),
        query('sampleCountsBySegment', {
          groupName: groupName === 'all' ? '' : groupName,
        }),
      ]);
      return {
        groups: groups.rows.map(
          (row): { groupName: 'Alpha' | 'Beta'; sampleCount: number } => {
            if (row.group_name !== 'Alpha' && row.group_name !== 'Beta')
              throw new Error('Unexpected fixture group.');
            return {
              groupName: row.group_name,
              sampleCount: parseCount(row.sample_count),
            };
          }
        ),
        segments: segments.rows.map(row => ({
          segmentName: row.segment_name,
          sampleCount: parseCount(row.sample_count),
        })),
      };
    },
  }),
};
