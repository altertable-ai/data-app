import type { DateTimeRange } from '@altertable/data-app/contract';
import { formatDateRange, pluralize } from '@altertable/data-app/format';
import {
  availableDatePresets,
  withinBounds,
  type DatePresetId,
  type DateRange,
} from '@altertable/data-app/internal';
import { parseDate, type CalendarDate } from '@internationalized/date';
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

import { useDateFormatting } from '../date-formatting.ts';
import { formatDateTimeRangeInputDate } from './date-time-range-input.ts';
import { RangePicker } from './DateTimeRangePicker.tsx';
import { AppIcon } from './icons.ts';
import type { ControlLabelPlacement } from './PickerField.tsx';
export {
  type DatePresetId,
  type DateRange,
} from '@altertable/data-app/internal';

/** State exposed to calendar picker styling callbacks. */
export type DateRangePickerRenderState = {
  isOpen: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
};

export type DateRangePickerProps = {
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  className?: string | ((state: DateRangePickerRenderState) => string);
  style?:
    | CSSProperties
    | ((state: DateRangePickerRenderState) => CSSProperties);
  /** Rejects a candidate inclusive range before it is committed. */
  validate?: (range: {
    start: CalendarDate;
    end: CalendarDate;
  }) => string | string[] | true | null | undefined;
  /** Only available days can be selected or included in a committed range. */
  isDateAvailable?: (date: CalendarDate) => boolean;
  label?: string;
  labelPlacement?: Exclude<ControlLabelPlacement, 'inline'>;
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
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
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'id'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'autoFocus'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyUp'
>;

/** Inclusive calendar-date adapter for the shared range picker. Existing variables retain their URL and preset semantics.
 * One editable input exposes the range through value/onChange; separate named start/end form fields are not supported.
 */
export function DateRangePicker({
  label = 'Date range',
  labelPlacement,
  value,
  onChange,
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
  const formatting = useDateFormatting();
  const presets = availableDatePresets({
    minDate,
    maxDate,
    maxRangeDays,
    timeZone,
  }).filter(preset => !validate(calendarInterval(preset.range)));
  const selectedIndex = presets.findIndex(preset =>
    selectedPresetId === undefined
      ? value?.start === preset.range.start && value?.end === preset.range.end
      : selectedPresetId === preset.id
  );
  function validate(range: DateTimeRange) {
    const dates = calendarDates(range);
    if (!dates)
      return 'Choose whole calendar days, or select a reporting preset.';
    if (!withinBounds(dates, minDate, maxDate, maxRangeDays))
      return maxRangeDays
        ? `Choose up to ${maxRangeDays} available ${pluralize(maxRangeDays, 'day')}.`
        : 'Choose dates within the available range.';
    const start = parseDate(dates.start);
    const end = parseDate(dates.end);
    if (props.isDateAvailable) {
      for (let day = start; day.compare(end) <= 0; day = day.add({ days: 1 }))
        if (!props.isDateAvailable(day))
          return 'Choose a range without unavailable dates.';
    }
    const issue = props.validate?.({ start, end });
    return Array.isArray(issue)
      ? issue.join(' ')
      : typeof issue === 'string'
        ? issue
        : '';
  }
  return (
    <RangePicker
      label={props['aria-label'] ?? label}
      labelPlacement={labelPlacement}
      value={value ? calendarInterval(value) : null}
      onChange={range => {
        const dates = calendarDates(range);
        if (dates) onChange(dates);
      }}
      disabled={props.isDisabled}
      maxRangeDays={maxRangeDays}
      presets={presets.map(preset => ({
        label: preset.label,
        shortcut: preset.id.startsWith('last-')
          ? `${preset.id.slice(5)}d`
          : undefined,
        range: calendarInterval(preset.range),
      }))}
      comparison={
        comparison
          ? {
              ...comparison,
              range: comparison.range
                ? calendarInterval(comparison.range)
                : null,
            }
          : undefined
      }
      calendarAdapter={{
        minDate,
        maxDate,
        timeZone,
        validate,
        isDateAvailable: props.isDateAvailable,
        readOnly: props.isReadOnly,
        className,
        style: props.style,
        inputProps: {
          id: props.id,
          'aria-describedby': props['aria-describedby'],
          'aria-labelledby': props['aria-labelledby'],
          'aria-invalid': props.isInvalid,
          'aria-required': props.isRequired,
          autoFocus: props.autoFocus,
          onFocus: props.onFocus,
          onBlur: props.onBlur,
          onKeyUp: props.onKeyUp,
        },
        label: value ? formatDateRange(value, formatting) : '',
        inputLabel: value
          ? [value.start, value.end]
              .map(date =>
                formatDateTimeRangeInputDate(
                  parseDate(date).toDate('UTC'),
                  formatting.locale,
                  true
                )
              )
              .join(' – ')
          : '',
        comparisonLabel: comparison?.range
          ? formatDateRange(comparison.range, formatting)
          : undefined,
        selectedIndex,
        onPreset(index) {
          const preset = presets[index]!;
          if (onPresetChange) onPresetChange(preset.id);
          else onChange(preset.range);
        },
        footer: calendarFooter,
        reset:
          (onReset || resetValue) &&
          value &&
          !(
            isDefault ??
            (resetValue &&
              value.start === resetValue.start &&
              value.end === resetValue.end)
          ) ? (
            <button
              type="button"
              disabled={props.isDisabled || props.isReadOnly}
              data-atbl-focus="ring"
              data-atbl-control="action"
              aria-label="Reset date range"
              onClick={event => {
                event.stopPropagation();
                if (onReset) onReset();
                else onChange(resetValue ?? null);
              }}
            >
              <AppIcon name="reset" size={14} />
            </button>
          ) : undefined,
      }}
    />
  );
}

function calendarInterval(range: DateRange): DateTimeRange {
  return {
    from: parseDate(range.start).toDate('UTC'),
    to: parseDate(range.end).add({ days: 1 }).toDate('UTC'),
  };
}

function calendarDates(range: DateTimeRange): DateRange | null {
  if (
    !(range.from instanceof Date) ||
    !(range.to instanceof Date) ||
    !Number.isFinite(range.from.getTime()) ||
    !Number.isFinite(range.to.getTime()) ||
    range.from.getTime() >= range.to.getTime() ||
    range.from.toISOString().slice(11) !== '00:00:00.000Z' ||
    range.to.toISOString().slice(11) !== '00:00:00.000Z'
  )
    return null;
  return {
    start: range.from.toISOString().slice(0, 10),
    end: new Date(range.to.getTime() - 1).toISOString().slice(0, 10),
  };
}
