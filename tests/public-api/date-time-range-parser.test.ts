import {
  canParseDateTimeRangeInput,
  parseDateTimeRangeInput,
} from '@altertable/data-app/format';
import { describe, expect, it } from 'vitest';
const NOW = new Date('2026-07-02T15:30:00Z');
const parserOptions = { now: NOW };

describe('parseDateTimeRangeInput', () => {
  it.each([
    ['2022', '2022-01-01T00:00:00.000Z', '2023-01-01T00:00:00.000Z'],
    ['2021 to 2024', '2021-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'],
    ['2022–2022', '2022-01-01T00:00:00.000Z', '2023-01-01T00:00:00.000Z'],
    ['Jan to Jul', '2026-01-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
    ['January to July', '2026-01-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
    [
      'Jan 2026 to April 2027',
      '2026-01-01T00:00:00.000Z',
      '2027-05-01T00:00:00.000Z',
    ],
    ['Jan to Jul 2024', '2024-01-01T00:00:00.000Z', '2024-08-01T00:00:00.000Z'],
    ['Jan 2024 to Jul', '2024-01-01T00:00:00.000Z', '2024-08-01T00:00:00.000Z'],
    ['Jul', '2026-07-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
    ['February 2024', '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'],
    [
      '  DECEMBER  2025  ',
      '2025-12-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ],
  ])('parses %s as complete calendar periods', (input, from, to) => {
    const result = parseDateTimeRangeInput(input, parserOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect((result.range.from as Date).getTime()).toBe(
      new Date(from).getTime()
    );
    expect((result.range.to as Date).getTime()).toBe(new Date(to).getTime());
  });

  it.each([
    [
      'from July 1 to July 2 2026',
      '2026-07-01T00:00:00.000Z',
      '2026-07-03T00:00:00.000Z',
    ],
    [
      'from July 1 to July 2 2024',
      '2024-07-01T00:00:00.000Z',
      '2024-07-03T00:00:00.000Z',
    ],
    ['Jul 1 - Jul 2', '2026-07-01T00:00:00.000Z', '2026-07-03T00:00:00.000Z'],
    ['Jul 1 to Jul 1', '2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z'],
    ['since July 1 2026', '2026-07-01T00:00:00.000Z', null],
    ['July 1 2026 to now', '2026-07-01T00:00:00.000Z', null],
    [
      'from July 1 2026 4pm to July 2 2026 5pm',
      '2026-07-01T16:00:00.000Z',
      '2026-07-02T17:00:00.000Z',
    ],
    [
      'July 1 2026 4pm to July 2 2026',
      '2026-07-01T16:00:00.000Z',
      '2026-07-03T00:00:00.000Z',
    ],
  ])(
    'preserves complete day and explicit time boundaries in %s',
    (input, from, to) => {
      expect(parseDateTimeRangeInput(input, parserOptions)).toMatchObject({
        ok: true,
        range: { from: new Date(from), to: to ? new Date(to) : null },
      });
    }
  );

  it.each(['2024 to 2021', 'Jul to Jan', 'April 2027 to Jan 2026'])(
    'rejects reversed calendar ranges: %s',
    input => {
      expect(parseDateTimeRangeInput(input, parserOptions)).toMatchObject({
        ok: false,
        reason: 'invalid-range',
      });
    }
  );

  it('uses UTC reference fields to infer the current year', () => {
    const result = parseDateTimeRangeInput('Jan', {
      now: new Date('2026-01-01T02:00:00Z'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect((result.range.from as Date).getTime()).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime()
    );
  });

  it.each(['July 1', 'Jul 1', '7/1'])(
    'parses %s as a full calendar day',
    input => {
      const result = parseDateTimeRangeInput(input, parserOptions);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.parser).toBe('chrono');
      expect((result.range.from as Date).getTime()).toBe(
        new Date('2026-07-01T00:00:00.000Z').getTime()
      );
      expect((result.range.to as Date).getTime()).toBe(
        new Date('2026-07-02T00:00:00.000Z').getTime()
      );
    }
  );

  it('parses today as a live calendar preset', () => {
    const result = parseDateTimeRangeInput('today', parserOptions);

    expect(result).toEqual({
      ok: true,
      normalizedInput: 'today',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [],
        },
        to: null,
      },
    });
  });

  it('parses yesterday as the previous full calendar day', () => {
    const result = parseDateTimeRangeInput('yesterday', parserOptions);

    expect(result).toEqual({
      ok: true,
      normalizedInput: 'yesterday',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_YESTERDAY',
          offset: [],
        },
        to: {
          anchor: 'RELATIVE_ANCHOR_START_OF_TODAY',
          offset: [],
        },
      },
    });
  });

  it('parses to-date calendar presets', () => {
    expect(parseDateTimeRangeInput('week to date', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'week to date',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_WEEK',
          offset: [],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('month to date', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'month to date',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_MONTH',
          offset: [],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('year to date', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'year to date',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_YEAR',
          offset: [],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('WTD', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'WTD',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_WEEK',
          offset: [],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('MTD', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'MTD',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_MONTH',
          offset: [],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('YTD', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'YTD',
      parser: 'calendar-preset',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_START_OF_YEAR',
          offset: [],
        },
        to: null,
      },
    });
  });

  it('parses sliding relative ranges', () => {
    expect(parseDateTimeRangeInput('last month', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'last month',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -1, unit: 'MONTH' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('past week', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'past week',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -1, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('last 2 weeks', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'last 2 weeks',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('past 3 hours', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'past 3 hours',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -3, unit: 'HOUR' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('past 45 s', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'past 45 s',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -45, unit: 'SECOND' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('last 2 w', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'last 2 w',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('past 2h', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'past 2h',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'HOUR' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('last 2w', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'last 2w',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('2w', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '2w',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('2wks', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '2wks',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });
  });

  it('parses ago-style relative ranges', () => {
    expect(parseDateTimeRangeInput('3 days ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '3 days ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -3, unit: 'DAY' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('2 weeks ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '2 weeks ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'WEEK' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('3 hrs ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '3 hrs ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -3, unit: 'HOUR' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('15 mn ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '15 mn ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -15, unit: 'MINUTE' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('2h ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '2h ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -2, unit: 'HOUR' }],
        },
        to: null,
      },
    });

    expect(parseDateTimeRangeInput('45m ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: '45m ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -45, unit: 'MINUTE' }],
        },
        to: null,
      },
    });
  });

  it('parses since relative and absolute ranges', () => {
    expect(parseDateTimeRangeInput('since 3 days ago', parserOptions)).toEqual({
      ok: true,
      normalizedInput: 'since 3 days ago',
      parser: 'relative',
      range: {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount: -3, unit: 'DAY' }],
        },
        to: null,
      },
    });

    const sinceAbsolute = parseDateTimeRangeInput(
      'since Jul 2 12pm',
      parserOptions
    );
    expect(sinceAbsolute.ok).toBe(true);
    if (!sinceAbsolute.ok) {
      return;
    }

    expect(sinceAbsolute.parser).toBe('chrono');
    expect(sinceAbsolute.range.to).toBeNull();
    expect(sinceAbsolute.range.from).toBeInstanceOf(Date);

    const from = sinceAbsolute.range.from as Date;
    const tzFrom = from;
    expect(tzFrom.getUTCFullYear()).toBe(2026);
    expect(tzFrom.getUTCMonth()).toBe(6);
    expect(tzFrom.getUTCDate()).toBe(2);
    expect(tzFrom.getUTCHours()).toBe(12);
  });

  it('parses absolute ranges with now and same-day times', () => {
    const toNow = parseDateTimeRangeInput('Jul 2 12pm to now', parserOptions);
    expect(toNow.ok).toBe(true);
    if (!toNow.ok) {
      return;
    }

    expect(toNow.parser).toBe('chrono');
    expect(toNow.range.to).toBeNull();

    const sameDay = parseDateTimeRangeInput('9:00 am - 3:00 pm', parserOptions);
    expect(sameDay.ok).toBe(true);
    if (!sameDay.ok) {
      return;
    }

    const from = sameDay.range.from as Date;
    const to = sameDay.range.to as Date;
    const tzFrom = from;
    const tzTo = to;

    expect(tzFrom.getUTCFullYear()).toBe(2026);
    expect(tzFrom.getUTCMonth()).toBe(6);
    expect(tzFrom.getUTCDate()).toBe(2);
    expect(tzFrom.getUTCHours()).toBe(9);
    expect(tzTo.getUTCHours()).toBe(15);
  });

  it('parses unix timestamp ranges in seconds and milliseconds', () => {
    const seconds = parseDateTimeRangeInput(
      '1782913084 - 1783517884',
      parserOptions
    );
    expect(seconds.ok).toBe(true);
    if (!seconds.ok) {
      return;
    }

    expect(seconds.parser).toBe('unix');
    expect((seconds.range.from as Date).getTime()).toBe(1_782_913_084_000);
    expect((seconds.range.to as Date).getTime()).toBe(1_783_517_884_000);

    const milliseconds = parseDateTimeRangeInput(
      '1782913084000 - 1783517884000',
      parserOptions
    );
    expect(milliseconds.ok).toBe(true);
    if (!milliseconds.ok) {
      return;
    }

    expect(milliseconds.parser).toBe('unix');
    expect((milliseconds.range.from as Date).getTime()).toBe(1_782_913_084_000);
    expect((milliseconds.range.to as Date).getTime()).toBe(1_783_517_884_000);

    const toNow = parseDateTimeRangeInput('1783609703 to now', parserOptions);
    expect(toNow.ok).toBe(true);
    if (!toNow.ok) {
      return;
    }

    expect(toNow.parser).toBe('unix');
    expect(toNow.range.to).toBeNull();
    expect((toNow.range.from as Date).getTime()).toBe(1_783_609_703_000);
  });

  it('reports validation failures for unsupported input', () => {
    expect(parseDateTimeRangeInput('', parserOptions)).toEqual({
      ok: false,
      reason: 'empty',
      normalizedInput: '',
    });

    expect(parseDateTimeRangeInput('   ', parserOptions)).toEqual({
      ok: false,
      reason: 'empty',
      normalizedInput: '',
    });

    expect(parseDateTimeRangeInput('not a date', parserOptions)).toEqual({
      ok: false,
      reason: 'unrecognized',
      normalizedInput: 'not a date',
    });

    const partiallyParsedRange = 'aaa 5, 2026, 6:49 PM - Aug 5, 2027, 3:49 PM';
    expect(
      parseDateTimeRangeInput(partiallyParsedRange, parserOptions)
    ).toEqual({
      ok: false,
      reason: 'unrecognized',
      normalizedInput: partiallyParsedRange,
    });

    expect(
      parseDateTimeRangeInput('1783517884 - 1782913084', parserOptions)
    ).toEqual({
      ok: false,
      reason: 'invalid-range',
      normalizedInput: '1783517884 - 1782913084',
    });

    expect(parseDateTimeRangeInput('since', parserOptions)).toEqual({
      ok: false,
      reason: 'unrecognized',
      normalizedInput: 'since',
    });
  });
});

describe('canParseDateTimeRangeInput', () => {
  it('returns true only for parseable input', () => {
    expect(canParseDateTimeRangeInput('today', parserOptions)).toBe(true);
    expect(canParseDateTimeRangeInput('last 2 weeks', parserOptions)).toBe(
      true
    );
    expect(canParseDateTimeRangeInput('', parserOptions)).toBe(false);
    expect(canParseDateTimeRangeInput('not a date', parserOptions)).toBe(false);
    expect(
      canParseDateTimeRangeInput('1783517884 - 1782913084', parserOptions)
    ).toBe(false);
  });
});

describe('UTC-rebased absolute dates', () => {
  it.each([
    ['since July 1 2026 4pm', '2026-07-01T16:00:00.000Z'],
    ['since July 1 2026 4pm GMT+0200', '2026-07-01T16:00:00.000Z'],
    ['since March 8 2026 2:30am', '2026-03-08T02:30:00.000Z'],
    ['since November 1 2026 1:30am', '2026-11-01T01:30:00.000Z'],
  ])('preserves written fields for %s', (input, expected) => {
    const result = parseDateTimeRangeInput(input, parserOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.from).toBeInstanceOf(Date);
    expect((result.range.from as Date).toISOString()).toBe(expected);
    expect(result.range.to).toBeNull();
  });

  it('preserves relative expressions across reference dates', () => {
    for (const input of [
      '2w',
      'since 3 days ago',
      'today',
      'yesterday',
      'WTD',
      'MTD',
      'YTD',
    ]) {
      expect(
        parseDateTimeRangeInput(input, {
          now: new Date('2024-01-01T00:00:00Z'),
        })
      ).toEqual(
        parseDateTimeRangeInput(input, {
          now: new Date('2027-12-31T23:59:59Z'),
        })
      );
    }
  });

  it('rejects an invalid reference date', () => {
    expect(
      parseDateTimeRangeInput('July 1', { now: new Date(NaN) })
    ).toMatchObject({ ok: false, reason: 'invalid-range' });
  });
});

it.each(['since February 30 2026 4pm', 'since April 31 2026 4pm'])(
  'rejects impossible wall-clock dates: %s',
  input => {
    expect(canParseDateTimeRangeInput(input, parserOptions)).toBe(false);
  }
);

it.each([
  ['Jan to Jul 2026', 'Jan\t'.concat('\t'.repeat(10000), 'to\tJul 2026')],
  [
    '1700000000 to 1700003600',
    '1700000000\t'.concat('\t'.repeat(10000), 'to\t1700003600'),
  ],
  [
    'July 1 2026 to July 2 2026',
    'July 1 2026\t'.concat('\t'.repeat(10000), 'to\tJuly 2 2026'),
  ],
  ['from 2 days ago', 'from'.concat('\t'.repeat(10000), '2 days ago')],
  ['since July 1 2026', 'since'.concat('\t'.repeat(10000), 'July 1 2026')],
  ['from', 'from'.concat('\t'.repeat(10000))],
])('normalizes repeated whitespace before parsing %s', (normalized, input) => {
  expect(parseDateTimeRangeInput(input, parserOptions)).toEqual(
    parseDateTimeRangeInput(normalized, parserOptions)
  );
});
