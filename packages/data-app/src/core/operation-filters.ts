import {
  defineAppFilters,
  type AppFilter,
  type FilterCollection,
  type FilterValues,
} from './app-filters.ts';
import type {
  DateTimeRangeComparisonFilter,
  DateTimeRangeComparisonRequest,
  DateTimeRangeComparisonSelection,
  DateTimeRangeFilter,
} from './date-time-filter.ts';
import { invariant } from './invariant.ts';
import type { IsUnion } from './queries.ts';

/** The value an operation receives for one filter: comparisons arrive as resolved requests. */
type FilterInputValue<Filter> = Filter extends DateTimeRangeComparisonFilter
  ? DateTimeRangeComparisonRequest
  : FilterValues<{ value: Filter }>['value'];

/** An operation's input: one flat field per declared filter. */
export type FilterInput<Filters extends FilterCollection> =
  keyof Filters extends never
    ? Record<string, never>
    : { [Name in keyof Filters]: FilterInputValue<Filters[Name]> };

export type DateFilter = DateTimeRangeFilter | DateTimeRangeComparisonFilter;

/** Exactly the date filters, so a view knows which one sets its reporting period. */
type DateFilterNames<Filters extends FilterCollection> = {
  [Name in keyof Filters]: Filters[Name] extends DateFilter ? Name : never;
}[keyof Filters];

/** Filters are a literal record of known names, and at most one is a date filter:
 * it sets the view's reporting period. */
export type CheckedOperationFilters<Filters extends FilterCollection> =
  Filters &
    (string extends keyof Filters
      ? { 'Declare the filters an operation reads as an object literal': never }
      : unknown) &
    ([DateFilterNames<Filters>] extends [never]
      ? unknown
      : true extends IsUnion<DateFilterNames<Filters>>
        ? { 'An operation reads at most one date filter': never }
        : unknown);

function isDateFilter(filter: FilterCollection[string]): filter is DateFilter {
  return (
    filter.kind === 'dateTimeRange' || filter.kind === 'dateTimeRangeComparison'
  );
}

/** Validate an operation's filters once: unique URL keys and at most one date filter. */
export function defineOperationFilters<Filters extends FilterCollection>(
  filters: Filters
): Filters {
  defineAppFilters(filters);
  invariant(
    Object.values(filters).filter(isDateFilter).length <= 1,
    'An operation reads at most one date filter.'
  );
  return Object.freeze({ ...filters });
}

/** The name of the operation's date filter, which sets its reporting period. */
export function dateFilterName(filters: FilterCollection): string | undefined {
  return Object.keys(filters).find(name => isDateFilter(filters[name]!));
}

/** Resolve URL selections to the input the operation receives. Relative datetime
 * comparisons resolve against one reference time so both ranges agree. */
export function resolveFilterInput<Filters extends FilterCollection>(
  filters: Filters,
  values: FilterValues<Filters>,
  reference = new Date()
): FilterInput<Filters> {
  const input: Record<string, unknown> = {};
  for (const [name, filter] of Object.entries(filters)) {
    const value = values[name as keyof Filters];
    input[name] =
      filter.kind === 'dateTimeRangeComparison'
        ? filter.input(value as DateTimeRangeComparisonSelection, reference)
        : value;
  }
  return input as FilterInput<Filters>;
}

/** Validate untrusted operation input against the declared filters. */
export function parseFilterInput<Filters extends FilterCollection>(
  filters: Filters,
  value: unknown
): FilterInput<Filters> {
  invariant(
    value && typeof value === 'object' && !Array.isArray(value),
    'Expected filter input.'
  );
  const fields = value as Record<string, unknown>;
  for (const name of Object.keys(fields))
    invariant(Object.hasOwn(filters, name), `Unknown filter input: ${name}.`);
  const input: Record<string, unknown> = {};
  for (const [name, filter] of Object.entries(filters)) {
    const selected = fields[name];
    if (filter.kind === 'dateTimeRangeComparison')
      input[name] = filter.parseInput(selected);
    else if (filter.kind === 'dateTimeRange')
      input[name] = filter.parse(selected);
    else {
      invariant(
        (filter as AppFilter<unknown>).valid(selected),
        `Invalid ${filter.label ?? name}.`
      );
      input[name] = selected;
    }
  }
  return input as FilterInput<Filters>;
}

/** The default selections, resolved: every filter operation can run with them. */
export function defaultFilterInput<Filters extends FilterCollection>(
  filters: Filters
): FilterInput<Filters> {
  const defaults = Object.fromEntries(
    Object.entries(filters).map(([name, filter]) => [name, filter.defaultValue])
  ) as FilterValues<Filters>;
  return resolveFilterInput(filters, defaults);
}

/** Every operation in an app shares one filter per name and one owner per URL key. */
export function combineOperationFilters(
  operations: Readonly<Record<string, FilterCollection>>
): FilterCollection {
  const combined: Record<string, FilterCollection[string]> = {};
  for (const [operation, filters] of Object.entries(operations))
    for (const [name, filter] of Object.entries(filters)) {
      invariant(
        !combined[name] || combined[name] === filter,
        `Operations read different filters named ${name}; declare it once and share it (${operation}).`
      );
      combined[name] = filter;
    }
  return defineAppFilters(combined);
}
