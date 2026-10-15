import { expect, it } from 'vitest';
import { utcTicks } from '@/packages/data-app-react/src/ui/time-interval.ts';

it.each([
  {
    name: 'leap day',
    start: '2024-02-28',
    stop: '2024-03-01',
    expected: ['2024-02-28', '2024-02-29', '2024-03-01'],
  },
  {
    name: 'unequal month lengths',
    start: '2024-01-31',
    stop: '2024-04-01',
    expected: ['2024-02-01', '2024-03-01', '2024-04-01'],
  },
  {
    name: 'year boundary',
    start: '2025-12-31',
    stop: '2026-01-02',
    expected: ['2025-12-31', '2026-01-01', '2026-01-02'],
  },
])(
  'utcTicks aligns calendar ticks across $name',
  ({ start, stop, expected }) => {
    expect(utcTicks(new Date(start), new Date(stop), 2)).toEqual(
      expected.map(value => new Date(value))
    );
  }
);

it('utcTicks keeps UTC days 24 hours apart across local daylight-saving transitions', () => {
  // This suite runs in America/Los_Angeles, where both ranges cross a clock change.
  for (const start of ['2024-03-09', '2024-11-02']) {
    const midnight = Date.parse(start);
    const day = 86_400_000;
    expect(utcTicks(midnight, midnight + 2 * day, 2).map(Number)).toEqual([
      midnight,
      midnight + day,
      midnight + 2 * day,
    ]);
  }
});

it('utcTicks returns no ticks for invalid dates or nonpositive and NaN counts', () => {
  const start = new Date('2026-01-01');
  const stop = new Date('2026-01-02');
  for (const count of [0, -1, NaN]) {
    expect(utcTicks(start, stop, count)).toEqual([]);
  }
  expect(utcTicks(new Date(NaN), stop, 4)).toEqual([]);
  expect(utcTicks(start, new Date(NaN), 4)).toEqual([]);
});

it('utcTicks accepts numeric epochs and includes aligned millisecond endpoints', () => {
  expect(utcTicks(-2, 2, 4).map(Number)).toEqual([-2, -1, 0, 1, 2]);
  expect(utcTicks(1, 9, 4).map(Number)).toEqual([2, 4, 6, 8]);
});
