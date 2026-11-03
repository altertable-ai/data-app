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
import { fixedUnitMilliseconds } from '@altertable/data-app/internal';

/** Rebased timestamps are wall-clock fields; never convert them through the display timezone. */
export function dateTimeRangeLabel(
  value: DateTimeRange,
  options: DateFormatOptions = {}
) {
  const { from, to } = parseDateTimeRange(value);
  if (!(from instanceof Date) || !(to instanceof Date))
    return formatDateTimeRange(value);
  if (
    from.getTime() % fixedUnitMilliseconds.DAY === 0 &&
    to.getTime() % fixedUnitMilliseconds.DAY === 0
  )
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
