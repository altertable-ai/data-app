import type { DateRangeContract } from '../authoring/contract.ts';
import type { DateTimeRangeRequest } from './date-time-range-contract.ts';
import { parseDateTimeRangeInput } from './date-time-range-parser.ts';
import {
  parseDateTimeRange,
  serializeDateTimeRange,
  formatDateTimeRange,
} from './date-time-range-value.ts';
import type { DateTimeRange } from './date-time-range.ts';
import { invariant } from './invariant.ts';
import type {
  AppVariable,
  VariablePresentation,
  HistoryMode,
} from './variables.ts';

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

export type DateTimeRangeVariableOptions = {
  key: string;
  label?: string;
  /** Enable the previous-period reporting workflow. Requires a shared contract. */
  allowComparison?: false;
  /** Relative defaults such as "7d" stay relative. */
  defaultValue: DateTimeRange | string;
  /** Client limit for determinate durations; the backend must validate timezone-dependent ranges. */
  maxRangeDays?: number;
  /** Shared reporting coverage, timezone, duration limits, and comparison policy. */
  contract?: DateRangeContract;
  /** Suggestions in display order. Omit for defaults; [] retains calendar and text entry.
   * Invalid or over-limit suggestions are omitted; typed input is not restricted to the menu.
   */
  presets?: readonly DateTimeRangePreset[];
  history?: HistoryMode;
  presentation?: VariablePresentation;
};
export type DateTimeRangeVariable = AppVariable<
  DateTimeRange,
  'dateTimeRange'
> & {
  parse: (value: unknown) => DateTimeRange;
  maxRangeDays?: number;
  /** Shared reporting coverage, timezone, duration limits, and comparison policy. */
  contract?: DateRangeContract;
  presets?: readonly DateTimeRangePreset[];
};

export type DateTimeRangeComparisonSelection = {
  range: DateTimeRange;
  comparison?: 'previous';
};

/** An execution snapshot with the relative selection retained for URL and displayed-scope matching. */
export type DateTimeRangeComparisonRequest = DateTimeRangeRequest & {
  selection: DateTimeRangeComparisonSelection;
  reference: string;
};

export type DateTimeRangeComparisonVariableOptions = Omit<
  DateTimeRangeVariableOptions,
  'allowComparison' | 'contract'
> & {
  allowComparison: true;
  contract: DateRangeContract;
};

export type DateTimeRangeComparisonVariable = AppVariable<
  DateTimeRangeComparisonSelection,
  'dateTimeRangeComparison'
> & {
  contract: DateRangeContract;
  maxRangeDays?: number;
  presets?: readonly DateTimeRangePreset[];
  input: (
    selection: DateTimeRangeComparisonSelection,
    now?: Date
  ) => DateTimeRangeComparisonRequest;
  parseInput: (value: unknown) => DateTimeRangeComparisonRequest;
  previous: (
    selection: DateTimeRangeComparisonSelection
  ) => DateTimeRangeRequest['comparison'];
};

/** One declaration drives the picker, URL state, and operation input.
 * With comparison enabled, use input(defaultValue) for operation checks and variableInput()
 * to validate request snapshots. Query the resulting range and optional comparison bounds.
 */
export function dateTimeRangeVariable(
  options: DateTimeRangeComparisonVariableOptions
): DateTimeRangeComparisonVariable;
export function dateTimeRangeVariable(
  options: DateTimeRangeVariableOptions
): DateTimeRangeVariable;
export function dateTimeRangeVariable(
  options: DateTimeRangeVariableOptions | DateTimeRangeComparisonVariableOptions
): DateTimeRangeVariable | DateTimeRangeComparisonVariable {
  const base = createDateTimeRangeVariable(options);
  return options.allowComparison ? withComparison(base, options) : base;
}

/** One declaration drives the generated picker, URL state, and structured query parameter. */
function createDateTimeRangeVariable({
  key,
  label = 'Date range',
  defaultValue,
  maxRangeDays,
  contract,
  presets,
  history = 'push',
  presentation,
}:
  | DateTimeRangeVariableOptions
  | DateTimeRangeComparisonVariableOptions): DateTimeRangeVariable {
  invariant(
    maxRangeDays === undefined ||
      (Number.isFinite(maxRangeDays) && maxRangeDays > 0),
    'Maximum range days must be positive.'
  );
  function parse(value: unknown) {
    const range = parseDateTimeRange(value, { maxRangeDays });
    return contract ? contract.datetime.parse(range) : range;
  }
  const parsed =
    typeof defaultValue === 'string'
      ? parseDateTimeRangeInput(defaultValue)
      : null;
  invariant(!parsed || parsed.ok, 'Invalid default datetime range.');
  const initial = parse(parsed?.ok ? parsed.range : defaultValue);
  function valid(value: DateTimeRange) {
    try {
      parse(value);
      return true;
    } catch {
      return false;
    }
  }
  function same(left: DateTimeRange, right: DateTimeRange) {
    return serializeDateTimeRange(left) === serializeDateTimeRange(right);
  }
  return {
    kind: 'dateTimeRange',
    label,
    presentation,
    urlKeys: [key],
    defaultValue: initial,
    clearValue: initial,
    maxRangeDays: contract
      ? Math.min(maxRangeDays ?? Infinity, contract.bounds().maxRangeDays)
      : maxRangeDays,
    contract,
    presets,
    history,
    parse,
    valid,
    same,
    describe: formatDateTimeRange,
    read(params) {
      const text = params.get(key);
      if (!text || text.length > 8192) return parse(initial);
      try {
        return parse(JSON.parse(text));
      } catch {
        return parse(initial);
      }
    },
    write(value) {
      return {
        [key]: same(value, initial)
          ? null
          : serializeDateTimeRange(parse(value)),
      };
    },
  };
}

