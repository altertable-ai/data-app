import { defineDataApp } from '@altertable/data-app';
import {
  dateTimeRangeVariable,
  defineDateRangeContract,
} from '@altertable/data-app/contract';

export const dataApp = defineDataApp({
  title: 'Sample finding',
  description:
    'Fixture evidence; replace with the Finding and its supporting queries.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    samples: {
      projections: {
        period_start: { type: 'string' },
        member: { type: 'string' },
        selected: { type: 'boolean' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  sample_date >= CAST($selected_start AS TIMESTAMP) AS selected,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($start AS TIMESTAMP) AND sample_date < CAST($end AS TIMESTAMP)
GROUP BY ALL ORDER BY period_start, member LIMIT $limit`,
      params: {
        start: { type: 'string', defaultValue: '2026-03-09T00:00:00Z' },
        end: { type: 'string', defaultValue: '2026-03-16T00:00:00Z' },
        selected_start: {
          type: 'string',
          defaultValue: '2026-03-09T00:00:00Z',
        },
        grain: { type: 'string', defaultValue: 'day' },
        breakdown: { type: 'string', defaultValue: 'segment' },
        limit: { type: 'number', defaultValue: 500 },
      },
    },
  },
});
export const calendar = defineDateRangeContract({
  minDate: '2026-01-05',
  maxDate: '2026-03-29',
  maxRangeDays: 28,
  timeZone: 'UTC',
});
export const findingPeriod = {
  from: new Date('2026-03-09T00:00:00Z'),
  to: new Date('2026-03-16T00:00:00Z'),
};
export const period = dateTimeRangeVariable({
  key: 'period',
  contract: calendar,
  allowComparison: true,
  defaultValue: findingPeriod,
  presets: [{ label: 'Finding period', range: findingPeriod }],
});
