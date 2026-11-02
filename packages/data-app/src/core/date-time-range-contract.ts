import {
  fromDate,
  parseDate,
  toCalendarDateTime,
} from '@internationalized/date';

import type { DateRangeContractOptions } from '../authoring/contract.ts';
import {
  parseDateTimeRange,
  resolveDateTimeRange,
} from './date-time-range-value.ts';
import type { DateTimeRange } from './date-time-range.ts';
import { invariant } from './invariant.ts';

/** Resolved UTC-rebased bounds for one execution, optionally with the preceding equal-length interval. */
export type DateTimeRangeRequest = {
  range: { from: Date; to: Date };
  comparison: { from: Date; to: Date } | null;
};

/** Datetime policy exposed by defineDateRangeContract().datetime. Parsing preserves relative values. */
export type DateTimeRangeContract = ReturnType<
  typeof createDateTimeRangeContract
>;

export function createDateTimeRangeContract(options: DateRangeContractOptions) {
  const {
    minDate,
    maxDate: sourceMaxDate,
    maxRangeDays,
    timeZone,
    completeDays,
  } = options;
  function reference(now: Date) {
    invariant(Number.isFinite(now.getTime()), 'Invalid reference date.');
    // Resolve symbolic anchors using reporting-zone wall-clock fields, not browser-local fields.
    return toCalendarDateTime(fromDate(now, timeZone)).toDate('UTC');
  }
  function bounds(now = new Date()) {
    const date = reference(now).toISOString().slice(0, 10);
    const latest = parseDate(date)
      .subtract({ days: completeDays === false ? 0 : 1 })
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
  function resolve(
    value: unknown,
    now = new Date()
  ): DateTimeRangeRequest['range'] {
    const range = resolveDateTimeRange(
      parseDateTimeRange(value),
      reference(now)
    );
    const limits = bounds(now);
    invariant(range.from, 'Choose a bounded datetime range.');
    invariant(
      range.to.getTime() - range.from.getTime() <= maxRangeDays * 86_400_000,
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
  function comparison(
    value: unknown,
    now = new Date()
  ): DateTimeRangeRequest['comparison'] {
    const { from, to } = resolve(value, now);
    const previous = {
      from: new Date(2 * from.getTime() - to.getTime()),
      to: from,
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
    parse,
    resolve,
    comparison,
    /** Resolve both periods against one reference instant. Use these bounds for comparison queries. */
    request(
      value: unknown,
      compare = false,
      now = new Date()
    ): DateTimeRangeRequest {
      const range = resolve(value, now);
      const previous = compare ? comparison(range, now) : null;
      invariant(
        !compare || previous,
        'Comparison is outside available source coverage.'
      );
      return { range, comparison: previous };
    },
  };
}