function withComparison(
  base: DateTimeRangeVariable,
  options: DateTimeRangeComparisonVariableOptions
): DateTimeRangeComparisonVariable {
  const contract = options.contract;
  const compareKey =
    options.key === 'period' ? 'compare' : `${options.key}-compare`;
  const initial = { range: base.defaultValue };
  function parseSelection(
    value: unknown,
    now = new Date()
  ): DateTimeRangeComparisonSelection {
    invariant(
      !!value && typeof value === 'object' && !Array.isArray(value),
      'Choose a datetime range.'
    );
    const selection = value as Record<string, unknown>;
    invariant(
      Object.keys(selection).every(
        key => key === 'range' || key === 'comparison'
      ) &&
        (selection.comparison === undefined ||
          selection.comparison === 'previous'),
      'Invalid comparison selection.'
    );
    const range = contract.datetime.parse(
      parseDateTimeRange(selection.range, { maxRangeDays: base.maxRangeDays }),
      now
    );
    invariant(
      !selection.comparison || contract.datetime.comparison(range, now),
      'Comparison is outside available source coverage.'
    );
    return {
      range,
      ...(selection.comparison ? { comparison: 'previous' as const } : {}),
    };
  }
  function input(
    value: DateTimeRangeComparisonSelection,
    now = new Date()
  ): DateTimeRangeComparisonRequest {
    const selection = parseSelection(value, now);
    return {
      ...contract.datetime.request(
        selection.range,
        selection.comparison === 'previous',
        now
      ),
      selection,
      reference: now.toISOString(),
    };
  }
  function same(
    left: DateTimeRangeComparisonSelection,
    right: DateTimeRangeComparisonSelection
  ) {
    return (
      left.comparison === right.comparison && base.same(left.range, right.range)
    );
  }
  function valid(value: DateTimeRangeComparisonSelection) {
    try {
      parseSelection(value);
      return true;
    } catch {
      return false;
    }
  }
  return {
    kind: 'dateTimeRangeComparison',
    label: base.label,
    presentation: base.presentation,
    history: base.history,
    urlKeys: [...base.urlKeys, compareKey],
    defaultValue: initial,
    clearValue: initial,
    contract,
    maxRangeDays: base.maxRangeDays,
    presets: base.presets,
    input,
    parseInput(value) {
      invariant(
        !!value && typeof value === 'object' && !Array.isArray(value),
        'Invalid datetime request.'
      );
      const request = value as Record<string, unknown>;
      invariant(
        Object.keys(request).every(key =>
          ['range', 'comparison', 'selection', 'reference'].includes(key)
        ) && typeof request.reference === 'string',
        'Invalid datetime request.'
      );
      const now = new Date(request.reference);
      invariant(
        Number.isFinite(now.getTime()) &&
          now.toISOString() === request.reference,
        'Invalid reference date.'
      );
      const expected = input(
        request.selection as DateTimeRangeComparisonSelection,
        now
      );
      // Validate current source coverage too; a supplied historical reference cannot bypass policy.
      base.parse(request.range);
      const actual = parseDateTimeRange(request.range);
      invariant(
        base.same(actual, expected.range),
        'The request must preserve the selected datetime range.'
      );
      invariant(
        request.comparison === null
          ? expected.comparison === null
          : !!expected.comparison &&
              base.same(
                parseDateTimeRange(request.comparison),
                expected.comparison
              ),
        'Comparison must be the preceding equal-length range.'
      );
      return expected;
    },
    previous(selection) {
      return contract.datetime.comparison(selection.range);
    },
    valid,
    same,
    describe: selection =>
      `${base.describe!(selection.range)}${selection.comparison ? ' vs previous period' : ''}`,
    read(params) {
      const range = base.read(params);
      const compared: DateTimeRangeComparisonSelection = {
        range,
        comparison: 'previous',
      };
      return params.get(compareKey) === 'previous' && valid(compared)
        ? compared
        : { range };
    },
    write(value) {
      const selection = parseSelection(value);
      return {
        ...base.write(selection.range),
        [compareKey]: selection.comparison ?? null,
      };
    },
  };
}
