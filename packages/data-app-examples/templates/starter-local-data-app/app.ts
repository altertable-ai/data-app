import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  title: 'Sample counts',
  description: 'Explore sample counts by group.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsByGroup: {
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT group_name, sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
ORDER BY group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    sampleTotal: {
      projections: { sample_count: { type: 'number' } },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT CAST(SUM(sample_count) AS BIGINT) AS sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
HAVING COUNT(*) > 0`,
      params: { groupName: { type: 'string', defaultValue: '' } },
    },
  },
});
