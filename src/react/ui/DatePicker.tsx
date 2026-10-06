import { useId, useState } from 'react';
import { parseDate } from '@internationalized/date';
import {
  Button,
  Calendar,
  DatePicker as AriaDatePicker,
  Dialog,
  Group,
  Popover,
} from 'react-aria-components';
import { CalendarContent } from '@/src/react/ui/CalendarContent';
import { AppIcon } from '@/src/react/ui/icons';

export type DatePickerProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  nullable?: boolean;
  minDate?: string;
  maxDate?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isAllowed?: (value: string | null) => boolean;
};

/** Compact calendar control, sharing the range picker's navigation and styling. */
export function DatePicker({
  label,
  value,
  onChange,
  nullable = false,
  minDate,
  maxDate,
  isDisabled,
  isReadOnly,
  isAllowed = () => true,
}: DatePickerProps) {
  const errorId = useId();
  const [draft, setDraft] = useState<{
    source: string | null;
    value: string;
    error: string;
  } | null>(null);
  const current =
    draft?.source === value ? draft : { value: value ?? '', error: '' };
  function change(next: string | null) {
    const error =
      !next && !nullable
        ? 'Choose a date.'
        : next && ((minDate && next < minDate) || (maxDate && next > maxDate))
          ? 'Choose a date within the available range.'
          : !isAllowed(next)
            ? 'Choose an allowed date.'
            : '';
    if (error) {
      setDraft({ source: value, value: next ?? '', error });
      return;
    }
    setDraft(null);
    onChange(next);
  }
  return (
    <AriaDatePicker
      aria-label={label}
      className="altertable-date-range altertable-single-date"
      value={value ? parseDate(value) : null}
      onChange={date => change(date?.toString() ?? null)}
      minValue={minDate ? parseDate(minDate) : undefined}
      maxValue={maxDate ? parseDate(maxDate) : undefined}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      <Group>
        <span className="altertable-date-range-label" aria-hidden="true">
          {label}
        </span>
        <input
          type="date"
          aria-label={label}
          value={current.value}
          min={minDate}
          max={maxDate}
          disabled={isDisabled}
          readOnly={isReadOnly}
          aria-invalid={!!current.error || undefined}
          aria-describedby={current.error ? errorId : undefined}
          onChange={event => change(event.target.value || null)}
        />
        {nullable && (
          <button
            type="button"
            className="altertable-date-range-reset"
            aria-label={`Clear ${label}`}
            disabled={isDisabled || isReadOnly}
            onClick={() => change(null)}
          >
            <AppIcon name="close" size={14} />
          </button>
        )}
        <Button aria-label={`Choose ${label.toLowerCase()}`}>
          <AppIcon name="calendar" size={16} />
        </Button>
      </Group>
      {current.error && (
        <span id={errorId} role="alert" className="altertable-date-range-error">
          {current.error}
        </span>
      )}
      <Popover className="altertable-date-range-popover altertable-single-date-popover">
        <Dialog>
          <Calendar>
            <CalendarContent />
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
