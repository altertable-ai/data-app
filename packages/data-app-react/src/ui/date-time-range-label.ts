import {
  formatDateTimeRange,
  parseDateTimeRange,
  type DateTimeRange,
} from '@altertable/data-app/contract';
import {
  formatDateRange,
  formatDateTime,
  type DateFormatOptions,
} from '@altertable/data-app/format';

/** Rebased timestamps are wall-clock fields; never convert them through the display timezone. */
export function dateTimeRangeLabel(
  value: DateTimeRange,
  options: DateFormatOptions = {}
) {
  const { from, to } = parseDateTimeRange(value);
  if (!(from instanceof Date) || !(to instanceof Date))
    return formatDateTimeRange(value);
  if (from.getTime() % 86_400_000 === 0 && to.getTime() % 86_400_000 === 0)
    return formatDateRange(
      {
        start: from.toISOString().slice(0, 10),
        end: new Date(to.getTime() - 1).toISOString().slice(0, 10),
      },
      options
    );
  const rebased = { ...options, timeZone: 'UTC' };
  return `${formatDateTime(from, rebased)} – ${formatDateTime(to, rebased)}`;
}
