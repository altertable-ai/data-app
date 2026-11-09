import {
  parseDateTimeRange,
  serializeDateTimeRange,
  formatDateTimeRange,
  type DateTimeRangeComparisonRequest,
  type DateTimeRangeComparisonFilter,
  type DateRangeRequest,
} from '@altertable/data-app/contract';
import type {
  AppFilter,
  FilterValues,
  DateRangeFilter,
  FilterCollection,
} from '@altertable/data-app/internal';
import { invariant } from '@altertable/data-app/internal';

import type { Filters } from './filter-set.ts';
import type { DataContext } from './ui/data-context.ts';
import type { EmptyContent } from './ui/presentation.ts';

type ResolvedFilter<Filter> = Filter extends DateTimeRangeComparisonFilter
  ? DateTimeRangeComparisonRequest
  : Filter extends DateRangeFilter
    ? DateRangeRequest
    : FilterValues<{ value: Filter }>['value'];
export type ResolvedFilters<Collection extends FilterCollection> = {
  [Key in keyof Collection]:
    | ResolvedFilter<Collection[Key]>
    | (string extends keyof Collection ? undefined : never);
};

type DateFilterKey<Collection extends FilterCollection> = {
  [Key in keyof Collection]: Collection[Key] extends
    | DateRangeFilter
    | DateTimeRangeComparisonFilter
    ? Key
    : never;
}[keyof Collection] &
  string;

/** Extract the selected range and comparison unchanged, including from nested inputs. */
export type ViewDate<Collection extends FilterCollection, Input> = {
  filter: DateFilterKey<Collection>;
  input: (input: Input) => DateRangeRequest | DateTimeRangeComparisonRequest;
};

/** Read filter values from a custom operation input; omitted keys use top-level fields. */
export type ViewBindings<Collection extends FilterCollection, Input> = Partial<{
  [Key in keyof Collection]: (input: Input) => ResolvedFilters<Collection>[Key];
}>;

type RequiredFilterBindingKeys<Collection extends FilterCollection, Input> = {
  [Key in keyof Collection]: Collection[Key]['kind'] extends
    | 'dateRange'
    | 'dateTimeRangeComparison'
    ? never
    : Collection[Key]['kind'] extends 'choice'
      ? [Input] extends [Record<Key, unknown>]
        ? ResolvedFilters<Collection>[Key] extends Input[Key]
          ? never
          : Key
        : Key
      : Extract<
            Collection[Key]['presentation'],
            { group: 'display' }
          > extends never
        ? [Input] extends [Record<Key, ResolvedFilters<Collection>[Key]>]
          ? [ResolvedFilters<Collection>[Key]] extends [Input[Key]]
            ? never
            : Key
          : Key
        : never;
}[keyof Collection];

/** Derive compatible top-level filter bindings; require readers for other input shapes. */
export type ViewBindingOptions<
  Collection extends FilterCollection,
  Input,
  AdditionalRequired extends keyof Collection = never,
> = [
  RequiredFilterBindingKeys<Collection, Input> | AdditionalRequired,
] extends [never]
  ? { bindings?: ViewBindings<Collection, Input> }
  : {
      bindings: ViewBindings<Collection, Input> & {
        [
          Key in
            | RequiredFilterBindingKeys<Collection, Input>
            | AdditionalRequired
        ]-?: (input: Input) => ResolvedFilters<Collection>[Key];
      };
    };

type SameViewInput<Collection extends FilterCollection, Input> = [
  ResolvedFilters<Collection>,
] extends [Input]
  ? [Input] extends [
      {
        [Key in keyof Collection]: Collection[Key]['kind'] extends 'choice'
          ? string
          : ResolvedFilters<Collection>[Key];
      },
    ]
    ? [Input] extends [Record<string, never>]
      ? true
      : [keyof Input] extends [keyof Collection]
        ? true
        : false
    : false
  : false;
type ViewInputMapping<Collection extends FilterCollection, Input> =
  SameViewInput<Collection, Input> extends true
    ? { input?: (values: ResolvedFilters<Collection>) => Input }
    : { input: (values: ResolvedFilters<Collection>) => Input };

export type DataViewDefinition<
  Name extends string,
  Collection extends FilterCollection,
  Input,
  Data,
> = {
  operation: Name;
  dataContext: DataContext;
  /** The app's `defineFilters()` result, or a `pick()` of the filters this view reads. */
  filters?: Filters<Collection>;
} & ViewEmptiness<Data> &
  ViewInputMapping<NoInfer<Collection>, Input> &
  ViewBindingOptions<NoInfer<Collection>, Input> &
  (
    | {
        date: ViewDate<Collection, Input>;
        describeInput?: (input: Input) => string;
      }
    | { date?: never; describeInput: (input: Input) => string }
  );

export type ResolvedDataViewDefinition<
  Name extends string,
  Collection extends FilterCollection,
  Input,
  Data,
> = Omit<
  DataViewDefinition<Name, Collection, Input, Data>,
  'filters' | 'input'
> &
  Required<ViewEmptiness<Data>> & {
    filters: Collection;
    /** The declaration the view reads, so `<DataApp>` can check it renders the controls. */
    filterSet?: Filters<Collection>;
    input: (values: ResolvedFilters<Collection>) => Input;
  };

