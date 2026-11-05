/* eslint-disable jsx-a11y/prefer-tag-over-role -- The editable combobox owns a custom listbox and calendar popup, not a native select. */
import {
  parseDateTimeBound,
  parseDateTimeRange,
  formatDateTimeBound,
  formatDateTimeRange,
  resolveDateTimeRange,
  serializeDateTimeRange,
  type DateTimeRange,
  type DateTimeRangePreset,
  type DateRangeContract,
} from '@altertable/data-app/contract';
import {
  formatDateTime,
  type DateFormatOptions,
  parseDateTimeRangeInput,
} from '@altertable/data-app/format';
import { parseDate } from '@internationalized/date';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useReducer,
  type ReactNode,
  type InputHTMLAttributes,
} from 'react';

import { useDateFormatting } from '../date-formatting.ts';
import { Button } from './Button.tsx';
import { classNames } from './classNames.ts';
import {
  editDateTimeRangeInputSegment,
  normalizeDateTimeRangeInput,
  getDateTimeRangeInputSegmentSelection,
} from './date-time-range-input.ts';
import { dateTimeRangeLabel } from './date-time-range-label.ts';
import {
  dateTimeRangePickerReducer,
  initialPickerState,
} from './date-time-range-picker-state.ts';
import { DateTimeRangeCalendar } from './DateTimeRangeCalendar.tsx';
import { AppIcon } from './icons.ts';
import { PickerField, type ControlLabelPlacement } from './PickerField.tsx';
import { PopoverSurface } from './PopoverSurface.tsx';

export type DateTimeRangePickerProps = {
  value: DateTimeRange | null;
  /** Commits a selection; the optional second argument indicates host-owned Live mode. */
  onChange: (value: DateTimeRange, live?: boolean) => void;
  /** Adds a Live preset using dateTimeRange; isLive reflects the applied mode. The host owns refresh scheduling. */
  liveOption?: { dateTimeRange: DateTimeRange; isLive: boolean };
  className?: string;
  placeholder?: string;
  label?: string;
  labelPlacement?: ControlLabelPlacement;
  /** Client limit for determinate durations; validate timezone-dependent ranges on the backend. */
  maxRangeDays?: number;
  /** Shared reporting policy; generated controls inherit it from their variable. */
  contract?: DateRangeContract;
  /** Suggestions in display order. Omit for defaults; [] retains calendar and text entry.
   * Invalid or over-limit suggestions are omitted; typed input is not restricted to the menu.
   */
  presets?: readonly DateTimeRangePreset[];
  disabled?: boolean;
  /** Optional controlled comparison with the immediately preceding equal-length interval. */
  comparison?: {
    enabled: boolean;
    range: DateTimeRange | null;
    onChange: (enabled: boolean) => void;
  };
};

/** Internal bridge for inclusive calendar-date APIs. UTC Dates encode day fields only. */
type CalendarPickerAdapter = {
  minDate?: string;
  maxDate?: string;
  timeZone?: string;
  validate: (range: DateTimeRange) => string;
  label: string;
  comparisonLabel?: string;
  inputLabel: string;
  selectedIndex: number;
  onPreset: (index: number) => void;
  footer?: ReactNode;
  reset?: ReactNode;
  inputProps?: Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | 'id'
    | 'aria-describedby'
    | 'aria-labelledby'
    | 'aria-invalid'
    | 'aria-required'
    | 'autoFocus'
    | 'onFocus'
    | 'onBlur'
    | 'onKeyUp'
  >;
};

