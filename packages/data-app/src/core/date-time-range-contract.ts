import {
  fromDate,
  parseDate,
  toCalendarDateTime,
  today,
} from '@internationalized/date';

import {
  parseDateTimeRange,
  resolveDateTimeRange,
} from './date-time-range-value.ts';
import type {
  DateTimeRange,
  ResolvedDateTimeRange,
} from './date-time-range.ts';
import { invariant } from './invariant.ts';
import { fixedUnitMilliseconds } from './time-units.ts';

/** What an operation receives for a date filter: resolved bounds, `from` inclusive and
 * `to` exclusive, and the same window one selected length earlier while the comparison is on. */
export type DateTimeRangeInput = {
  range: ResolvedDateTimeRange;
  comparison: ResolvedDateTimeRange | null;
};

export type DateTimeRangePolicyOptions = {
  minDate?: string;
  maxDate?: string | (() => string);
  maxRangeDays?: number;
  timeZone: string;
  completeDays?: boolean;
};

/** A date filter's coverage, duration limit, and reporting time zone. Parsing preserves relative values. */
export type DateTimeRangePolicy = ReturnType<typeof createDateTimeRangePolicy>;

export function createDateTimeRangePolicy({
  minDate,
  maxDate: sourceMaxDate,
  maxRangeDays,
  timeZone,
  completeDays = false,
}: DateTimeRangePolicyOptions) {
  invariant(
    maxRangeDays === undefined ||
      (Number.isInteger(maxRangeDays) && maxRangeDays > 0),
    'maxRangeDays must be a positive integer.'
  );
  if (minDate) parseDate(minDate);
  if (typeof sourceMaxDate === 'string') parseDate(sourceMaxDate);
  today(timeZone);
  function reference(now: Date) {
    invariant(Number.isFinite(now.getTime()), 'Invalid reference date.');
    // Resolve symbolic anchors using reporting-zone wall-clock fields, not browser-local fields.
    return toCalendarDateTime(fromDate(now, timeZone)).toDate('UTC');
  }
  function bounds(now = new Date()) {
    const date = reference(now).toISOString().slice(0, 10);
    const latest = parseDate(date)
      .subtract({ days: completeDays ? 1 : 0 })
      .toString();
    const sourceMax =
      typeof sourceMaxDate === 'function' ? sourceMaxDate() : sourceMaxDate;
    if (sourceMax) parseDate(sourceMax);
    return {
      minDate,
      maxDate: sourceMax && sourceMax < latest ? sourceMax : latest,
      maxRangeDays,
      timeZone,
    };
  }
  function resolve(value: unknown, now = new Date()): ResolvedDateTimeRange {
    const range = resolveDateTimeRange(
      parseDateTimeRange(value),
      reference(now)
    );
    const limits = bounds(now);
    invariant(range.from, 'Choose a bounded datetime range.');
    invariant(
      maxRangeDays === undefined ||
        range.to.getTime() - range.from.getTime() <=
          maxRangeDays * fixedUnitMilliseconds.DAY,
      `Choose a range of at most ${maxRangeDays} days.`
    );
    invariant(
      !minDate || range.from >= parseDate(minDate).toDate('UTC'),
      'Range starts before available source coverage.'
    );
    invariant(
      range.to <= parseDate(limits.maxDate).add({ days: 1 }).toDate('UTC'),
      'Range ends after available source coverage.'
    );
    return { from: range.from, to: range.to };
  }
  function parse(value: unknown, now = new Date()): DateTimeRange {
    const range = parseDateTimeRange(value);
    resolve(range, now);
    return range;
  }
  /** Hours that have not happened yet hold no data; ending there keeps comparisons equal. */
  function endAtNow(
    range: ResolvedDateTimeRange,
    now = new Date()
  ): ResolvedDateTimeRange {
    const current = reference(now);
    if (range.to <= current) return range;
    return {
      from: range.from,
      to: range.from > current ? range.from : current,
    };
  }
  /** The same window one selected length earlier, ending as far before now as the range does. */
  function comparison(
    value: unknown,
    now = new Date()
  ): ResolvedDateTimeRange | null {
    const selected = resolve(value, now);
    const length = selected.to.getTime() - selected.from.getTime();
    const range = endAtNow(selected, now);
    const previous = {
      from: new Date(range.from.getTime() - length),
      to: new Date(range.to.getTime() - length),
    };
    try {
      return resolve(previous, now);
    } catch {
      return null;
    }
  }
  return {
    timeZone,
    bounds,
    /** Validate coverage and duration while preserving symbolic relative bounds. */
    parse,
    /** Resolve to UTC-rebased bounds using reporting-zone wall-clock fields, then validate policy. */
    resolve,
    /** Return the comparison window, or null when source coverage excludes it. */
    comparison,
    /** End a resolved range at the reference time when it runs past it. */
    endAtNow,
    /** Resolve both periods against one reference instant, ending the range at now. */
    request(
      value: unknown,
      compare = false,
      now = new Date()
    ): DateTimeRangeInput {
      const range = endAtNow(resolve(value, now), now);
      const previous = compare ? comparison(value, now) : null;
      invariant(
        !compare || previous,
        'Comparison is outside available source coverage.'
      );
      return { range, comparison: previous };
    },
  };
}
