import { fromDate, getDayOfWeek } from '@internationalized/date';
import type { AbsoluteOrRelativeDateTime } from '@/src/core/query-variables';

function resolveVariableDateTime(value: AbsoluteOrRelativeDateTime): Date {
  if (value instanceof Date) return value;
  let date = fromDate(new Date(), 'UTC');
  if (value.anchor !== 'RELATIVE_ANCHOR_NOW')
    date = date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  switch (value.anchor) {
    case 'RELATIVE_ANCHOR_START_OF_YESTERDAY':
      date = date.subtract({ days: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_TOMORROW':
      date = date.add({ days: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_WEEK':
      date = date.subtract({ days: getDayOfWeek(date, 'en-GB') });
      break;
    case 'RELATIVE_ANCHOR_START_OF_MONTH':
      date = date.set({ day: 1 });
      break;
    case 'RELATIVE_ANCHOR_START_OF_YEAR':
      date = date.set({ month: 1, day: 1 });
      break;
  }
  for (const { amount, unit } of value.offset) {
    const key = {
      SECOND: 'seconds',
      MINUTE: 'minutes',
      HOUR: 'hours',
      DAY: 'days',
      WEEK: 'weeks',
      MONTH: 'months',
      YEAR: 'years',
    }[unit];
    date = date.add({ [key]: amount });
  }
  return date.toDate();
}

/** Display URL or controlled values without making malformed values crash the UI. */
export function formatVariableDate(
  value: AbsoluteOrRelativeDateTime | null | undefined
): string {
  if (!value) return '';
  try {
    return resolveVariableDateTime(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
