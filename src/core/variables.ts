import {
  availableDatePresets,
  type DatePresetId,
  type DateRange,
} from '@/src/core/date-range';
import type { DateRangeContract, DateRangeRequest } from '@/src/core/contract';
import type {
  DimensionSelection,
  DimensionVariable,
} from '@/src/core/dimension';
import type { NumberFilter, BooleanFilter } from '@/src/core/filters';
import { invariant } from '@/src/core/invariant';

import type { HistoryMode } from '@/src/core/navigation';
export type { HistoryMode } from '@/src/core/navigation';

/** An app-owned value with one URL representation. Controls never parse or write routes. */
export type AppVariable<Value, Kind extends string = string> = {
  kind: Kind;
  label?: string;
  urlKeys: readonly string[];
  defaultValue: Value;
  /** Unrestricted value, when this variable represents a filter. */
  clearValue?: Value;
  describe?: (value: Value) => string;
  history: HistoryMode;
  read: (params: URLSearchParams) => Value;
  write: (value: Value) => Record<string, string | null>;
  valid: (value: Value) => boolean;
  same: (left: Value, right: Value) => boolean;
};

export type VariableCollection = Record<
  string,
  | SearchVariable
  | ChoiceVariable
  | MultiChoiceVariable
  | DateRangeVariable
  | DimensionVariable<any>
  | NumberFilter
  | BooleanFilter
>;
export type AppVariableValues<Variables> = {
  [Key in keyof Variables]: Variables[Key] extends DimensionVariable<
    infer Value
  >
    ? DimensionSelection<Value>
    : Variables[Key] extends AppVariable<infer Value, string>
      ? Value
      : never;
};

/** Name variables once in the app. URL keys must be unique across its controls. */
export function defineAppVariables<const Variables extends VariableCollection>(
  variables: Variables
): Variables {
  const owners = new Map<string, string>();
  for (const [name, variable] of Object.entries(variables)) {
    for (const key of variable.urlKeys) {
      invariant(
        !['view', 'about', 'tab', 'present', 'step'].includes(key),
        `Variable ${name} uses reserved URL key: ${key}.`
      );
      invariant(
        !!key && !owners.has(key),
        `Variable ${name} has an empty or duplicate URL key: ${key}.`
      );
      owners.set(key, name);
    }
  }

  return variables;
}

type ScalarVariableOptions = {
  label?: string;
  key: string;
  defaultValue?: string;
  history?: HistoryMode;
};

export type SearchVariable = AppVariable<string, 'search'>;
export type ChoiceOption = { id: string; label: string; description?: string };
export type ChoiceVariable = AppVariable<string, 'choice'> & {
  options: readonly ChoiceOption[];
};
export type MultiChoiceVariable = AppVariable<
  readonly string[],
  'multiChoice'
> & { options: readonly ChoiceOption[]; maxSelected: number };

/** Search query state; typing replaces history by default. */
export function searchVariable({
  key,
  label,
  defaultValue = '',
  history = 'replace',
}: ScalarVariableOptions): SearchVariable {
  return {
    kind: 'search',
    label: label ?? key,
    urlKeys: [key],
    defaultValue,
    clearValue: '',
    describe: value => value,
    history,
    read(params) {
      return params.get(key) ?? defaultValue;
    },
    write(value) {
      return { [key]: value === defaultValue ? null : value };
    },
    valid(value) {
      return typeof value === 'string';
    },
    same(left, right) {
      return left === right;
    },
  };
}

/** Validate labeled choices before controls or URL state consume them. */
export function validateChoiceOptions(options: readonly ChoiceOption[]) {
  invariant(
    options.length > 0 &&
      options.every(option => !!option.id.trim() && !!option.label.trim()) &&
      new Set(options.map(option => option.id)).size === options.length,
    'Choices require nonempty, unique IDs and labels.'
  );
}

