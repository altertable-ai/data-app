/** Formatting for calendar dates and instants without implicit time-zone parsing. */

export type DateFormatOptions = {
  locale?: string;
  missing?: string;
};

export type DateTimeFormatOptions = DateFormatOptions & {
  timeZone?: string;
  precision?: 'minute' | 'second';
};

export type DateFormat =
  | ({ kind: 'date' } & DateFormatOptions)
  | ({ kind: 'dateTime' } & DateTimeFormatOptions);

type DateTimeValue = string | Date | number | null | undefined;

const calendarDate = /^\d{4}-\d{2}-\d{2}$/;
const timestamp =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function missing(options: DateFormatOptions) {
  return options.missing ?? '—';
}

function parseCalendarDate(value: string): Date | null {
  if (!calendarDate.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function formatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return null;
  }
}

/** Format an ISO calendar date as a date, never as a browser-local instant. */
export function formatDate(
  value: string | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (value === null || value === undefined) return missing(options);
  const date = parseCalendarDate(value);
  const format = formatter(options.locale ?? 'en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });

  return date && format ? format.format(date) : missing(options);
}

/** Parse only unambiguous instants. String values must include `Z` or an explicit offset. */
export function parseDateTime(value: DateTimeValue): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = timestamp.exec(value);
  if (!match || !parseCalendarDate(match[1]!)) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format an instant in an explicit reporting zone. Defaults use UTC and 24-hour minutes. */
export function formatDateTime(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
): string {
  const date = parseDateTime(value);
  const format = formatter(options.locale ?? 'en-US', {
    dateStyle: 'medium',
    timeStyle: options.precision === 'second' ? 'medium' : 'short',
    hourCycle: 'h23',
    timeZone: options.timeZone ?? 'UTC',
  });

  return date && format ? format.format(date) : missing(options);
}

/** Format an instant's time for intraday chart axes using the same zone and precision policy. */
export function formatTime(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
): string {
  const date = parseDateTime(value);
  const format = formatter(options.locale ?? 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(options.precision === 'second' ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
    timeZone: options.timeZone ?? 'UTC',
  });

  return date && format ? format.format(date) : missing(options);
}
