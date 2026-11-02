import { CalendarDateTime } from '@internationalized/date';

import { parseDateTimeRangeInput } from './date-time-range-parser.ts';
import type {
  AbsoluteOrRelativeDateTime,
  DateTimeRange,
  RelativeAnchor,
  RelativeDateTime,
  RelativeUnit,
} from './date-time-range.ts';
import { invariant } from './invariant.ts';

const anchors: Record<RelativeAnchor, string> = {
  RELATIVE_ANCHOR_NOW: 'Now',
  RELATIVE_ANCHOR_START_OF_TODAY: 'Start of today',
  RELATIVE_ANCHOR_START_OF_YESTERDAY: 'Start of yesterday',
  RELATIVE_ANCHOR_START_OF_TOMORROW: 'Start of tomorrow',
  RELATIVE_ANCHOR_START_OF_WEEK: 'Start of week',
  RELATIVE_ANCHOR_START_OF_MONTH: 'Start of month',
  RELATIVE_ANCHOR_START_OF_YEAR: 'Start of year',
};
const units: Record<RelativeUnit, string> = {
  SECOND: 's',
  MINUTE: 'm',
  HOUR: 'h',
  DAY: 'd',
  WEEK: 'w',
  MONTH: 'mo',
  YEAR: 'y',
};

/** Validate and restore UTC-rebased dates from JSON, without resolving relative bounds. */
export function parseDateTimeRange(
  value: unknown,
  { maxRangeDays }: { maxRangeDays?: number } = {}
): DateTimeRange {
  invariant(
    !!value && typeof value === 'object' && !Array.isArray(value),
    'Choose a datetime range.'
  );
  const record = value as Record<string, unknown>;
  invariant(
    Object.keys(record).every(key => key === 'from' || key === 'to'),
    'Unknown datetime range field.'
  );
  function bound(raw: unknown): AbsoluteOrRelativeDateTime | null {
    if (raw == null) return null;
    if (raw instanceof Date || typeof raw === 'string') {
      const date = new Date(raw);
      invariant(
        Number.isFinite(date.getTime()) &&
          (raw instanceof Date || date.toISOString() === raw),
        'Absolute bounds must be UTC ISO dates.'
      );
      return date;
    }
    invariant(
      typeof raw === 'object' && !Array.isArray(raw),
      'Invalid datetime bound.'
    );
    const r = raw as Record<string, unknown>;
    invariant(
      Object.keys(r).every(key => key === 'anchor' || key === 'offset') &&
        typeof r.anchor === 'string' &&
        Object.hasOwn(anchors, r.anchor),
      'Invalid relative anchor.'
    );
    invariant(
      Array.isArray(r.offset) && r.offset.length <= 16,
      'Use at most 16 relative offsets.'
    );
    const offset = r.offset.map((o: unknown) => {
      invariant(
        !!o && typeof o === 'object' && !Array.isArray(o),
        'Invalid relative offset.'
      );
      const v = o as Record<string, unknown>;
      invariant(
        Object.keys(v).every(key => key === 'amount' || key === 'unit') &&
          typeof v.amount === 'number' &&
          Number.isSafeInteger(v.amount) &&
          Math.abs(v.amount) <= 1_000_000 &&
          typeof v.unit === 'string' &&
          Object.hasOwn(units, v.unit),
        'Invalid relative offset.'
      );
      return { amount: v.amount, unit: v.unit as RelativeUnit };
    });
    return { anchor: r.anchor as RelativeAnchor, offset };
  }
  const range = { from: bound(record.from), to: bound(record.to) };
  if (range.from instanceof Date && range.to instanceof Date)
    invariant(range.from < range.to, 'Start must be before end.');
  invariant(
    maxRangeDays === undefined ||
      (Number.isFinite(maxRangeDays) && maxRangeDays > 0),
    'Maximum range days must be positive.'
  );
  // Only compare bounds whose separation is independent of reporting time and zone.
  // Calendar offsets and mixed absolute/relative bounds require backend resolution.
  let duration: number | undefined;
  if (range.from instanceof Date && range.to instanceof Date) {
    duration = range.to.getTime() - range.from.getTime();
  } else if (
    range.from &&
    !(range.from instanceof Date) &&
    !(range.to instanceof Date)
  ) {
    const to = range.to ?? { anchor: 'RELATIVE_ANCHOR_NOW', offset: [] };
    if (range.from.anchor === to.anchor) {
      const fixed: Partial<Record<RelativeUnit, number>> = {
        SECOND: 1000,
        MINUTE: 60_000,
        HOUR: 3_600_000,
        DAY: 86_400_000,
        WEEK: 7 * 86_400_000,
      };
      function offset(bound: RelativeDateTime) {
        let total = 0;
        for (const item of bound.offset) {
          const unit = fixed[item.unit];
          if (unit === undefined) return undefined;
          total += item.amount * unit;
        }
        return total;
      }
      const start = offset(range.from);
      const end = offset(to);
      if (start !== undefined && end !== undefined) duration = end - start;
    }
  }
  invariant(
    maxRangeDays === undefined ||
      (!!range.from &&
        (duration === undefined || duration <= maxRangeDays * 86_400_000)),
    `Choose a range of at most ${maxRangeDays} days.`
  );
  return range;
}