export function choiceVariable({
  key,
  label,
  defaultValue,
  options,
  history = 'push',
}: ScalarVariableOptions & {
  defaultValue: string;
  options: readonly ChoiceOption[];
}): ChoiceVariable {
  validateChoiceOptions(options);
  function valid(value: string) {
    return (
      typeof value === 'string' && options.some(option => option.id === value)
    );
  }
  invariant(
    valid(defaultValue),
    `Choice variable ${key} must include its default value.`
  );
  return {
    kind: 'choice',
    label: label ?? key,
    options,
    urlKeys: [key],
    defaultValue,
    history,
    describe: value => options.find(option => option.id === value)!.label,
    read(params) {
      const value = params.get(key);
      return value !== null && valid(value) ? value : defaultValue;
    },
    write(value) {
      return { [key]: value === defaultValue ? null : value };
    },
    valid,
    same: (left, right) => left === right,
  };
}

export function multiChoiceVariable({
  key,
  label,
  defaultValue = [],
  options,
  maxSelected = options.length,
  history = 'push',
}: Omit<ScalarVariableOptions, 'defaultValue'> & {
  defaultValue?: readonly string[];
  options: readonly ChoiceOption[];
  maxSelected?: number;
}): MultiChoiceVariable {
  validateChoiceOptions(options);
  invariant(
    Number.isSafeInteger(maxSelected) &&
      maxSelected >= 1 &&
      maxSelected <= options.length,
    'Invalid choice selection limit.'
  );
  function valid(value: readonly string[]) {
    return (
      Array.isArray(value) &&
      value.length <= maxSelected &&
      new Set(value).size === value.length &&
      value.every(id => options.some(option => option.id === id))
    );
  }
  function same(left: readonly string[], right: readonly string[]) {
    return left.length === right.length && left.every(id => right.includes(id));
  }
  invariant(valid(defaultValue), `Invalid default choices for ${key}.`);
  return {
    kind: 'multiChoice',
    label: label ?? key,
    options,
    maxSelected,
    urlKeys: [key],
    defaultValue,
    history,
    describe: values =>
      values
        .map(id => options.find(option => option.id === id)!.label)
        .join(', ') || 'None',
    read(params) {
      const raw = params.get(key);
      if (raw === null || raw.length > 4096) return defaultValue;
      try {
        const values = JSON.parse(raw);
        return valid(values) ? values : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    write(value) {
      return {
        [key]: same(value, defaultValue)
          ? null
          : JSON.stringify(
              options
                .filter(option => value.includes(option.id))
                .map(option => option.id)
            ),
      };
    },
    valid,
    same,
  };
}

export type DateRangeSelection =
  | { kind: 'preset'; id: DatePresetId; comparison?: 'previous' }
  | { kind: 'dates'; start: string; end: string; comparison?: 'previous' };

export type DateRangeVariableOptions = {
  label?: string;
  /** URL key for a relative preset; explicit dates use start/end for period, otherwise key-prefixed fields. */
  key: string;
  defaultValue: DateRangeSelection & { comparison?: never };
  contract: DateRangeContract;
  history?: HistoryMode;
  /** Opt into a URL-backed comparison with the preceding equal-length range. */
  comparison?: boolean;
};

export type DateRangeVariable = AppVariable<DateRangeSelection, 'dateRange'> & {
  kind: 'dateRange';
  supportsComparison: boolean;
  input: (selection: DateRangeSelection) => DateRangeRequest;
  describeInput: (input: DateRangeRequest) => string;
  bounds: () => {
    minDate?: string;
    maxDate: string;
    maxRangeDays: number;
    timeZone: string;
  };
  resolve: (selection: DateRangeSelection) => DateRange;
  previous: (selection: DateRangeSelection) => DateRange | null;
  comparisonRange: (selection: DateRangeSelection) => DateRange | null;
};

const PRESET_IDS = new Set<DatePresetId>([
  'day',
  'last-3',
  'last-7',
  'last-14',
  'last-30',
  'last-90',
  'this-week',
  'previous-week',
  'this-month',
  'previous-month',
]);

/** A date variable keeps relative presets relative and validates exact dates against source coverage. */
export function dateRangeVariable({
  key,
  label = 'Date range',
  defaultValue,
  contract,
  history = 'push',
  comparison = false,
}: DateRangeVariableOptions): DateRangeVariable {
  const startKey = key === 'period' ? 'start' : `${key}-start`;
  const endKey = key === 'period' ? 'end' : `${key}-end`;
  const comparisonKey = key === 'period' ? 'compare' : `${key}-compare`;
  const bounds = contract.bounds;

  function resolve(selection: DateRangeSelection): DateRange {
    const limits = bounds();
    if (selection.kind === 'preset') {
      const preset = availableDatePresets(limits).find(
        item => item.id === selection.id
      );
      if (preset) return preset.range;
    } else {
      try {
        return contract.parse(selection);
      } catch {
        // Invalid URL values fall back to the app default.
      }
    }
    invariant(
      false,
      `Date variable ${key} is outside its available data range.`
    );
  }

  function same(left: DateRangeSelection, right: DateRangeSelection) {
    return (
      left.kind === right.kind &&
      left.comparison === right.comparison &&
      (left.kind === 'preset' && right.kind === 'preset'
        ? left.id === right.id
        : left.kind === 'dates' &&
          right.kind === 'dates' &&
          left.start === right.start &&
          left.end === right.end)
    );
  }
  const variable: DateRangeVariable = {
    kind: 'dateRange',
    label,
    describe: selection =>
      contract.describeInput(variable.input(selection).range),
    supportsComparison: comparison,
    input(selection) {
      return contract.request(
        resolve(selection),
        selection.comparison === 'previous' && comparison
      );
    },
    describeInput(input) {
      return contract.describeInput(input.range);
    },
    urlKeys: comparison
      ? [key, startKey, endKey, comparisonKey]
      : [key, startKey, endKey],
    defaultValue,
    history,
    bounds,
    resolve,
    previous(selection) {
      return comparison ? contract.comparison(resolve(selection)) : null;
    },
    comparisonRange(selection) {
      return selection.comparison === 'previous' && comparison
        ? contract.comparison(resolve(selection))
        : null;
    },
    same,
    valid(value) {
      try {
        const range = resolve(value);

        return (
          value.comparison === undefined ||
          (value.comparison === 'previous' &&
            comparison &&
            contract.comparison(range) !== null)
        );
      } catch {
        return false;
      }
    },
    read(params) {
      function withComparison(
        selection: DateRangeSelection
      ): DateRangeSelection {
        if (!comparison || params.get(comparisonKey) !== 'previous')
          return selection;
        const selected = { ...selection, comparison: 'previous' as const };

        return variable.valid(selected) ? selected : selection;
      }
      const presetId = params.get(key);
      if (presetId && PRESET_IDS.has(presetId as DatePresetId)) {
        const selection = {
          kind: 'preset',
          id: presetId as DatePresetId,
        } as const;
        if (variable.valid(selection)) return withComparison(selection);
      }
      const start = params.get(startKey);
      const end = params.get(endKey);
      if (start && end) {
        const selection = { kind: 'dates', start, end } as const;
        if (variable.valid(selection)) return withComparison(selection);
      }

      return withComparison(defaultValue);
    },
    write(value) {
      return {
        ...(same(value, defaultValue)
          ? { [key]: null, [startKey]: null, [endKey]: null }
          : value.kind === 'preset'
            ? { [key]: value.id, [startKey]: null, [endKey]: null }
            : { [key]: null, [startKey]: value.start, [endKey]: value.end }),
        ...(comparison ? { [comparisonKey]: value.comparison ?? null } : {}),
      };
    },
  };
  invariant(
    variable.valid(defaultValue),
    `Date variable ${key} has a default outside its available data range.`
  );

  return variable;
}
