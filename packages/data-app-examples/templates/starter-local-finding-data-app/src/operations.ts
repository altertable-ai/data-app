import { parseCount } from '@altertable/data-app/contract';

import { dataApp } from '#config';
export const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    input: () => ({}),
    checks: [{}],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('sampleCountsByGroup', {});
      return result.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
};
