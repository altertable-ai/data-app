import {
  formatDateTimeRange,
  type DateTimeRangeFilter,
  type DateTimeRangeInput,
} from '@altertable/data-app/contract';
import {
  dateFilterName,
  type AppFilter,
  type FilterCollection,
  type FilterInput,
} from '@altertable/data-app/internal';

import type { DataContext } from './ui/data-context.ts';
import { dateTimeRangeLabel } from './ui/date-time-range-label.ts';
import type { EmptyContent } from './ui/presentation.ts';

export type ViewDefinition<Name extends string, Input, Data> = {
  operation: Name;
  dataContext: DataContext;
  /** Describe the displayed scope in prose. Defaults to the reporting period and each
   * narrowed filter, such as `Mar 1–7, 2026 UTC · group Alpha`, or `all data`. */
  describeInput?: (input: Input) => string;
} & ViewEmptiness<Data>;

/** A view with everything derived from its operation's filters. */
export type ResolvedViewDefinition<
  Name extends string,
  Filters extends FilterCollection,
  Data,
> = Required<ViewEmptiness<Data>> & {
  operation: Name;
  dataContext: DataContext;
  filters: Filters;
  describeInput: (input: FilterInput<Filters>) => string;
  /** The operation's date filter, which sets the reporting period. */
  dateFilter?: keyof Filters & string;
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

/** Derive a view from its operation's filters. */
export function resolveViewDefinition<
  Name extends string,
  Filters extends FilterCollection,
  Data,
>(
  definition: ViewDefinition<Name, FilterInput<Filters>, Data>,
  filters: Filters
): ResolvedViewDefinition<Name, Filters, Data> {
  return {
    operation: definition.operation,
    dataContext: definition.dataContext,
    filters,
    dateFilter: dateFilterName(filters) as keyof Filters & string,
    describeInput: definition.describeInput ?? describeFilterInput(filters),
    ...resolveViewEmptiness(definition),
  };
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** The reporting period, then each scope filter narrowed from its unrestricted value. */
export function describeFilterInput<Filters extends FilterCollection>(
  filters: Filters
): (input: FilterInput<Filters>) => string {
  return input => {
    const parts: string[] = [];
    for (const [name, filter] of Object.entries(filters)) {
      const value = (input as Record<string, unknown>)[name];
      if (filter.kind === 'dateTimeRange')
        parts.unshift(describePeriod(filter, value as DateTimeRangeInput));
      else if (filter.presentation?.group !== 'display') {
        const scoped = filter as AppFilter<unknown>;
        if (
          scoped.clearValue !== undefined &&
          scoped.same(value, scoped.clearValue)
        )
          continue;
        parts.push(
          `${lowerFirst(filter.label ?? name)} ${scoped.describe?.(value) ?? String(value)}`
        );
      }
    }
    // Scope reads inside sentences such as "Showing group Beta…".
    return parts.join(' · ') || 'all data';
  };
}

/** The reporting period with its comparison, when the operation's date filter offers one. */
export function readViewPeriod<Filters extends FilterCollection>(
  definition: { filters: Filters; dateFilter?: keyof Filters & string },
  input: FilterInput<Filters>
): DateTimeRangeInput | undefined {
  const name = definition.dateFilter;
  const filter = name ? definition.filters[name] : undefined;
  if (filter?.kind !== 'dateTimeRange' || !filter.comparable) return undefined;
  return input[name!] as DateTimeRangeInput;
}

/** Complete days read as calendar dates in the reporting zone; other ranges keep their times. */
function describePeriod(
  filter: DateTimeRangeFilter,
  value: DateTimeRangeInput
) {
  const { range } = value;
  const completeDays =
    range.from.getTime() % 86_400_000 === 0 &&
    range.to.getTime() % 86_400_000 === 0;
  return completeDays
    ? `${dateTimeRangeLabel(range)} ${filter.policy.timeZone}`
    : formatDateTimeRange(range);
}
