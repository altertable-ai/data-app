import {
  dateTimeRangeVariable,
  defineDateRangeContract,
  variableInput,
} from '@altertable/data-app/contract';
import { expect, test, vi } from 'vitest';

test('comparison selection stays relative in URLs and resolves one protected request snapshot', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-10T16:00:00Z'));
  try {
    const contract = defineDateRangeContract({
      minDate: '2026-06-01',
      maxRangeDays: 31,
      timeZone: 'America/New_York',
      completeDays: false,
    });
    const period = dateTimeRangeVariable({
      key: 'period',
      contract,
      comparison: true,
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
    const request = period.input(selected);
    expect(request.range).toEqual({
      from: new Date('2026-07-03T12:00:00Z'),
      to: new Date('2026-07-10T12:00:00Z'),
    });
    expect(request.comparison).toEqual({
      from: new Date('2026-06-26T12:00:00Z'),
      to: request.range.from,
    });
    const parse = variableInput(() => ({}), { period });
    vi.setSystemTime(new Date('2026-07-10T16:10:00Z'));
    expect(
      parse(JSON.parse(JSON.stringify({ period: request }))).period
    ).toEqual(request);
    expect(() =>
      parse({ period: { ...request, comparison: request.range } })
    ).toThrow('preceding');
    expect(() =>
      parse({
        period: {
          ...request,
          range: { ...request.range, from: new Date('2026-07-02T12:00:00Z') },
        },
      })
    ).toThrow('preserve');
    expect(() =>
      parse({ period: { ...request, reference: 'invalid' } })
    ).toThrow('reference');
    expect(period.write(period.clearValue!).compare).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('comparison is unavailable outside coverage and an invalid comparison URL is repaired', () => {
  const contract = defineDateRangeContract({
    minDate: '2026-06-01',
    maxRangeDays: 31,
    timeZone: 'UTC',
  });
  const period = dateTimeRangeVariable({
    key: 'window',
    contract,
    comparison: true,
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
