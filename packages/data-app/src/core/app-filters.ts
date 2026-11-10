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
  for (const [name, filter] of Object.entries(filters)) {
    const presentation = filter.presentation;
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
    for (const key of filter.urlKeys) {
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
