import { parseCount } from '@altertable/data-app/contract';

import { calendar, dataApp, findingPeriod } from '#config';
export const operations = {
  samples: dataApp.defineOperation({
    input: value => {
      const { period, grain, breakdown } = (value ?? {}) as Record<
        string,
        unknown
      >;
      if (grain !== 'day' && grain !== 'week')
        throw new Error('Expected a day or week grain.');
      if (breakdown !== 'segment' && breakdown !== 'group')
        throw new Error('Expected a segment or group breakdown.');
      return { period: calendar.parseRequest(period), grain, breakdown };
    },
    checks: [
      {
        period: calendar.request(findingPeriod, true),
        grain: 'day',
        breakdown: 'segment',
      },
      {
        period: calendar.request(findingPeriod),
        grain: 'week',
        breakdown: 'group',
      },
    ],
    policy: { maxQueryRows: 500, maxDurationMs: 15000 },
    async run({ query }, { period: { range, comparison }, grain, breakdown }) {
      const result = await query('samples', {
        start: comparison?.start ?? range.start,
        end: range.end,
        selected_start: range.start,
        grain,
        breakdown,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        member: row.member,
        sampleCount: parseCount(row.sample_count),
        selected: row.selected,
      }));
    },
  }),
};
