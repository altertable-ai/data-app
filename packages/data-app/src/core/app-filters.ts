import type { DateRangeContract, DateRangeRequest } from './contract.ts';
import {
  availableDatePresets,
  type DatePresetId,
  type DateRange,
} from './date-range.ts';
import type {
  DateTimeRangeFilter,
  DateTimeRangeComparisonFilter,
} from './date-time-filter.ts';
import type { SourceDimensionFilter } from './dimension-source.ts';
import type {
  DimensionSelection,
  DimensionFilter,
  DimensionSelectionFilter,
} from './dimension.ts';
import type { FacetFilter } from './facets.ts';
import type { NumberFilter, BooleanFilter } from './filters.ts';
import { invariant } from './invariant.ts';
import type { HistoryMode } from './navigation.ts';
import type { IsUnion } from './queries.ts';
export type { HistoryMode } from './navigation.ts';

/** Where a filter's or display option's control renders. */
export type FilterPresentation = {
  /** Widget controls render beside their visualization instead of in the toolbar.
   * Scope filters remain available in the Filters sheet and active summaries. */
  control?: 'toolbar' | 'widget';
  /** Secondary scope controls live in the Filters sheet with compact pickers when active; secondary display options follow primary options. Defaults to primary. */
  prominence?: 'primary' | 'secondary';
};

/** An app-owned value with one URL representation. Controls never parse or write routes. */
export type AppFilter<Value, Kind extends string = string> = {
  kind: Kind;
  label?: string;
  /** Display options (`displayChoice()`) change how results are shown, not which data is included. */
  presentation?: FilterPresentation & { group?: 'scope' | 'display' };
  urlKeys: readonly string[];
  defaultValue: Value;
  /** Unrestricted value, when this filter can be cleared. */
  clearValue?: Value;
  describe?: (value: Value) => string;
  history: HistoryMode;
  read: (params: URLSearchParams) => Value;
  write: (value: Value) => Record<string, string | null>;
  valid: (value: Value) => boolean;
  same: (left: Value, right: Value) => boolean;
};

export type FilterCollection = Record<
  string,
  | SearchFilter
  | ChoiceFilter<any>
  | MultiChoiceFilter
  | DateRangeFilter
  | DateTimeRangeFilter
  | DateTimeRangeComparisonFilter
  | DimensionFilter<any>
  | FacetFilter<any, string>
  | SourceDimensionFilter<any>
  | NumberFilter
  | BooleanFilter
>;
export type FilterValues<Collection> = {
  [Key in keyof Collection]: Collection[Key] extends DimensionSelectionFilter<
    infer Value
  >
    ? DimensionSelection<Value>
    : Collection[Key] extends AppFilter<infer Value, string>
      ? Value
      : never;
};

/** Keep conditional declarations narrowed so every dependency has one contract. */
export type CheckedFilterDeclarations<Collection extends FilterCollection> =
  true extends IsUnion<Collection>
    ? never
    : string extends keyof Collection
      ? Collection
      : '__proto__' extends keyof Collection
        ? never
        : {
            [Name in keyof Collection]: true extends IsUnion<Collection[Name]>
              ? never
              : Collection[Name];
          };

/** Name filters once in the app. URL keys must be unique across its controls. */
export function defineAppFilters<const Collection extends FilterCollection>(
  filters: Collection
): Collection {
  const owners = new Map<string, string>();
  for (const [name, variable] of Object.entries(filters)) {
    const presentation = variable.presentation;
    invariant(
      presentation === undefined ||
        (presentation !== null &&
          typeof presentation === 'object' &&
          !Array.isArray(presentation) &&
          (presentation.control === undefined ||
            presentation.control === 'toolbar' ||
            presentation.control === 'widget') &&
          (presentation.group === undefined ||
            presentation.group === 'scope' ||
            presentation.group === 'display') &&
          (presentation.prominence === undefined ||
            presentation.prominence === 'primary' ||
            presentation.prominence === 'secondary')),
      `Filter ${name} has invalid presentation.`
    );
    for (const key of variable.urlKeys) {
      invariant(
        !['view', 'about', 'tab', 'present', 'step', 'details'].includes(key),
        `Filter ${name} uses reserved URL key: ${key}.`
      );
      invariant(
        !!key && !owners.has(key),
        `Filter ${name} has an empty or duplicate URL key: ${key}.`
      );
      owners.set(key, name);
    }
  }

  return filters;
}

type ScalarFilterOptions = {
  label?: string;
  key: string;
  defaultValue?: string;
  history?: HistoryMode;
  presentation?: FilterPresentation;
};

export type SearchFilter = AppFilter<string, 'search'>;
export type ChoiceOption = { id: string; label: string; description?: string };
export type ChoiceFilter<Value extends string = string> = AppFilter<
  Value,
  'choice'
> & {
  options: readonly ChoiceOption[];
};
export type MultiChoiceFilter = AppFilter<readonly string[], 'multiChoice'> & {
  options: readonly ChoiceOption[];
  maxSelected: number;
};

/** Search query state; typing replaces history by default. Operations reject text
 * longer than `maxLength` (200 by default). */
