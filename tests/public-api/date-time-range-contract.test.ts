import {
  dateTimeRangeFilter,
  defineOperation,
} from '@altertable/data-app/contract';
import { parseDateTimeRangeInput } from '@altertable/data-app/format';
import { expect, test, vi } from 'vitest';

function range(input: string) {
  const parsed = parseDateTimeRangeInput(input);
  if (!parsed.ok) throw new Error(input);
  return parsed.range;
}

const absolute = {
  from: new Date('2026-06-29T00:00:00Z'),
  to: new Date('2026-06-30T00:00:00Z'),
};

test('a date filter resolves coverage and relative ranges in its reporting zone', () => {
  const { policy } = dateTimeRangeFilter({
    key: 'period',
    defaultValue: absolute,
    minDate: '2026-06-01',
    maxRangeDays: 7,
    timeZone: 'America/New_York',
    completeDays: true,
  });
  const now = new Date('2026-07-02T02:30:00Z'); // Still July 1 in New York.
  expect(policy.bounds(now).maxDate).toBe('2026-06-30');
  expect(policy.parse(range('yesterday'), now)).toEqual(range('yesterday'));
  expect(policy.resolve(range('yesterday'), now)).toEqual({
    from: new Date('2026-06-30T00:00:00Z'),
    to: new Date('2026-07-01T00:00:00Z'),
  });
  expect(() => policy.parse(range('today'), now)).toThrow('coverage');
  expect(() =>
    policy.parse(
      {
        from: new Date('2026-05-31T23:59:00Z'),
        to: new Date('2026-06-01T01:00:00Z'),
      },
      now
    )
  ).toThrow('coverage');
});

test('coverage includes today unless the source loads whole days', () => {
  const now = new Date('2026-07-02T22:00:00Z');
  const { policy } = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '1h',
    maxRangeDays: 1,
    timeZone: 'America/New_York',
  });
  const input = { from: new Date('2026-07-02T16:00:00Z'), to: null };
  expect(policy.parse(input, now)).toEqual(input);
  expect(policy.resolve(input, now).to).toEqual(
    new Date('2026-07-02T18:00:00Z')
  );
  expect(() =>
    policy.parse({ from: new Date('2026-07-02T19:00:00Z'), to: null }, now)
  ).toThrow('before end');
  expect(() => policy.parse(range('2d'), now)).toThrow('at most 1');
});

test('comparison requests resolve both periods at one reference and enforce coverage', () => {
  const now = new Date('2026-03-07T12:00:00Z');
  const selected = {
    from: new Date('2026-03-04T00:00:00Z'),
    to: new Date('2026-03-07T00:00:00Z'),
  };
  const period = dateTimeRangeFilter({
    key: 'period',
    defaultValue: selected,
    minDate: '2026-03-01',
    maxDate: '2026-03-31',
    comparison: 'off',
  });
  expect(
    period.request({ range: selected, comparison: 'previous' }, now)
  ).toMatchObject({
    range: selected,
    comparison: { from: new Date('2026-03-01T00:00:00Z'), to: selected.from },
  });
  expect(() =>
    period.request(
      {
        range: {
          from: new Date('2026-03-02T00:00:00Z'),
          to: new Date('2026-03-04T00:00:00Z'),
        },
        comparison: 'previous',
      },
      now
    )
  ).toThrow('Comparison');
});

test('a date filter applies its coverage to defaults, URL values, and server parsing', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  try {
    const coverage = {
      minDate: '2026-06-01',
      maxRangeDays: 7,
      completeDays: true,
    };
    const period = dateTimeRangeFilter({
      key: 'period',
      defaultValue: 'yesterday',
      ...coverage,
    });
    expect(period.maxRangeDays).toBe(7);
    expect(period.valid({ range: range('today') })).toBe(false);
    const { input: parseInput } = defineOperation({
      queries: {},
      filters: { period },
      policy: { maxQueryRows: 1, maxDurationMs: 1000 },
      async run() {
        return null;
      },
    });
    expect(() =>
      parseInput({
        period: {
          ...period.request(period.defaultValue),
          range: range('today'),
        },
      })
    ).toThrow();
    const request = JSON.parse(
      JSON.stringify(period.request(period.defaultValue))
    );
    expect(parseInput({ period: request }).period).toEqual({
      range: {
        from: new Date('2026-07-01T00:00:00Z'),
        to: new Date('2026-07-02T00:00:00Z'),
      },
      comparison: null,
    });
    expect(
      period.read(
        new URLSearchParams({ period: JSON.stringify(range('today')) })
      )
    ).toEqual({ range: range('yesterday') });
    expect(() =>
      dateTimeRangeFilter({ key: 'bad', defaultValue: 'today', ...coverage })
    ).toThrow('coverage');
  } finally {
    vi.useRealTimers();
  }
});

test('a range running past now ends at now, and so does its comparison', () => {
  const now = new Date('2026-11-10T14:30:00Z');
  const today = {
    from: new Date('2026-11-10T00:00:00Z'),
    to: new Date('2026-11-11T00:00:00Z'),
  };
  const period = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '7d',
    comparison: 'off',
  });
  expect(
    period.request({ range: today, comparison: 'previous' }, now)
  ).toMatchObject({
    range: { from: today.from, to: now },
    comparison: {
      from: new Date('2026-11-09T00:00:00Z'),
      to: new Date('2026-11-09T14:30:00Z'),
    },
  });
  expect(period.previous({ range: today })).not.toBeNull();
  const later = {
    from: new Date('2026-11-10T16:00:00Z'),
    to: new Date('2026-11-11T00:00:00Z'),
  };
  expect(period.request({ range: later }, now).range).toEqual({
    from: later.from,
    to: later.from,
  });
});

test('the server ends a range at now when a caller sends a future end', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-10T14:30:00Z'));
  try {
    const period = dateTimeRangeFilter({ key: 'period', defaultValue: '7d' });
    const { input } = defineOperation({
      queries: {},
      filters: { period },
      policy: { maxQueryRows: 1, maxDurationMs: 1000 },
      async run() {
        return null;
      },
    });
    expect(
      input({
        period: {
          range: {
            from: new Date('2026-11-10T00:00:00Z'),
            to: new Date('2026-11-11T00:00:00Z'),
          },
          comparison: null,
        },
      }).period.range.to
    ).toEqual(new Date('2026-11-10T14:30:00Z'));
  } finally {
    vi.useRealTimers();
  }
});
