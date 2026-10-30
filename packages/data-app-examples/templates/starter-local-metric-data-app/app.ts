import { defineDataApp } from '@altertable/data-app';
export const dataApp = defineDataApp({
  title: 'Sample metric',
  description: 'Fixture counts by group; replace with the requested metric.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsBySegment: {
      projections: {
        segment_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
WITH sample_segments(group_name, segment_name, sample_count) AS (VALUES ('Alpha', 'Online', 1500000), ('Alpha', 'Retail', 700000), ('Beta', 'Partner', 600000))
SELECT segment_name, SUM(sample_count) AS sample_count FROM sample_segments
WHERE $groupName = '' OR group_name = $groupName
GROUP BY segment_name ORDER BY segment_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    sampleCountsByGroup: {
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 600000))
SELECT group_name, sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
ORDER BY group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
  },
});