/** Omit both for a result that is never empty, such as a total. */
export type ViewEmptiness<Data> = {
  /** App-owned semantics: measured zero need not mean an empty result. Defaults to never empty. */
  isEmpty?: (data: Data) => boolean;
  /** Inherited by DataSection unless it supplies its own copy. */
  emptyFallback?: EmptyContent;
};

/** Fill in the defaults for a view that omits its empty semantics. */
export function resolveViewEmptiness<Data>(
  definition: ViewEmptiness<Data>
): Required<ViewEmptiness<Data>> {
  return {
    isEmpty: definition.isEmpty ?? (() => false),
    emptyFallback: definition.emptyFallback ?? { title: 'No results' },
  };
}

export function describeViewInput<Input>(definition: {
  filters: FilterCollection;
  bindings?: Partial<Record<string, (input: Input) => unknown>>;
  date?: {
    filter: string;
    input: (input: Input) => DateRangeRequest | DateTimeRangeComparisonRequest;
  };
  describeInput?: (input: Input) => string;
}): (input: Input) => string {
  const date = definition.date;
  const variable = date && definition.filters[date.filter];
  invariant(
    !date ||
      variable?.kind === 'dateRange' ||
      variable?.kind === 'dateTimeRangeComparison',
    'The view date must reference a date range filter.'
  );
  if (definition.describeInput) return definition.describeInput;
  invariant(date && variable, 'A view needs a date binding or describeInput.');
  const dateBinding = date;

  function describeInput(input: Input) {
    const request = dateBinding.input(input);
    const period =
      variable?.kind === 'dateTimeRangeComparison'
        ? formatDateTimeRange(parseDateTimeRange(request.range))
        : (variable as DateRangeFilter).describeInput(
            request as DateRangeRequest
          );
    const summaries = Object.entries(definition.filters)
      .filter(([, variable]) =>
        ['dimension', 'numberFilter', 'booleanFilter'].includes(variable.kind)
      )
      .map(([key, filter]) => {
        const variable = filter as AppFilter<any>;
        const selected = readViewBinding(definition, key, input);

        return variable.valid(selected as never)
          ? `${variable.label}: ${variable.describe?.(selected as never)}`
          : null;
      })
      .filter(Boolean);

    return [period, ...summaries].join(' · ');
  }

  return describeInput;
}

export function resolveViewInput<Collection extends FilterCollection, Input>(
  definition: {
    input: (values: ResolvedFilters<Collection>) => Input;
    date?: ViewDate<Collection, Input>;
    filters: Collection;
    bindings?: ViewBindings<Collection, Input>;
  },
  values: ResolvedFilters<Collection>
): Input {
  const input = definition.input(values);
  if (definition.date) {
    const variable = definition.filters[definition.date.filter];
    if (variable?.kind === 'dateTimeRangeComparison') {
      const selected = values[
        definition.date.filter
      ] as DateTimeRangeComparisonRequest;
      const mapped = definition.date.input(
        input
      ) as DateTimeRangeComparisonRequest;
      invariant(
        mapped &&
          variable.same(selected.selection, mapped.selection) &&
          selected.reference === mapped.reference &&
          serializeDateTimeRange(selected.range) ===
            serializeDateTimeRange(mapped.range) &&
          (selected.comparison === null
            ? mapped.comparison === null
            : !!mapped.comparison &&
              serializeDateTimeRange(selected.comparison) ===
                serializeDateTimeRange(mapped.comparison)),
        'The operation input must preserve the selected datetime range and comparison.'
      );
    } else {
      const selected = values[definition.date.filter] as DateRangeRequest;
      const mapped = definition.date.input(input) as DateRangeRequest;
      invariant(
        mapped && mapped.range && 'comparison' in mapped,
        'The operation input must preserve the selected date range and comparison.'
      );

      function sameRange(
        a: DateRangeRequest['comparison'],
        b: DateRangeRequest['comparison']
      ) {
        return (
          a === b || (!!a && !!b && a.start === b.start && a.end === b.end)
        );
      }
      invariant(
        sameRange(selected.range, mapped.range) &&
          sameRange(selected.comparison, mapped.comparison),
        'The operation input must preserve the selected date range and comparison.'
      );
    }
  }

  for (const [key, variable] of Object.entries(definition.filters)) {
    if (
      variable.kind === 'dateRange' ||
      variable.kind === 'dateTimeRangeComparison' ||
      (variable.presentation?.group === 'display' && variable.kind !== 'choice')
    )
      continue;
    const filter = variable as AppFilter<any>;
    const selected = values[key] as never;
    const mapped = readViewBinding(definition, key, input);
    invariant(
      filter.valid(mapped as never) && filter.same(selected, mapped as never),
      `The operation input must preserve the ${key} filter selection.`
    );
  }

  return input;
}

function readViewBinding<Input>(
  definition: { bindings?: Partial<Record<string, (input: Input) => unknown>> },
  key: string,
  input: Input
): unknown {
  const read = definition.bindings?.[key];
  if (read) return read(input);

  return input && typeof input === 'object'
    ? (input as Record<string, unknown>)[key]
    : undefined;
}
