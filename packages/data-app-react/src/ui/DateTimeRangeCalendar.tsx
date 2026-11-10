import {
  resolveDateTimeRange,
  type DateTimeRange,
  type DateTimeRangePolicy,
} from '@altertable/data-app/contract';
import { fixedUnitMilliseconds } from '@altertable/data-app/internal';
import { parseDate, today, type CalendarDate } from '@internationalized/date';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  RangeCalendar,
  RangeCalendarStateContext,
  CalendarGrid,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarGridBody,
  CalendarCell,
  type RangeValue,
} from 'react-aria-components';

import { useDateFormatting } from '../date-formatting.ts';
import { Button } from './Button.tsx';
import { AppIcon } from './icons.ts';
import { Select } from './Select.tsx';

/** Calendar days map to UTC fields and a next-midnight exclusive end. */
export function DateTimeRangeCalendar({
  value,
  maxRangeDays,
  policy,
  onChange,
  onCompleteChange,
}: {
  value: DateTimeRange | null;
  maxRangeDays?: number;
  policy?: DateTimeRangePolicy;
  onCompleteChange: (complete: boolean) => void;
  onChange: (value: DateTimeRange | null) => void;
}) {
  const { locale } = useDateFormatting();
  const limits = policy?.bounds();
  const currentDay = limits ? parseDate(limits.maxDate) : today('UTC');
  const [selection, setSelection] = useState<RangeValue<CalendarDate> | null>(
    () => {
      if (!value) return null;
      try {
        const resolved = policy
          ? policy.resolve(value)
          : resolveDateTimeRange(value);
        if (
          !resolved.from ||
          resolved.from.toISOString().slice(0, 10) > currentDay.toString()
        )
          return null;
        return {
          start: parseDate(resolved.from.toISOString().slice(0, 10)),
          end: parseDate(
            new Date(resolved.to.getTime() - 1).toISOString().slice(0, 10)
          ),
        };
      } catch {
        return null;
      }
    }
  );
  const [focused, setFocused] = useState(selection?.start ?? currentDay);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Opening the calendar is an explicit action; focus its selected day, not its header.
    ref.current
      ?.querySelector<HTMLElement>(
        '[role="gridcell"][tabindex="0"], [role="gridcell"] [tabindex="0"]'
      )
      ?.focus();
  }, []);
  return (
    <RangeCalendar
      ref={ref}
      aria-label="Select date range"
      className="altertable-datetime-calendar"
      value={selection}
      focusedValue={focused}
      onFocusChange={setFocused}
      maxValue={currentDay}
      minValue={limits?.minDate ? parseDate(limits.minDate) : undefined}
      isDateUnavailable={(date, anchor) =>
        !!maxRangeDays &&
        !!anchor &&
        Math.abs(
          date.toDate('UTC').getTime() - anchor.toDate('UTC').getTime()
        ) >=
          maxRangeDays * fixedUnitMilliseconds.DAY
      }
      onChange={range => {
        setSelection(range);
        onChange(
          range
            ? {
                from: range.start.toDate('UTC'),
                to: range.end.add({ days: 1 }).toDate('UTC'),
              }
            : null
        );
      }}
    >
      <CalendarCompleteness onChange={onCompleteChange} />
      <header>
        <Button
          size="icon"
          aria-label="Previous month"
          onClick={() => setFocused(focused.subtract({ months: 1 }))}
        >
          <AppIcon name="previousMonth" size={16} />
        </Button>
        <Select
          label="Month"
          labelPlacement="inline"
          value={String(focused.month)}
          options={Array.from({ length: 12 }, (_, index) => ({
            id: String(index + 1),
            label: new Intl.DateTimeFormat(locale, {
              month: 'long',
              timeZone: 'UTC',
            }).format(new Date(Date.UTC(2000, index, 1))),
          }))}
          onChange={month => setFocused(focused.set({ month: Number(month) }))}
        />
        <Select
          label="Year"
          labelPlacement="inline"
          value={String(focused.year)}
          options={Array.from(
            {
              length:
                currentDay.year -
                Math.min(currentDay.year - 100, focused.year) +
                1,
            },
            (_, index) => {
              const year = currentDay.year - index;
              return { id: String(year), label: String(year) };
            }
          )}
          onChange={year => setFocused(focused.set({ year: Number(year) }))}
        />
        <Button
          size="icon"
          aria-label="Next month"
          disabled={
            focused.year >= currentDay.year && focused.month >= currentDay.month
          }
          onClick={() => setFocused(focused.add({ months: 1 }))}
        >
          <AppIcon name="nextMonth" size={16} />
        </Button>
      </header>
      <CalendarGrid>
        <CalendarGridHeader>
          {day => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {date => (
            <CalendarCell
              date={date}
              data-atbl-focus="inset"
              data-atbl-control="action"
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </RangeCalendar>
  );
}

function CalendarCompleteness({
  onChange,
}: {
  onChange: (complete: boolean) => void;
}) {
  const state = useContext(RangeCalendarStateContext);
  const complete = !!state?.value && !state.anchorDate;
  const notifyChange = useEffectEvent(onChange);
  useEffect(() => {
    notifyChange(complete);
  }, [complete]);
  return null;
}
