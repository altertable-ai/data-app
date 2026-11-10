import type {
  AppFilter,
  FilterPresentation,
  HistoryMode,
} from './app-filters.ts';
import {
  createDateTimeRangePolicy,
  type DateTimeRangeInput,
  type DateTimeRangePolicy,
} from './date-time-range-contract.ts';
import { parseDateTimeRangeInput } from './date-time-range-parser.ts';
import {
  parseDateTimeRange,
  serializeDateTimeRange,
  formatDateTimeRange,
} from './date-time-range-value.ts';
import type { DateTimeRange } from './date-time-range.ts';
import { invariant } from './invariant.ts';

/** A picker suggestion. Text ranges use the same natural-language parser as typed input. */
export type DateTimeRangePreset = {
  /** Menu label, also shown when this preset matches the selected range. */
  label: string;
  range: DateTimeRange | string;
  /** Optional compact badge, for example "15m". */
  shortcut?: string;
};

/** Monitoring offers minute/hour windows; analytics offers longer periods and to-date windows. Spread either menu to add custom presets. */
export const dateTimeRangePresets: {
  readonly monitoring: readonly DateTimeRangePreset[];
  readonly analytics: readonly DateTimeRangePreset[];
} = {
  monitoring: [
    { label: 'Past 5 minutes', range: '5m', shortcut: '5m' },
    { label: 'Past 15 minutes', range: '15m', shortcut: '15m' },
    { label: 'Past hour', range: '1h', shortcut: '1h' },
    { label: 'Past 4 hours', range: '4h', shortcut: '4h' },
    { label: 'Past 24 hours', range: '1d', shortcut: '1d' },
  ],
  analytics: [
    { label: 'Past 7 days', range: '7d', shortcut: '7d' },
    { label: 'Past 30 days', range: '30d', shortcut: '30d' },
    { label: 'Past 90 days', range: '90d', shortcut: '90d' },
    { label: 'Month to date', range: 'MTD', shortcut: 'MTD' },
    { label: 'Year to date', range: 'YTD', shortcut: 'YTD' },
    { label: 'Past year', range: '1y', shortcut: '1y' },
  ],
};

/** Offer the previous-period comparison, with its toggle starting off or on. */
export type DateTimeRangeComparison = 'off' | 'on';

export type DateTimeRangeFilterOptions<
  Comparison extends DateTimeRangeComparison | undefined = undefined,
> = {
  key: string;
  label?: string;
  /** Range text such as "7d" stays relative; `{ from, to }` is absolute. */
  defaultValue: DateTimeRange | string;
  /** Reporting zone for relative ranges, calendar days, and labels. Defaults to UTC. */
  timeZone?: string;
  /** Longest selectable range. */
  maxRangeDays?: number;
  /** First date with data, as YYYY-MM-DD. */
  minDate?: string;
  /** Last date with data, as YYYY-MM-DD. */
  maxDate?: string | (() => string);
  /** End coverage yesterday, for sources that load whole days. */
  completeDays?: boolean;
  /** Offer the previous-period comparison. Omit for none. */
  comparison?: Comparison;
  /** Suggestions in display order. Omit for defaults; [] retains calendar and text entry.
   * Invalid or over-limit suggestions are omitted; typed input is not restricted to the menu.
   */
  presets?: readonly DateTimeRangePreset[];
  history?: HistoryMode;
  presentation?: FilterPresentation;
};

/** The picker's URL state: the selected range, relative or absolute, and the comparison toggle. */
export type DateTimeRangeSelection = {
  range: DateTimeRange;
  comparison?: 'previous';
};

/** Sent from the browser: the resolved input plus the selection and reference time it came from. */
export type DateTimeRangeRequest = DateTimeRangeInput & {
  selection: DateTimeRangeSelection;
  reference: string;
};

export type DateTimeRangeFilter<Comparable extends boolean = boolean> =
  AppFilter<DateTimeRangeSelection, 'dateTimeRange'> & {
    /** Whether readers can turn on the previous-period comparison. */
    comparable: Comparable;
    policy: DateTimeRangePolicy;
    maxRangeDays?: number;
    presets?: readonly DateTimeRangePreset[];
    /** Resolve a selection against one reference time. */
    request: (
      selection: DateTimeRangeSelection,
      now?: Date
    ) => DateTimeRangeRequest;
    /** Validate untrusted input against coverage and return what the operation receives. */
    parseInput: (value: unknown) => DateTimeRangeInput;
    previous: (
      selection: DateTimeRangeSelection
    ) => DateTimeRangeInput['comparison'];
  };

/** One declaration drives the picker, URL state, and the input of operations that list it.
 * Operations receive `{ range, comparison }`: `from` inclusive, `to` exclusive.
 */
export function dateTimeRangeFilter<
  Comparison extends DateTimeRangeComparison | undefined = undefined,