/** Canonical URL/JSON representation. Dates retain their encoded UTC fields. */
export function serializeDateTimeRange(value: DateTimeRange): string {
  return JSON.stringify(parseDateTimeRange(value));
}

/** UTC preview only. Backend execution owns reporting-timezone interpretation. Null start is unbounded; null end is now. */
export function resolveDateTimeRange(
  value: DateTimeRange,
  now = new Date()
): { from: Date | null; to: Date } {
  const range = parseDateTimeRange(value);
  invariant(Number.isFinite(now.getTime()), 'Invalid reference date.');
  function resolve(bound: AbsoluteOrRelativeDateTime): Date {
    if (bound instanceof Date) return new Date(bound);
    let date = new CalendarDateTime(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    );
    if (bound.anchor !== 'RELATIVE_ANCHOR_NOW')
      date = date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    switch (bound.anchor) {
      case 'RELATIVE_ANCHOR_START_OF_YESTERDAY':
        date = date.subtract({ days: 1 });
        break;
      case 'RELATIVE_ANCHOR_START_OF_TOMORROW':
        date = date.add({ days: 1 });
        break;
      case 'RELATIVE_ANCHOR_START_OF_WEEK':
        date = date.subtract({ days: (now.getUTCDay() + 6) % 7 });
        break;
      case 'RELATIVE_ANCHOR_START_OF_MONTH':
        date = date.set({ day: 1 });
        break;
      case 'RELATIVE_ANCHOR_START_OF_YEAR':
        date = date.set({ month: 1, day: 1 });
        break;
    }
    const durations = {
      SECOND: 'seconds',
      MINUTE: 'minutes',
      HOUR: 'hours',
      DAY: 'days',
      WEEK: 'weeks',
      MONTH: 'months',
      YEAR: 'years',
    } as const;
    for (const offset of bound.offset)
      date = date.add({ [durations[offset.unit]]: offset.amount });
    return date.toDate('UTC');
  }
  const from = range.from ? resolve(range.from) : null;
  const to = range.to ? resolve(range.to) : new Date(now);
  invariant(!from || from < to, 'Start must be before end.');
  return { from, to };
}

export function formatDateTimeBound(
  value: AbsoluteOrRelativeDateTime | null | undefined,
  fallback = 'Now'
): string {
  if (!value) return fallback;
  if (value instanceof Date)
    return value
      .toISOString()
      .replace('T', ' ')
      .replace(/:00\.000Z$/, '')
      .replace(/Z$/, '');
  const offsets = value.offset
    .map(
      o => `${o.amount >= 0 ? '+' : '−'} ${Math.abs(o.amount)}${units[o.unit]}`
    )
    .join(' ');
  return `${anchors[value.anchor]}${offsets ? ` ${offsets}` : ''}`;
}
export function formatDateTimeRange(value: DateTimeRange): string {
  const range = parseDateTimeRange(value);
  const from = range.from;
  if (
    from &&
    !(from instanceof Date) &&
    from.anchor === 'RELATIVE_ANCHOR_NOW' &&
    from.offset.length === 1 &&
    from.offset[0]!.amount < 0 &&
    !range.to
  ) {
    const offset = from.offset[0]!;
    return `Last ${Math.abs(offset.amount)}${units[offset.unit]}`;
  }
  return `${formatDateTimeBound(from, 'Any time')} → ${formatDateTimeBound(range.to)}`;
}

/** Parse one bound without resolving relative anchors or offsets. */
export function parseDateTimeBound(
  text: string
): AbsoluteOrRelativeDateTime | null {
  const input = text.trim();
  invariant(!!input, 'Enter a date, time, or relative expression.');
  for (const [anchor, label] of Object.entries(anchors)) {
    if (!input.toLowerCase().startsWith(label.toLowerCase())) continue;
    const suffix = input.slice(label.length).trim();
    if (!/^(?:[+−-]\s*\d+\s*(?:mo|[smhdwy])\s*)*$/.test(suffix)) continue;
    const offset = Array.from(
      suffix.matchAll(/([+−-])\s*(\d+)\s*(mo|[smhdwy])/g),
      match => ({
        amount: Number(match[2]) * (match[1] === '+' ? 1 : -1),
        unit: Object.entries(units).find(
          ([, abbreviation]) => abbreviation === match[3]
        )![0] as RelativeUnit,
      })
    );
    return parseDateTimeRange({ from: { anchor, offset } }).from!;
  }
  // datetime-local controls encode fields without performing a local-time conversion.
  if (
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)?Z?$/.test(input)
  ) {
    const encoded = input.includes('T')
      ? input.replace(/Z$/, '')
      : `${input}T00:00`;
    const date = new Date(`${encoded}Z`);
    invariant(
      Number.isFinite(date.getTime()) && date.toISOString().startsWith(encoded),
      'Choose a valid date and time.'
    );
    return date;
  }
  const parsed = parseDateTimeRangeInput(input);
  if (parsed.ok && parsed.range.from) return parsed.range.from;
  const since = parseDateTimeRangeInput(`since ${input}`);
  invariant(
    since.ok && !!since.range.from,
    'Enter a date, time, or relative expression.'
  );
  return since.range.from;
}
