import { defineDataApp } from '@altertable/data-app';

export const dataApp = defineDataApp({
  title: 'Sample finding',
  description:
    'Fixture evidence; replace with the Finding and its supporting queries.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleTotal: {
      projections: { sample_count: { type: 'number' } },
      statement: `
SELECT COALESCE(SUM(sample_count), 0) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= $period.from AND sample_date < $period.to`,
      params: { period: { type: 'dateTimeRange' } },
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
WHERE sample_date >= $period.from AND sample_date < $period.to
GROUP BY ALL ORDER BY period_start LIMIT 200`,
      params: {
        period: { type: 'dateTimeRange' },
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
WHERE sample_date >= $period.from AND sample_date < $period.to
GROUP BY ALL ORDER BY sample_count DESC LIMIT 50`,
      params: {
        period: { type: 'dateTimeRange' },
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
WHERE sample_date >= $period.from AND sample_date < $period.to
GROUP BY ALL ORDER BY period_start, member LIMIT 500`,
      params: {
        period: { type: 'dateTimeRange' },
        grain: { type: 'string', defaultValue: 'day' },
        breakdown: { type: 'string', defaultValue: 'segment' },
      },
    },
  },
});
