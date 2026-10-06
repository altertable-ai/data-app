import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { parseDate, type CalendarDate } from '@internationalized/date';
import {
  Button,
  DateRangePicker as AriaDateRangePicker,
  Dialog,
  Group,
  Popover,
  RangeCalendar,
  type RangeValue,
} from 'react-aria-components';
import { CalendarContent } from '@/src/react/ui/CalendarContent';
import { classNames } from '@/src/react/ui/classNames';
import { AppIcon } from '@/src/react/ui/icons';
import { formatDateRange, pluralize } from '@/src/core/format';
import { Checkbox } from '@/src/react/ui/Checkbox';

import {
  availableDatePresets,
  inclusiveDays,
  withinBounds,
  type DatePreset,
  type DatePresetId,
  type DateRange,
} from '@/src/core/date-range';
export type { DatePresetId, DateRange } from '@/src/core/date-range';

export type OpenDateRange = { start: string | null; end: string | null };

type RangeSelection =
  | {
      allowOpenRange?: false;
      value: DateRange | null;
      onChange: (range: DateRange | null) => void;
    }
  | {
      allowOpenRange: true;
      value: OpenDateRange | null;
      onChange: (range: OpenDateRange | null) => void;
    };

export type DateRangePickerProps = RangeSelection & {
  label?: string;
  onClear?: () => void;
  isAllowed?: (range: OpenDateRange | null) => boolean;
  minDate?: string;
  maxDate?: string;
  maxRangeDays?: number;
  timeZone?: string;
  /** Used to display the reset affordance. The app variable owns the URL and reset meaning. */
  resetValue?: DateRange;
  isDefault?: boolean;
  onReset?: () => void;
  onPresetChange?: (id: DatePresetId) => void;
  selectedPresetId?: DatePresetId | null;
  calendarFooter?: ReactNode;
  comparison?: {
    enabled: boolean;
    range: DateRange | null;
    onChange: (enabled: boolean) => void;
  };
} & Omit<
    ComponentProps<typeof AriaDateRangePicker<CalendarDate>>,
    | 'children'
    | 'value'
    | 'onChange'
    | 'minValue'
    | 'maxValue'
    | 'isOpen'
    | 'onOpenChange'
    | 'defaultValue'
    | 'defaultOpen'
  >;

