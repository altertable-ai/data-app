import {
  defineDateRangeContract,
  dateTimeRangeFilter,
  filterInput,
} from '@altertable/data-app/contract';
import { parseDateTimeRangeInput } from '@altertable/data-app/format';
import { expect, test, vi } from 'vitest';

function range(input: string) {
  const parsed = parseDateTimeRangeInput(input);
  if (!parsed.ok) throw new Error(input);
  return parsed.range;
}

test('one contract shares reporting-zone coverage between calendar and datetime ranges', () => {
  const contract = defineDateRangeContract({
    minDate: '2026-06-01',
    maxRangeDays: 7,
    timeZone: 'America/New_York',
  });
  const now = new Date('2026-07-02T02:30:00Z'); // Still July 1 in New York.
  expect(contract.bounds(now).maxDate).toBe('2026-06-30');
  expect(contract.datetime.parse(range('yesterday'), now)).toEqual(
    range('yesterday')
  );
  expect(contract.datetime.resolve(range('yesterday'), now)).toEqual({
    from: new Date('2026-06-30T00:00:00Z'),
    to: new Date('2026-07-01T00:00:00Z'),
  });
  expect(() => contract.datetime.parse(range('today'), now)).toThrow(
    'coverage'
  );
  expect(() =>
    contract.datetime.parse(
      {
        from: new Date('2026-05-31T23:59:00Z'),
        to: new Date('2026-06-01T01:00:00Z'),
      },
      now
    )
  ).toThrow('coverage');
});

test('datetime policy validates mixed bounds in the reporting zone and preserves relative values', () => {
  const contract = defineDateRangeContract({
    maxRangeDays: 1,
    timeZone: 'America/New_York',
    completeDays: false,
  });
  const now = new Date('2026-07-02T22:00:00Z');
  const input = { from: new Date('2026-07-02T16:00:00Z'), to: null };
  expect(contract.datetime.parse(input, now)).toEqual(input);
  expect(contract.datetime.resolve(input, now).to).toEqual(
    new Date('2026-07-02T18:00:00Z')
  );
  expect(() =>
    contract.datetime.parse(
      { from: new Date('2026-07-02T19:00:00Z'), to: null },
      now
    )
  ).toThrow('before end');
  expect(() => contract.datetime.parse(range('2d'), now)).toThrow('at most 1');
});

test('comparison requests resolve both periods at one reference and enforce coverage', () => {
  const contract = defineDateRangeContract({
    minDate: '2026-03-01',
    maxRangeDays: 7,
    timeZone: 'UTC',
  });
  const now = new Date('2026-03-07T12:00:00Z');
  const selected = {
    from: new Date('2026-03-04T00:00:00Z'),
    to: new Date('2026-03-07T00:00:00Z'),
  };
  expect(contract.datetime.request(selected, true, now)).toEqual({
    range: selected,
    comparison: { from: new Date('2026-03-01T00:00:00Z'), to: selected.from },
  });
  expect(() =>
    contract.datetime.request(
      {
        from: new Date('2026-03-02T00:00:00Z'),
        to: new Date('2026-03-04T00:00:00Z'),
      },
      true,
      now
    )
  ).toThrow('Comparison');
});

test('a variable applies its contract to defaults, URL values, and server parsing', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-02T12:00:00Z'));
  try {
    const contract = defineDateRangeContract({
      minDate: '2026-06-01',
      maxRangeDays: 7,
      timeZone: 'UTC',
    });
    const period = dateTimeRangeFilter({
      key: 'period',
      contract,
      defaultValue: 'yesterday',
    });
    expect(period.maxRangeDays).toBe(7);
    expect(period.valid(range('today'))).toBe(false);
    expect(() => period.parse(range('today'))).toThrow('coverage');
    const parseInput = filterInput(() => ({}), { period });
    expect(() => parseInput({ period: range('today') })).toThrow();
    expect(
      parseInput({ period: JSON.parse(JSON.stringify(range('yesterday'))) })
        .period
    ).toEqual(range('yesterday'));
    expect(
      period.read(
        new URLSearchParams({ period: JSON.stringify(range('today')) })
      )
    ).toEqual(range('yesterday'));
    expect(() =>
      dateTimeRangeFilter({ key: 'bad', contract, defaultValue: 'today' })
    ).toThrow('coverage');
  } finally {
    vi.useRealTimers();
  }
});