const presetInputs = [
  ['15m', 'Past 15 minutes'],
  ['4h', 'Past 4 hours'],
  ['1d', 'Past 24 hours'],
  ['2d', 'Past 2 days'],
  ['3d', 'Past 3 days'],
  ['7d', 'Past 7 days'],
  ['1mo', 'Past 1 month'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
] as const;
const examples = {
  Recent: [
    '45m',
    '12 hours',
    '10d',
    '2 weeks',
    'last month',
    'yesterday',
    'today',
    'month to date',
  ],
  Calendar: [
    '2022',
    '2023 to 2024',
    'July 2024',
    'Jul 1',
    'Jul 1 - Jul 2',
    '7/1',
    '10:00 - 16:00',
  ],
  Since: ['since 7/1', 'Jul 2 12pm to now'],
  Unix: ['1783003329 - 1783608129', '1783609703 to now'],
};
function resolvedLabel(
  value: DateTimeRange | null,
  contract?: DateRangeContract,
  options: DateFormatOptions = {}
) {
  if (!value) return '';
  try {
    const { from, to } = contract
      ? contract.datetime.resolve(value)
      : resolveDateTimeRange(value);
    return from
      ? `${formatDateTime(from, { ...options, timeZone: 'UTC' })} – ${formatDateTime(to, { ...options, timeZone: 'UTC' })}`
      : '';
  } catch {
    // A UTC-only preview may be inverted even when valid in the reporting zone.
    return value.from
      ? `${formatDateTimeBound(value.from)} to ${formatDateTimeBound(value.to)}`
      : '';
  }
}
function summaryLabel(value: DateTimeRange | null, options: DateFormatOptions) {
  if (!value) return '';
  for (const [input, label] of presetInputs) {
    const parsed = parseDateTimeRangeInput(input);
    if (
      parsed.ok &&
      serializeDateTimeRange(parsed.range) === serializeDateTimeRange(value)
    )
      return label;
  }
  if (
    value.from &&
    !(value.from instanceof Date) &&
    !value.to &&
    value.from.offset.length === 0
  ) {
    switch (value.from.anchor) {
      case 'RELATIVE_ANCHOR_START_OF_WEEK':
        return 'Week to date';
      case 'RELATIVE_ANCHOR_START_OF_MONTH':
        return 'Month to date';
      case 'RELATIVE_ANCHOR_START_OF_YEAR':
        return 'Year to date';
    }
  }
  if (
    value.from &&
    !(value.from instanceof Date) &&
    !value.to &&
    value.from.anchor === 'RELATIVE_ANCHOR_NOW' &&
    value.from.offset.length === 1
  ) {
    const offset = value.from.offset[0]!;
    if (offset.amount < 0)
      return `Past ${-offset.amount} ${offset.unit.toLowerCase()}${offset.amount === -1 ? '' : 's'}`;
  }
  if (value.from instanceof Date) {
    return value.to instanceof Date
      ? dateTimeRangeLabel(value, options)
      : !value.to
        ? `Since ${formatDateTime(value.from, { ...options, timeZone: 'UTC' })}`
        : formatDateTimeRange(value);
  }
  return formatDateTimeRange(value);
}

/** A datetime picker with presets, natural-language input, and a calendar.
 * Presets apply immediately; Enter or calendar Apply commits edits; dismissal discards them.
 * Unmodified arrows navigate presets or edit date segments. Escape returns from the
 * calendar to presets or closes the picker. Calendar days end at exclusive next UTC midnight.
 */
export function DateTimeRangePicker(props: DateTimeRangePickerProps) {
  return <RangePicker {...props} />;
}

export function RangePicker({
  value,
  onChange,
  liveOption,
  comparison,
  className,
  placeholder = 'Select date range…',
  label = 'Date range',
  labelPlacement = 'inline',
  maxRangeDays,
  contract,
  presets: configuredPresets,
  disabled,
  calendarAdapter,
}: DateTimeRangePickerProps & { calendarAdapter?: CalendarPickerAdapter }) {
  const id = useId();
  const dateFormatting = useDateFormatting();
  const trigger = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<{ value: string; start: number; end: number } | null>(
    null
  );
  const helpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const [state, dispatch] = useReducer(
    dateTimeRangePickerReducer,
    initialPickerState
  );
  const {
    open,
    mode,
    draft,
    edited,
    highlight,
    error,
    help,
    helpSide,
    calendar,
    complete,
  } = state;
  const [selectionRevision, setSelectionRevision] = useState(0);
  useLayoutEffect(() => {
    if (selectionRevision) {
      input.current?.focus();
      input.current?.select();
    }
  }, [selectionRevision]);
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: Event) {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        trigger.current?.contains(target) ||
        popup.current?.contains(target)
      )
        return;
      // Calendar month/year selects render their own nested overlay in a portal.
      if (mode === 'calendar' && target.closest('.altertable-popover-surface'))
        return;
      dispatch({ type: 'close' });
      pending.current = null;
    }
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('focusin', dismissOutside, true);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('focusin', dismissOutside, true);
    };
  }, [open, mode]);

  useEffect(() => () => clearTimeout(helpTimer.current), []);
  function rangeError(range: DateTimeRange) {
    try {
      if (calendarAdapter) return calendarAdapter.validate(range);
      parseDateTimeRange(range, { maxRangeDays });
      contract?.datetime.parse(range);
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid date range.';
    }
  }

  const presets = [
    ...(liveOption
      ? [
          {
            shortcut: 'Live',
            label: 'Live',
            range: liveOption.dateTimeRange,
            live: true,
          },
        ]
      : []),
    ...(
      configuredPresets ??
      presetInputs.map(([shortcut, label]) => ({
        shortcut,
        label,
        range: shortcut,
      }))
    ).flatMap(preset => {
      if (typeof preset.range !== 'string')
        return [{ ...preset, range: preset.range, live: false }];
      const result = parseDateTimeRangeInput(preset.range);
      return result.ok ? [{ ...preset, range: result.range, live: false }] : [];
    }),
  ].filter(preset => !rangeError(preset.range));
  const calendarIndex = presets.length;
  const moreIndex = calendarIndex + 1;
  const comparisonIndex = moreIndex + 1;
  const lastIndex = comparison?.range ? comparisonIndex : moreIndex;
  const live = !!(
    value &&
    liveOption?.isLive &&
    serializeDateTimeRange(value) ===
      serializeDateTimeRange(liveOption.dateTimeRange)
  );
  const selected = calendarAdapter
    ? presets[calendarAdapter.selectedIndex]
    : presets.find(
        preset =>
          value &&
          preset.live === live &&
          serializeDateTimeRange(preset.range) === serializeDateTimeRange(value)
      );
  function selectInput() {
    setSelectionRevision(revision => revision + 1);
  }
  function openPresets() {
    pending.current = null;
    const bounds = trigger.current?.getBoundingClientRect();
    dispatch({
      type: 'open',
      draft:
        calendarAdapter?.inputLabel ??
        resolvedLabel(value, contract, dateFormatting),
      helpSide:
        bounds && bounds.left >= 280
          ? 'left'
          : bounds && window.innerWidth - bounds.right >= 280
            ? 'right'
            : 'inline',
    });
    selectInput();
  }
  function close(focus = false) {
    dispatch({ type: 'close' });
    pending.current = null;
    if (focus) input.current?.focus();
  }
  function commit(range: DateTimeRange, isLive = false) {
    const issue = rangeError(range);
    if (issue) {
      dispatch({ type: 'error', error: issue });
      return;
    }
    onChange(range, isLive);
    close(true);
  }
  function submit(text: string) {
    if (calendarAdapter) {
      const index = presets.findIndex(
        preset =>
          preset.label.toLowerCase() === text.trim().toLowerCase() ||
          preset.shortcut?.toLowerCase() === text.trim().toLowerCase()
      );
      if (index >= 0) {
        calendarAdapter.onPreset(index);
        close(true);
        return;
      }
    }
    const normalized = normalizeDateTimeRangeInput(
      text,
      dateFormatting.locale,
      !!calendarAdapter
    );
    // Calendar date endpoints are inclusive, including ISO dates and same-day pairs.
    const isoDates =
      calendarAdapter &&
      normalized
        .trim()
        .match(
          /^(\d{4}-\d{2}-\d{2})(?:\s+(?:to|–|-)\s+(\d{4}-\d{2}-\d{2}))?$/i
        );
    if (isoDates) {
      try {
        commit({
          from: parseDate(isoDates[1]!).toDate('UTC'),
          to: parseDate(isoDates[2] ?? isoDates[1]!)
            .add({ days: 1 })
            .toDate('UTC'),
        });
      } catch {
        dispatch({ type: 'error', error: 'Choose valid calendar dates.' });
      }
      return;
    }
    const result = parseDateTimeRangeInput(normalized);
    if (result.ok) {
      commit(result.range);
      return;
    }
    // Explicit bound expressions retain anchors on either side of the range.
    const bounds = normalized.split(/\s+(?:to|–)\s+/i);
    if (bounds.length === 2) {
      try {
        const from = parseDateTimeBound(bounds[0]!);
        const to = parseDateTimeBound(bounds[1]!);
        commit({ from, to });
        return;
      } catch {
        /* Show the same recoverable parse error as natural language. */
      }
    }
    dispatch({ type: 'error', error: "Couldn't parse that date range." });
  }
  function choose(index: number) {
    if (index === comparisonIndex && comparison?.range) {
      comparison.onChange(!comparison.enabled);
      close(true);
      return;
    }
    const preset = presets[index];
    if (preset) {
      if (calendarAdapter) {
        calendarAdapter.onPreset(index);
        close(true);
      } else commit(preset.range, preset.live);
      return;
    }
    if (index === calendarIndex) {
      let nextCalendar: DateTimeRange | null = null;
      try {
        if (value) {
          const resolved = contract
            ? contract.datetime.resolve(value)
            : resolveDateTimeRange(value);
          const from = resolved.from ? new Date(resolved.from) : null;
          const to = new Date(resolved.to.getTime() - 1);
          from?.setUTCHours(0, 0, 0, 0);
          to.setUTCHours(24, 0, 0, 0);
          nextCalendar = from ? { from, to } : null;
        }
      } catch {
        nextCalendar = null;
      }
      dispatch({ type: 'calendar', value: nextCalendar });
    } else {
      dispatch({ type: 'update', value: { highlight: moreIndex, help: true } });
      selectInput();
    }
  }
  function back() {
    dispatch({
      type: 'update',
      value: { mode: 'presets', highlight: calendarIndex },
    });
    selectInput();
  }
  function highlightOption(index: number) {
    dispatch({ type: 'update', value: { highlight: index } });
    clearTimeout(helpTimer.current);
    if (index === moreIndex)
      dispatch({ type: 'update', value: { help: true } });
    else
      helpTimer.current = setTimeout(
        () => dispatch({ type: 'update', value: { help: false } }),
        300
      );
    requestAnimationFrame(() =>
      document
        .getElementById(`${id}-option-${index}`)
        ?.scrollIntoView({ block: 'nearest' })
    );
  }
  function navigateOption(index: number) {
    highlightOption(index);
    if (index === comparisonIndex) {
      popup.current
        ?.querySelector<HTMLButtonElement>('button[role="checkbox"]')
        ?.focus();
    } else {
      input.current?.focus();
      input.current?.select();
    }
  }
  return (
    <PickerField label={label} labelPlacement={labelPlacement}>
      {/* The input owns keyboard activation; the surrounding padding shares its click target. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={trigger}
        className={classNames('altertable-datetime-input', className)}
        data-disabled={disabled || undefined}
        data-atbl-focus="group"
        data-atbl-internal-surface="field"
        onClick={() => {
          if (!disabled && !open) openPresets();
        }}
      >
        <span
          className="altertable-datetime-shortcut"
          aria-hidden="true"
          data-word={
            /^(today|yesterday)$/i.test(selected?.shortcut ?? '') || undefined
          }
        >
          <span>{selected?.shortcut ?? '–'}</span>
        </span>
        <input
          {...calendarAdapter?.inputProps}
          ref={input}
          onPointerDown={() => {
            pending.current = null;
          }}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? `${id}-popup` : undefined}
          aria-haspopup={mode === 'calendar' ? 'dialog' : 'listbox'}
          aria-autocomplete={mode === 'presets' ? 'list' : 'none'}
          aria-activedescendant={
            open &&
            mode !== 'calendar' &&
            highlight >= 0 &&
            highlight !== comparisonIndex
              ? `${id}-option-${highlight}`
              : undefined
          }
          aria-invalid={
            !!error || calendarAdapter?.inputProps?.['aria-invalid']
          }
          aria-describedby={
            error
              ? `${id}-error`
              : calendarAdapter?.inputProps?.['aria-describedby']
          }
          disabled={disabled}
          readOnly={!open}
          placeholder={placeholder}
          value={
            open
              ? draft
              : live
                ? 'Live'
                : `${selected?.label ?? calendarAdapter?.label ?? summaryLabel(value, dateFormatting)}${comparison?.enabled ? ' · vs previous' : ''}`
          }
          onFocus={event => {
            dispatch({ type: 'update', value: { error: '' } });
            calendarAdapter?.inputProps?.onFocus?.(event);
          }}
          onChange={event => {
            pending.current = null;
            dispatch({ type: 'edit', draft: event.target.value });
          }}
          onKeyDown={event => {
            if (
              event.key.startsWith('Arrow') &&
              (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
            ) {
              pending.current = null;
              return;
            }
            if (!open) {
              if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                openPresets();
              }
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (mode === 'calendar') back();
              else close(true);
              return;
            }
            if (event.key === 'Tab') {
              const checkbox = popup.current?.querySelector<HTMLButtonElement>(
                'button[role="checkbox"]:not(:disabled)'
              );
              if (!event.shiftKey && comparison && checkbox) {
                event.preventDefault();
                checkbox.focus();
                return;
              }
              close();
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (mode === 'presets' && highlight >= 0 && !edited)
                choose(highlight);
              else if (mode === 'calendar') {
                if (complete && calendar) commit(calendar);
              } else {
                submit(pending.current?.value ?? event.currentTarget.value);
                pending.current = null;
              }
              return;
            }
            const current = pending.current ?? {
              value: event.currentTarget.value,
              start: event.currentTarget.selectionStart ?? 0,
              end: event.currentTarget.selectionEnd ?? 0,
            };
            const args = {
              value: current.value,
              locale: dateFormatting.locale,
              dateOnly: !!calendarAdapter,
              selectionStart: current.start,
              selectionEnd: current.end,
              direction: (event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                ? -1
                : 1) as -1 | 1,
            };
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              dispatch({ type: 'update', value: { mode: 'editing' } });
              dispatch({ type: 'update', value: { highlight: -1 } });
              const selection = getDateTimeRangeInputSegmentSelection(args);
              if (selection) {
                event.preventDefault();
                pending.current = { value: current.value, ...selection };
                input.current?.setSelectionRange(
                  selection.start,
                  selection.end
                );
              }
            }
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const edit = editDateTimeRangeInputSegment(args);
              if (edit) {
                event.preventDefault();
                pending.current = edit;
                dispatch({ type: 'edit', draft: edit.value });
                requestAnimationFrame(() => {
                  const next = pending.current;
                  if (next)
                    input.current?.setSelectionRange(next.start, next.end);
                });
              } else if (mode === 'presets') {
                event.preventDefault();
                navigateOption(
                  highlight < 0
                    ? event.key === 'ArrowDown'
                      ? 0
                      : lastIndex
                    : (highlight +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        lastIndex +
                        1) %
                        (lastIndex + 1)
                );
              }
            }
            if (
              mode === 'presets' &&
              (event.key === 'Home' || event.key === 'End')
            ) {
              event.preventDefault();
              navigateOption(event.key === 'Home' ? 0 : lastIndex);
            }
          }}
        />
        {calendarAdapter?.reset}
        <AppIcon name="disclosure" size={14} />
      </div>
      <PopoverSurface
        triggerRef={trigger}
        isOpen={open}
        onOpenChange={next => {
          if (!next) close();
        }}
        isNonModal
        placement="bottom start"
        shouldCloseOnInteractOutside={element =>
          !trigger.current?.contains(element)
        }
        className="altertable-datetime-popover"
      >
        <div
          ref={popup}
          onKeyDownCapture={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              if (mode === 'calendar') back();
              else close(true);
            }
            if (
              event.key === 'Tab' &&
              event.shiftKey &&
              event.target instanceof HTMLButtonElement &&
              event.target.getAttribute('role') === 'checkbox'
            ) {
              event.preventDefault();
              input.current?.focus();
            }
          }}
        >
          {mode === 'calendar' ? (
            <div
              id={`${id}-popup`}
              role="dialog"
              aria-label={`${label} calendar`}
              className="altertable-datetime-calendar-panel"
            >
              <DateTimeRangeCalendar
                value={value}
                maxRangeDays={
                  contract
                    ? Math.min(
                        maxRangeDays ?? Infinity,
                        contract.bounds().maxRangeDays
                      )
                    : maxRangeDays
                }
                contract={contract}
                bounds={calendarAdapter}
                onChange={calendar =>
                  dispatch({ type: 'update', value: { calendar } })
                }
                onCompleteChange={complete =>
                  dispatch({ type: 'update', value: { complete } })
                }
              />
              {calendarAdapter?.footer}
              <footer className="altertable-datetime-actions">
                <Button onClick={back}>‹ Presets</Button>
                <Button
                  variant="primary"
                  disabled={!complete || !calendar || !!rangeError(calendar)}
                  onClick={() => {
                    if (calendar) commit(calendar);
                  }}
                >
                  Apply
                </Button>
              </footer>
            </div>
          ) : (
            <>
              <div
                id={`${id}-popup`}
                role="listbox"
                aria-label="Date range presets"
                className="altertable-datetime-presets"
              >
                {[
                  ...presets.map(preset => preset.label),
                  'Select from calendar…',
                  'More',
                ].map((text, index) => {
                  const preset = presets[index];
                  return (
                    <button
                      data-atbl-focus="inset"
                      data-atbl-control="action"
                      type="button"
                      role="option"
                      tabIndex={-1}
                      id={`${id}-option-${index}`}
                      key={index}
                      aria-selected={!!preset && preset === selected}
                      data-highlighted={highlight === index || undefined}
                      data-divider={
                        index === calendarIndex ||
                        preset?.shortcut === 'today' ||
                        (index === 1 && !!liveOption) ||
                        undefined
                      }
                      onMouseDown={event => event.preventDefault()}
                      onMouseMove={() => {
                        dispatch({
                          type: 'update',
                          value: { mode: 'presets' },
                        });
                        highlightOption(index);
                      }}
                      onClick={() => choose(index)}
                    >
                      <span
                        className="altertable-datetime-shortcut"
                        aria-hidden="true"
                        data-word={
                          (preset &&
                            /^(today|yesterday)$/i.test(
                              preset.shortcut ?? ''
                            )) ||
                          undefined
                        }
                      >
                        {preset ? (
                          <span>{preset.shortcut}</span>
                        ) : (
                          <AppIcon
                            name={
                              index === calendarIndex
                                ? 'calendar'
                                : 'moreActions'
                            }
                            size={14}
                          />
                        )}
                      </span>
                      <span>{text}</span>
                      <span
                        className="altertable-datetime-check"
                        aria-hidden="true"
                      >
                        {preset && preset === selected ? (
                          <AppIcon name="check" size={14} />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              {error && (
                <p
                  role="alert"
                  id={`${id}-error`}
                  className="altertable-datetime-error"
                >
                  {error}
                </p>
              )}
              {/* Pointer retention lets users cross the gap to the keyboard-accessible example buttons. */}
              {(help || !!error) && (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Hover retains the help panel while crossing the popup gap.
                <aside
                  aria-label="Date range syntax help"
                  className="altertable-datetime-help"
                  data-side={helpSide}
                  onMouseEnter={() => clearTimeout(helpTimer.current)}
                  onMouseLeave={() => {
                    if (!error && highlight !== moreIndex)
                      helpTimer.current = setTimeout(
                        () =>
                          dispatch({ type: 'update', value: { help: false } }),
                        300
                      );
                  }}
                >
                  <strong>Date range syntax</strong>
                  {Object.entries(examples).map(([group, items]) => (
                    <section key={group}>
                      <h4>{group}</h4>
                      <div>
                        {items
                          .filter(example => {
                            const parsed = parseDateTimeRangeInput(example);
                            return parsed.ok && !rangeError(parsed.range);
                          })
                          .map(example => (
                            <button
                              data-atbl-focus="inset"
                              data-atbl-control="action"
                              type="button"
                              key={example}
                              onMouseDown={event => event.preventDefault()}
                              onClick={() => submit(example)}
                            >
                              {example}
                            </button>
                          ))}
                      </div>
                    </section>
                  ))}
                </aside>
              )}
            </>
          )}
          {comparison && mode !== 'calendar' && (
            <div className="altertable-datetime-presets">
              <button
                type="button"
                data-atbl-focus="inset"
                data-atbl-control="action"
                role="checkbox"
                id={`${id}-option-${comparisonIndex}`}
                data-highlighted={highlight === comparisonIndex || undefined}
                onMouseMove={() => {
                  dispatch({ type: 'update', value: { mode: 'presets' } });
                  highlightOption(comparisonIndex);
                }}
                onFocus={() => highlightOption(comparisonIndex)}
                onKeyDown={event => {
                  if (
                    ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
                  ) {
                    event.preventDefault();
                    navigateOption(
                      event.key === 'ArrowUp'
                        ? moreIndex
                        : event.key === 'End'
                          ? comparisonIndex
                          : 0
                    );
                  }
                }}
                aria-checked={comparison.enabled}
                aria-label="Compare with previous period"
                aria-describedby={`${id}-comparison-description`}
                disabled={!comparison.range}
                data-divider
                onClick={() => {
                  comparison.onChange(!comparison.enabled);
                  close(true);
                }}
              >
                <span
                  className="altertable-datetime-shortcut"
                  aria-hidden="true"
                >
                  vs
                </span>
                <span>
                  Compare with previous period
                  <small id={`${id}-comparison-description`}>
                    {comparison.range
                      ? (calendarAdapter?.comparisonLabel ??
                        dateTimeRangeLabel(comparison.range, dateFormatting))
                      : 'Outside available source coverage'}
                  </small>
                </span>
                <span className="altertable-datetime-check" aria-hidden="true">
                  {comparison.enabled ? (
                    <AppIcon name="check" size={14} />
                  ) : null}
                </span>
              </button>
            </div>
          )}
        </div>
      </PopoverSurface>
    </PickerField>
  );
}
