import { utcTicks } from 'd3-time';
import {
  formatDate,
  formatDateTime,
  parseDateTime,
} from '@/src/core/date-format';

const day = 86400000;
/** Only ISO calendar dates and zoned instants are inferred. Numbers require scale="utc". */
export function chartTimestamp(value: unknown, numeric = false): number | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDateTime(`${value}T00:00:00Z`)?.getTime() ?? null;
  }
  if (
    value instanceof Date ||
    typeof value === 'string' ||
    (numeric && typeof value === 'number')
  ) {
    return parseDateTime(value)?.getTime() ?? null;
  }
  return null;
}

export function timeModel(values: readonly unknown[], numeric = false) {
  if (!values.length) return null;
  const parsed = values.map(value => chartTimestamp(value, numeric));
  if (parsed.some(value => value == null)) return null;
  const times = [...new Set(parsed as number[])].sort((a, b) => a - b);
  const start = times[0]!;
  const end = times.at(-1)!;
  const gaps = times.slice(1).map((value, index) => value - times[index]!);
  const precision = gaps.reduce((minimum, gap) => Math.min(minimum, gap), day);
  const dateOnly = values.every(
    value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
  const seconds = times.some(value => value % 60000 !== 0) || precision < 60000;
  const milliseconds =
    times.some(value => value % 1000 !== 0) || precision < 1000;
  function tooltip(value: unknown) {
    const time = chartTimestamp(value, true);
    if (time == null)
      return typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
    if (dateOnly) return formatDate(new Date(time).toISOString().slice(0, 10));
    if (milliseconds) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hourCycle: 'h23',
      }).format(time);
    }
    return formatDateTime(time, {
      precision: seconds ? 'second' : 'minute',
      timeZone: 'UTC',
    });
  }
  return {
    start,
    end,
    times,
    precision: gaps.length
      ? gaps.reduce((minimum, gap) => Math.min(minimum, gap), Infinity)
      : day,
    tooltip,
  };
}

function datePart(value: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC',
  }).format(value);
}

export function timeTicks(
  model: NonNullable<ReturnType<typeof timeModel>>,
  width: number
) {
  const { start, end } = model;
  const firstDate = new Date(start);
  const lastDate = new Date(end);
  // Context distinguishes calendar boundaries within the displayed extent.
  // Constant context belongs in the exact tooltip, not repeated axis labels.
  const spansYears = firstDate.getUTCFullYear() !== lastDate.getUTCFullYear();
  const spansDates =
    firstDate.toISOString().slice(0, 10) !==
    lastDate.toISOString().slice(0, 10);
  const count = Math.max(
    2,
    Math.min(12, Math.floor(width / 80), model.times.length)
  );
  let ticks =
    start === end
      ? [start]
      : utcTicks(
          new Date(start),
          new Date(end),
          Math.min(count, (end - start) / model.precision)
        ).map(Number);
  const step =
    ticks.length > 1
      ? ticks[1]! - ticks[0]!
      : Math.max(end - start, model.precision);
  // Calendar intervals are a hint. Keep the actual extent visible, then thin by pixel distance.
  const candidates = [...new Set([start, ...ticks, end])].sort((a, b) => a - b);
  ticks = [start];
  const gap = step < 1000 ? 110 : 80;
  for (const value of candidates.slice(1)) {
    if (((value - ticks.at(-1)!) / (end - start)) * width >= gap)
      ticks.push(value);
  }
  if (end !== start && ticks.at(-1) !== end) {
    if (
      ticks.length > 1 &&
      ((end - ticks.at(-1)!) / (end - start)) * width < gap
    )
      ticks.pop();
    ticks.push(end);
  }
  function label(value: number, index: number) {
    const previous = index > 0 ? new Date(ticks[index - 1]!) : undefined;
    const date = new Date(value);
    const yearChanged =
      !previous || previous.getUTCFullYear() !== date.getUTCFullYear();
    const dateChanged =
      !previous ||
      previous.toISOString().slice(0, 10) !== date.toISOString().slice(0, 10);
    if (step >= 300 * day)
      return { main: String(date.getUTCFullYear()), context: '' };
    if (
      step >= 28 * day &&
      (model.precision >= 28 * day || end - start >= 180 * day)
    )
      return {
        main: datePart(value, { month: 'short' }),
        context: spansYears && yearChanged ? String(date.getUTCFullYear()) : '',
      };
    if (step >= day && !(model.precision < day && end - start <= 3 * day))
      return {
        main: datePart(value, { month: 'short', day: 'numeric' }),
        context: spansYears && yearChanged ? String(date.getUTCFullYear()) : '',
      };
    return {
      main: datePart(value, {
        hour: '2-digit',
        minute: '2-digit',
        ...(step < 60000 ? { second: '2-digit' as const } : {}),
        ...(step < 1000 ? { fractionalSecondDigits: 3 as const } : {}),
        hourCycle: 'h23',
      }),
      context:
        spansDates && dateChanged
          ? datePart(value, {
              month: 'short',
              day: 'numeric',
              ...(spansYears && yearChanged
                ? { year: 'numeric' as const }
                : {}),
            })
          : '',
    };
  }
  return { ticks, label };
}