/** The app owns URL state; `dateRangeControl` binds a date variable to this picker. */
export function DateRangePicker({
  label = 'Date range',
  value,
  onChange,
  allowOpenRange = false,
  onClear,
  isAllowed = () => true,
  minDate,
  maxDate,
  maxRangeDays,
  timeZone,
  resetValue,
  isDefault,
  onReset,
  onPresetChange,
  selectedPresetId,
  calendarFooter,
  comparison,
  className,
  ...props
}: DateRangePickerProps) {
  const errorId = useId();
  const source = JSON.stringify(value);
  const [draft, setDraft] = useState<{
    source: string;
    start: string;
    end: string;
  } | null>(null);
  const fields =
    draft?.source === source
      ? draft
      : { start: value?.start ?? '', end: value?.end ?? '' };
  const completeValue =
    value?.start && value.end ? { start: value.start, end: value.end } : null;
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const selected: RangeValue<CalendarDate> | null = completeValue
    ? {
        start: parseDate(completeValue.start),
        end: parseDate(completeValue.end),
      }
    : null;
  const presets = availableDatePresets({
    minDate,
    maxDate,
    maxRangeDays,
    timeZone,
  });
  const selectedDays = completeValue ? inclusiveDays(completeValue) : 0;

  function commit(next: OpenDateRange | null): boolean {
    if (
      next &&
      [next.start, next.end].some(
        date =>
          date &&
          ((minDate && date < minDate) ||
            (maxDate && date > maxDate) ||
            props.isDateUnavailable?.(
              parseDate(date),
              next.start ? parseDate(next.start) : null
            ))
      )
    ) {
      setError('Choose dates within the available range.');
      return false;
    }
    if (next?.start && next.end) {
      const range = { start: next.start, end: next.end };
      if (!withinBounds(range, minDate, maxDate, maxRangeDays)) {
        setError(
          next.start > next.end
            ? 'End date must be on or after start date.'
            : maxRangeDays
              ? `Choose up to ${maxRangeDays} available days.`
              : 'Choose dates within the available range.'
        );
        return false;
      }
    }
    if (!isAllowed(next)) {
      setError('Choose an allowed range.');
      return false;
    }
    setError('');
    if (!next || (next.start && next.end)) {
      onChange(next as DateRange | null);
    } else if (allowOpenRange) {
      (onChange as (value: OpenDateRange) => void)(next);
    } else return false;
    setDraft(null);
    return true;
  }
  function edit(endpoint: 'start' | 'end', date: string) {
    const next = { ...fields, [endpoint]: date };
    setDraft({ ...next, source });
    commit({ start: next.start || null, end: next.end || null });
  }

  function choosePreset(preset: DatePreset) {
    setError('');
    setDraft(null);
    if (onPresetChange) onPresetChange(preset.id);
    else if (!commit(preset.range)) return;
    setOpen(false);
  }

  return (
    <AriaDateRangePicker
      {...props}
      isOpen={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setError('');
      }}
      aria-label={`${props['aria-label'] ?? label}${comparison?.enabled ? ', compared with previous period' : ''}`}
      className={values =>
        classNames(
          'altertable-date-range',
          typeof className === 'function' ? className(values) : className
        )
      }
      value={selected}
      onChange={range =>
        commit(
          range
            ? { start: range.start.toString(), end: range.end.toString() }
            : null
        )
      }
      minValue={minDate ? parseDate(minDate) : undefined}
      maxValue={maxDate ? parseDate(maxDate) : undefined}
    >
      <Group>
        <span className="altertable-date-range-label" aria-hidden="true">
          {label}
        </span>
        <input
          type="date"
          aria-label={`${label} from`}
          value={fields.start}
          min={minDate}
          max={fields.end || maxDate}
          disabled={props.isDisabled}
          readOnly={props.isReadOnly}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={event => edit('start', event.target.value)}
        />
        <span aria-hidden="true">–</span>
        <input
          type="date"
          aria-label={`${label} to`}
          value={fields.end}
          min={fields.start || minDate}
          max={maxDate}
          disabled={props.isDisabled}
          readOnly={props.isReadOnly}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={event => edit('end', event.target.value)}
        />
        {onClear && (
          <button
            type="button"
            className="altertable-date-range-reset"
            aria-label={`Clear ${label}`}
            disabled={props.isDisabled || props.isReadOnly}
            onClick={() => {
              setDraft(null);
              setError('');
              onClear();
            }}
          >
            <AppIcon name="close" size={14} />
          </button>
        )}
        {comparison?.enabled && (
          <span className="altertable-date-range-comparison">vs prior</span>
        )}
        {(onReset || resetValue) &&
          value &&
          !(
            isDefault ??
            (resetValue &&
              value.start === resetValue.start &&
              value.end === resetValue.end)
          ) && (
            <button
              type="button"
              className="altertable-date-range-reset"
              aria-label="Reset date range"
              disabled={props.isDisabled || props.isReadOnly}
              onClick={() => {
                setDraft(null);
                setError('');
                if (onReset) onReset();
                else commit(resetValue ?? null);
              }}
            >
              <AppIcon name="reset" size={14} />
            </button>
          )}
        <Button aria-label="Choose dates">
          <AppIcon name="calendar" size={16} />
        </Button>
      </Group>
      {error && (
        <span id={errorId} className="altertable-date-range-error" role="alert">
          {error}
        </span>
      )}
      <Popover className="altertable-date-range-popover">
        <Dialog>
          <div className="altertable-date-range-content">
            {presets.length > 0 && (
              <fieldset className="altertable-date-range-presets">
                <legend className="altertable-date-range-heading">
                  Quick ranges
                </legend>
                <div className="altertable-date-range-preset-list">
                  {presets.map(preset => (
                    <Button
                      key={preset.id}
                      className="altertable-date-range-preset"
                      aria-current={
                        (
                          selectedPresetId === undefined
                            ? value?.start === preset.range.start &&
                              value?.end === preset.range.end
                            : selectedPresetId === preset.id
                        )
                          ? 'true'
                          : undefined
                      }
                      onPress={() => choosePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="altertable-date-range-custom">
              <span className="altertable-date-range-heading">
                Custom range
              </span>
              <RangeCalendar
                defaultFocusedValue={
                  value?.start
                    ? parseDate(value.start)
                    : value?.end
                      ? parseDate(value.end)
                      : undefined
                }
                isDateUnavailable={(date, anchorDate) =>
                  !!props.isDateUnavailable?.(date, anchorDate) ||
                  (!!maxRangeDays &&
                    !!anchorDate &&
                    Math.abs(
                      date.toDate('UTC').getTime() -
                        anchorDate.toDate('UTC').getTime()
                    ) >=
                      maxRangeDays * 86_400_000)
                }
              >
                <CalendarContent />
              </RangeCalendar>
              <div className="altertable-date-range-footer">
                <div>
                  <span className="altertable-date-range-footer-label">
                    Selected dates
                  </span>
                  <strong>
                    {completeValue
                      ? formatDateRange(completeValue)
                      : 'Select a start and end date'}
                  </strong>
                </div>
                {completeValue && (
                  <span className="altertable-date-range-footer-meta">
                    {selectedDays} {pluralize(selectedDays, 'day')}
                    {timeZone ? ` · ${timeZone}` : ''}
                  </span>
                )}
              </div>
              {comparison && (
                <Checkbox
                  className="altertable-date-range-compare"
                  label="Compare with previous period"
                  checked={comparison.enabled}
                  disabled={!comparison.range}
                  onChange={comparison.onChange}
                  description={
                    comparison.range && formatDateRange(comparison.range)
                  }
                />
              )}
            </div>
          </div>
          {calendarFooter}
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
