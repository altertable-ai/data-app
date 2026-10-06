import {
  DateRangePicker,
  type OpenDateRange,
} from '@/src/react/ui/DateRangePicker';
import { formatVariableDate } from '@/src/react/ui/query-dates/resolve-date';
import type { DateTimeRange } from '@/src/core/query-variables';

/** Adapt query values to the shared calendar picker with inclusive UTC endpoints. */
export function DateTimeRangeValueSelector({
  label,
  value,
  onChange,
  nullable = false,
  isAllowed = () => true,
}: {
  label: string;
  value: DateTimeRange | null;
  onChange: (value: DateTimeRange | null) => void;
  nullable?: boolean;
  options?: readonly (DateTimeRange | null)[];
  isAllowed?: (value: DateTimeRange | null) => boolean;
}) {
  function toValue(range: OpenDateRange | null): DateTimeRange | null {
    return range
      ? {
          from: range.start ? new Date(`${range.start}T00:00:00.000Z`) : null,
          to: range.end ? new Date(`${range.end}T23:59:59.999Z`) : null,
        }
      : null;
  }
  return (
    <DateRangePicker
      allowOpenRange
      label={label}
      timeZone="UTC"
      value={
        value
          ? {
              start: formatVariableDate(value.from) || null,
              end: formatVariableDate(value.to) || null,
            }
          : null
      }
      onChange={range => onChange(toValue(range))}
      isAllowed={range => isAllowed(toValue(range))}
      onClear={nullable ? () => onChange(null) : undefined}
    />
  );
}
