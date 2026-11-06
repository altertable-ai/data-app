import { parseCount } from '@altertable/data-app/contract';

import { dataApp, period } from '#config';
export const operations = {
  samples: dataApp.defineOperation({
    input: value => {
      const {
        period: selection,
        grain,
        breakdown,
      } = (value ?? {}) as Record<string, unknown>;
      if (grain !== 'day' && grain !== 'week')
        throw new Error('Expected a day or week grain.');
      if (breakdown !== 'segment' && breakdown !== 'group')
        throw new Error('Expected a segment or group breakdown.');
      return { period: period.parseInput(selection), grain, breakdown };
    },
    checks: [
      {
        period: period.input({
          ...period.defaultValue,
          comparison: 'previous',
        }),
        grain: 'day',
        breakdown: 'segment',
      },
      {
        period: period.input(period.defaultValue),
        grain: 'week',
        breakdown: 'group',
      },
    ],
    policy: { maxQueryRows: 500, maxDurationMs: 15000 },
    async run({ query }, { period: { range, comparison }, grain, breakdown }) {
      const result = await query('samples', {
        start: (comparison?.from ?? range.from).toISOString(),
        end: range.to.toISOString(),
        selected_start: range.from.toISOString(),
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
