import { DatePicker } from '@/src/react/ui/DatePicker';
import { formatVariableDate } from '@/src/react/ui/query-dates/resolve-date';
import type { AbsoluteOrRelativeDateTime } from '@/src/core/query-variables';

/** Relative values stay relative until the user chooses a calendar date. */
export function DateTimeValueSelector({
  label,
  value,
  onChange,
  nullable = false,
  isAllowed = () => true,
}: {
  label: string;
  value: AbsoluteOrRelativeDateTime | null;
  onChange: (value: AbsoluteOrRelativeDateTime | null) => void;
  nullable?: boolean;
  options?: readonly (AbsoluteOrRelativeDateTime | null)[];
  isAllowed?: (value: AbsoluteOrRelativeDateTime | null) => boolean;
}) {
  function toValue(date: string | null) {
    return date ? new Date(`${date}T00:00:00.000Z`) : null;
  }
  return (
    <DatePicker
      label={label}
      value={formatVariableDate(value) || null}
      nullable={nullable}
      onChange={date => onChange(toValue(date))}
      isAllowed={date => isAllowed(toValue(date))}
    />
  );
}