>(
  options: DateTimeRangeFilterOptions<Comparison>
): DateTimeRangeFilter<undefined extends Comparison ? false : true> {
  const {
    key,
    label = 'Date range',
    defaultValue,
    timeZone = 'UTC',
    maxRangeDays,
    minDate,
    maxDate,
    completeDays,
    comparison,
    presets,
    history = 'push',
    presentation,
  } = options;
  const policy = createDateTimeRangePolicy({
    minDate,
    maxDate,
    maxRangeDays,
    timeZone,
    completeDays,
  });
  const comparable = comparison !== undefined;
  const compareKey = key === 'period' ? 'compare' : `${key}-compare`;
  function parseRange(value: unknown, now?: Date) {
    return policy.parse(parseDateTimeRange(value, { maxRangeDays }), now);
  }
  const parsed =
    typeof defaultValue === 'string'
      ? parseDateTimeRangeInput(defaultValue)
      : null;
  invariant(!parsed || parsed.ok, `Invalid default range for ${key}.`);
  const initial: DateTimeRangeSelection = {
    range: parseRange(parsed?.ok ? parsed.range : defaultValue),
    ...(comparison === 'on' ? { comparison: 'previous' as const } : {}),
  };
  function sameRange(left: DateTimeRange, right: DateTimeRange) {
    return serializeDateTimeRange(left) === serializeDateTimeRange(right);
  }
  function parseSelection(
    value: unknown,
    now = new Date()
  ): DateTimeRangeSelection {
    invariant(
      !!value && typeof value === 'object' && !Array.isArray(value),
      'Choose a datetime range.'
    );
    const selection = value as Record<string, unknown>;
    invariant(
      Object.keys(selection).every(
        name => name === 'range' || name === 'comparison'
      ) &&
        (selection.comparison === undefined ||
          (comparable && selection.comparison === 'previous')),
      'Invalid comparison selection.'
    );
    const range = parseRange(selection.range, now);
    invariant(
      !selection.comparison || policy.comparison(range, now),
      'Comparison is outside available source coverage.'
    );
    return {
      range,
      ...(selection.comparison ? { comparison: 'previous' as const } : {}),
    };
  }
  function request(
    value: DateTimeRangeSelection,
    now = new Date()
  ): DateTimeRangeRequest {
    const selection = parseSelection(value, now);
    return {
      ...policy.request(
        selection.range,
        selection.comparison === 'previous',
        now
      ),
      selection,
      reference: now.toISOString(),
    };
  }
  function same(left: DateTimeRangeSelection, right: DateTimeRangeSelection) {
    return (
      left.comparison === right.comparison && sameRange(left.range, right.range)
    );
  }
  function valid(value: DateTimeRangeSelection) {
    try {
      parseSelection(value);
      return true;
    } catch {
      return false;
    }
  }
  invariant(
    valid(initial),
    `Date filter ${key} has a default outside its source coverage.`
  );
  /** The URL records the comparison only when it differs from the default. */
  function comparisonParam(selection: DateTimeRangeSelection) {
    if (!comparable) return {};
    const state = selection.comparison ?? 'off';
    return {
      [compareKey]: state === (initial.comparison ?? 'off') ? null : state,
    };
  }
  function readRange(params: URLSearchParams) {
    const text = params.get(key);
    if (!text || text.length > 8192) return initial.range;
    try {
      return parseRange(JSON.parse(text));
    } catch {
      return initial.range;
    }
  }
  return {
    kind: 'dateTimeRange',
    label,
    presentation,
    history,
    urlKeys: comparable ? [key, compareKey] : [key],
    defaultValue: initial,
    clearValue: initial,
    comparable: comparable as undefined extends Comparison ? false : true,
    policy,
    maxRangeDays,
    presets,
    request,
    parseInput(value) {
      invariant(
        !!value && typeof value === 'object' && !Array.isArray(value),
        'Invalid datetime request.'
      );
      const supplied = value as Record<string, unknown>;
      invariant(
        Object.keys(supplied).every(name =>
          ['range', 'comparison', 'selection', 'reference'].includes(name)
        ),
        'Invalid datetime request.'
      );
      // The server checks the range against current coverage; browser selection fields are ignored.
      const range = policy.endAtNow(policy.resolve(parseRange(supplied.range)));
      if (supplied.comparison === null || supplied.comparison === undefined)
        return { range, comparison: null };
      invariant(comparable, `${label} has no comparison.`);
      // The browser shifts by the selected length, which the server does not see:
      // accept an earlier window of equal length within coverage.
      const comparison = policy.resolve(
        parseDateTimeRange(supplied.comparison)
      );
      invariant(
        comparison.to <= range.from &&
          comparison.to.getTime() - comparison.from.getTime() ===
            range.to.getTime() - range.from.getTime(),
        'Comparison must be an earlier range of equal length.'
      );
      return { range, comparison };
    },
    previous(selection) {
      return comparable ? policy.comparison(selection.range) : null;
    },
    valid,
    same,
    describe: selection =>
      `${formatDateTimeRange(selection.range)}${selection.comparison ? ' vs previous period' : ''}`,
    read(params) {
      const range = readRange(params);
      if (!comparable) return { range };
      const state = params.get(compareKey);
      const compared: DateTimeRangeSelection = {
        range,
        comparison: 'previous',
      };
      const on =
        state === 'previous' || (state === null && !!initial.comparison);
      return on && valid(compared) ? compared : { range };
    },
    write(value) {
      const selection = parseSelection(value);
      return {
        [key]: sameRange(selection.range, initial.range)
          ? null
          : serializeDateTimeRange(selection.range),
        ...comparisonParam(selection),
      };
    },
  };
}
