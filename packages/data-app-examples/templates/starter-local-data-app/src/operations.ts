import { groupName } from '#app/filters.ts';
import { dataApp } from '#config';

export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10 },
    async run({ query }, { groupName }) {
      const { rows } = await query('sampleCountsByGroup', { groupName });
      return rows.map(row => ({
        groupName: row.group_name,
        sampleCount: row.sample_count,
      }));
    },
  }),
});
