import {
  dateTimeRangeFilter,
  defineOperation,
} from '@altertable/data-app/contract';
import { expect, test, vi } from 'vitest';

test('comparison selection stays relative in URLs and the server checks the resolved ranges', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-10T16:00:00Z'));
  try {
    const period = dateTimeRangeFilter({
      key: 'period',
      minDate: '2026-06-01',
      maxRangeDays: 31,
      timeZone: 'America/New_York',
      comparison: 'off',
      defaultValue: '7d',
    });
    const selected = {
      ...period.defaultValue,
      comparison: 'previous' as const,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(period.write(selected)))
      if (value !== null) params.set(key, value);
    expect(params.get('compare')).toBe('previous');
    expect(period.read(params)).toEqual(selected);
    const request = period.request(selected);
    expect(request.range).toEqual({
      from: new Date('2026-07-03T12:00:00Z'),
      to: new Date('2026-07-10T12:00:00Z'),
    });
    expect(request.comparison).toEqual({
      from: new Date('2026-06-26T12:00:00Z'),
      to: request.range.from,
    });
    const { input: parse } = defineOperation({
      queries: {},
      filters: { period },
      policy: { maxQueryRows: 1, maxDurationMs: 1000 },
      async run() {
        return null;
      },
    });
    vi.setSystemTime(new Date('2026-07-10T16:10:00Z'));
    const { range, comparison } = request;
    expect(
      parse(JSON.parse(JSON.stringify({ period: request }))).period
    ).toEqual({ range, comparison });
    expect(parse({ period: { range, comparison } }).period).toEqual({
      range,
      comparison,
    });
    expect(() => parse({ period: { range, comparison: range } })).toThrow(
      'earlier'
    );
    expect(() =>
      parse({
        period: {
          range: { ...range, from: new Date('2026-07-02T12:00:00Z') },
          comparison,
        },
      })
    ).toThrow('earlier');
    expect(() =>
      parse({
        period: {
          range: { ...range, from: new Date('2026-05-01') },
          comparison: null,
        },
      })
    ).toThrow();
    expect(period.write(period.clearValue!).compare).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('comparison is unavailable outside coverage and an invalid comparison URL is repaired', () => {
  const period = dateTimeRangeFilter({
    key: 'window',
    minDate: '2026-06-01',
    maxRangeDays: 31,
    comparison: 'off',
    defaultValue: {
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-06-03T00:00:00Z'),
    },
  });
  expect(period.previous(period.defaultValue)).toBeNull();
  expect(period.valid({ ...period.defaultValue, comparison: 'previous' })).toBe(
    false
  );
  expect(period.read(new URLSearchParams('window-compare=previous'))).toEqual(
    period.defaultValue
  );
});
