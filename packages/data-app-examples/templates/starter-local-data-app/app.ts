import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  // Replace the demo title, description, and scope labels with the app's identity.
  title: 'Sample counts',
  description: 'Compare fictional sample counts across groups.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsByGroup: {
      // Fictional rows. Replace the CTE with an inspected source.
      statement: `
WITH sample_counts(group_name, sample_count) AS (
  VALUES ('Alpha', 1200), ('Alpha', 800), ('Beta', 450), ('Gamma', 0)
)
SELECT group_name, CAST(SUM(sample_count) AS BIGINT) AS sample_count
FROM sample_counts
WHERE $groupName = 'all' OR group_name = $groupName
GROUP BY group_name
ORDER BY sample_count DESC, group_name
LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: 'all' },
        limit: { type: 'number', defaultValue: 10 },
      },
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
    },
  },
});
