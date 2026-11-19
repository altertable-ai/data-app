import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  // Replace the demo title, description, and scope labels with the app's identity.
  title: 'Sample finding',
  description:
    'Explore sample volume over time and across groups and segments.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  // starter_demo.daily_samples contains seeded fictional observations.
  // Replace these queries with verified sources before publishing.
  queries: {
    sampleTotals: {
      projections: { sample_count: { type: 'number' } },
      statement: `
SELECT SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
HAVING COUNT(*) > 0`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
      },
    },
    samplesOverTime: {
      projections: {
        period_start: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY period_start LIMIT 200`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        grain: { type: 'string', defaultValue: 'day' },
      },
    },
    samplesByMember: {
      projections: {
        member: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY sample_count DESC LIMIT 50`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        breakdown: { type: 'string', defaultValue: 'segment' },
      },
    },
    sampleRows: {
      projections: {
        period_start: { type: 'string' },
        member: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY period_start, member LIMIT 500`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        grain: { type: 'string', defaultValue: 'day' },
        breakdown: { type: 'string', defaultValue: 'segment' },
      },
    },
  },
});