export function searchFilter({
  key,
  label,
  defaultValue = '',
  history = 'replace',
  maxLength = 200,
}: Omit<ScalarFilterOptions, 'presentation'> & {
  maxLength?: number;
}): SearchFilter {
  invariant(
    Number.isSafeInteger(maxLength) && maxLength > 0,
    `Search ${key} needs a positive maxLength.`
  );
  function valid(value: string) {
    return typeof value === 'string' && value.length <= maxLength;
  }
  invariant(valid(defaultValue), `Search ${key} default exceeds maxLength.`);
  return {
    kind: 'search',
    label: label ?? key,
    urlKeys: [key],
    defaultValue,
    clearValue: '',
    describe: value => value,
    history,
    read(params) {
      const value = params.get(key);
      return value !== null && valid(value) ? value : defaultValue;
    },
    write(value) {
      return { [key]: value === defaultValue ? null : value };
    },
    valid,
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

type ChoiceOptions<Options extends readonly ChoiceOption[]> = Omit<
  ScalarFilterOptions,
  'defaultValue'
> & {
  defaultValue: NoInfer<Options[number]['id']>;
  options: Options & (Options extends readonly [] ? never : unknown);
};

/** One choice that narrows the included data. */
export function choiceFilter<const Options extends readonly ChoiceOption[]>(
  options: ChoiceOptions<Options>
): ChoiceFilter<Options[number]['id']> {
  return createChoice<Options[number]['id']>(options);
}

/** One choice that changes how results are shown, such as a chart breakdown or sort order.
 * Clearing filters keeps it; pass `view.breakdown(name)` to render it beside its chart. */
export function displayChoice<const Options extends readonly ChoiceOption[]>(
  options: ChoiceOptions<Options>
): ChoiceFilter<Options[number]['id']> & {
  presentation: { group: 'display' };
} {
  const presentation = { ...options.presentation, group: 'display' as const };
  return { ...createChoice<Options[number]['id']>(options), presentation };
}

function createChoice<Id extends string>({
  key,
  label,
  defaultValue,
  options,
  history = 'push',
  presentation,
}: ScalarFilterOptions & {
  defaultValue: Id;
  options: readonly ChoiceOption[];
}): ChoiceFilter<Id> {
  validateChoiceOptions(options);
  function valid(value: string): value is Id {
    return (
      typeof value === 'string' && options.some(option => option.id === value)
    );
  }
  invariant(
    valid(defaultValue),
    `Choice ${key} must include its default value.`
  );
  return {
    kind: 'choice',
    presentation,
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

export function multiChoiceFilter<
  const Options extends readonly ChoiceOption[],
>({
  key,
  label,
  defaultValue = [],
  options,
  maxSelected = options.length,
  history = 'push',
  presentation,
}: Omit<ScalarFilterOptions, 'defaultValue'> & {
  defaultValue?: readonly NoInfer<Options[number]['id']>[];
  options: Options & (Options extends readonly [] ? never : unknown);
  maxSelected?: number;
}): MultiChoiceFilter {
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
    presentation,
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

export type DateRangeFilterOptions = {
  label?: string;
  /** URL key for a relative preset; explicit dates use start/end for period, otherwise key-prefixed fields. */
  key: string;
  defaultValue: DateRangeSelection & { comparison?: never };
  contract: DateRangeContract;
  history?: HistoryMode;
  /** Opt into a URL-backed comparison with the preceding equal-length range. */
  comparison?: boolean;
  presentation?: FilterPresentation;
};

export type DateRangeFilter = AppFilter<DateRangeSelection, 'dateRange'> & {
  kind: 'dateRange';
  supportsComparison: boolean;
  input: (selection: DateRangeSelection) => DateRangeRequest;
  /** Validate an untrusted request against the same source policy. */
  parseInput: (value: unknown) => DateRangeRequest;
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

/** A date filter keeps relative presets relative and validates exact dates against source coverage. */
export function dateRangeFilter({
  key,
  label = 'Date range',
  defaultValue,
  contract,
  history = 'push',
  comparison = false,
  presentation,
}: DateRangeFilterOptions): DateRangeFilter {
  const startKey = key === 'period' ? 'start' : [key, 'start'].join('-');
  const endKey = key === 'period' ? 'end' : [key, 'end'].join('-');
  const comparisonKey =
    key === 'period' ? 'compare' : [key, 'compare'].join('-');
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
    invariant(false, `Date filter ${key} is outside its available data range.`);
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
  const variable: DateRangeFilter = {
    kind: 'dateRange',
    presentation,
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
    parseInput(value) {
      const request = contract.parseRequest(value);
      invariant(
        comparison || request.comparison === null,
        `Date filter ${key} does not support comparison.`
      );
      return request;
    },
    describeInput(input) {
      return contract.describeInput(input.range);
    },
    urlKeys: comparison
      ? [key, startKey, endKey, comparisonKey]
      : [key, startKey, endKey],
    defaultValue,
    clearValue: defaultValue,
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
    `Date filter ${key} has a default outside its available data range.`
  );

  return variable;
}
