/**
 * Shared operation contracts and input validation for browser and server.
 * @module @altertable/data-app/contract
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/contract.md
 */
import { parseDate, today } from '@internationalized/date';

import type { FilterCollection } from '../core/app-filters.ts';
import { createDateTimeRangeContract } from '../core/date-time-range-contract.ts';
import {
  attachDimensionSelectors,
  validateSourceMembers,
} from '../core/dimension-source.ts';
import {
  defaultFilterInput,
  defineOperationFilters,
  parseFilterInput,
  type CheckedOperationFilters,
  type FilterInput,
} from '../core/operation-filters.ts';
import { fixedUnitMilliseconds } from '../core/time-units.ts';
export type {
  DateTimeRangeContract,
  DateTimeRangeRequest,
} from '../core/date-time-range-contract.ts';
import { formatDateRange } from '../core/format.ts';
import { invariant } from '../core/invariant.ts';
import {
  MAX_QUERY_ROWS,
  snapshotQueries,
  resolveQueryParameters,
  decodeQueryResult,
  type QueryDefinitions,
  type CheckedQueries,
  type QueryInputParameters,
  type QueryRow,
  type IsUnion,
} from '../core/queries.ts';
export type {
  QueryDefinitions,
  QueryParameters,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
} from '../core/queries.ts';
import type { DateRange as DateRangeInput } from '../core/date-range.ts';
import type {
  QueryResult,
  DataOperation,
  OperationContext,
} from '../core/operation-types.ts';
export type {
  QueryResult,
  DisclosedQuery,
  DataOperation,
} from '../core/operation-types.ts';

export function parseTrue(value: unknown): true {
  invariant(value === true, 'Expected a successful check.');

  return true;
}

export type { DateRange as DateRangeInput } from '../core/date-range.ts';
export type DateRangeRequest = {
  range: DateRangeInput;
  comparison: DateRangeInput | null;
};

/** The immediately preceding, equally long set of calendar days. */
export function previousDateRange({
  start,
  end,
}: DateRangeInput): DateRangeInput {
  const first = parseDate(start);
  const last = parseDate(end);
  const days =
    (last.toDate('UTC').getTime() - first.toDate('UTC').getTime()) /
      fixedUnitMilliseconds.DAY +
    1;
  invariant(days >= 1, 'Date range must start before it ends.');
  const previousEnd = first.subtract({ days: 1 });

  return {
    start: previousEnd.subtract({ days: days - 1 }).toString(),
    end: previousEnd.toString(),
  };
}

export type ReportingPeriod =
  | { kind: 'rolling'; amount: number; unit: 'hour' | 'day'; end: string }
  | { kind: 'calendar'; start: string; end: string; timeZone: string };

export type DateRangeContractOptions = {
  minDate?: string;
  maxDate?: string | (() => string);
  maxRangeDays: number;
  timeZone: string;
  /** Defaults to complete days through yesterday in the reporting timezone. Set false to include today. */
  completeDays?: boolean;
};

/** One source policy for the server parser, URL filter, and displayed reporting period. */
export function defineDateRangeContract({
  minDate,
  maxDate,
  maxRangeDays,
  timeZone,
  completeDays,
}: DateRangeContractOptions) {
  invariant(
    Number.isInteger(maxRangeDays) && maxRangeDays > 0,
    'Date range needs a positive maxRangeDays.'
  );
  if (minDate) parseDate(minDate);
  if (typeof maxDate === 'string') parseDate(maxDate);
  today(timeZone);

  const datetime = createDateTimeRangeContract({
    minDate,
    maxDate,
    maxRangeDays,
    timeZone,
    completeDays,
  });
  const bounds = datetime.bounds;

  function period({ start, end }: DateRangeInput): ReportingPeriod {
    return {
      kind: 'calendar',
      start,
      end,
      timeZone,
    };
  }

  function describeInput(input: DateRangeInput) {
    return `${formatDateRange(input)} ${timeZone}`;
  }

  function comparison(input: DateRangeInput): DateRangeInput | null {
    const previous = previousDateRange(input);

    return minDate && previous.start < minDate ? null : previous;
  }

  function request(value: unknown, compare = false): DateRangeRequest {
    const range = parseDateRangeInput(value, bounds());
    const previous = compare ? comparison(range) : null;
    invariant(
      !compare || previous,
      'Comparison is outside available source coverage.'
    );

    return { range, comparison: previous };
  }

  function parseRequest(value: unknown): DateRangeRequest {
    invariant(value && typeof value === 'object', 'Choose a date range.');
    const input = value as Record<string, unknown>;
    const parsed = request(input.range, input.comparison != null);
    if (input.comparison != null) {
      const supplied = parseDateRangeInput(input.comparison, bounds());
      invariant(
        supplied.start === parsed.comparison?.start &&
          supplied.end === parsed.comparison?.end,
        'Comparison must be the preceding equal-length range.'
      );
    }

    return parsed;
  }

  return {
    datetime,
    request,
    parseRequest,
    bounds,
    parse(value: unknown) {
      return parseDateRangeInput(value, bounds());
    },
    period,
    comparison,
    describeInput,
    view: { period, describeInput },
  };
}

export type DateRangeContract = ReturnType<typeof defineDateRangeContract>;

/** Validate calendar dates and a bounded inclusive range on the server. */
export function parseDateRangeInput(
  value: unknown,
  {
    minDate,
    maxDate,
    maxRangeDays,
  }: { minDate?: string; maxDate?: string; maxRangeDays: number }
): DateRangeInput {
  invariant(
    value && typeof value === 'object' && !Array.isArray(value),
    'Choose a date range.'
  );
  const { start, end } = value as Record<string, unknown>;

  function day(input: unknown): number {
    invariant(
      typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input),
      'Dates must be YYYY-MM-DD.'
    );
    const timestamp = Date.parse(`${input}T00:00:00Z`);
    invariant(
      Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString().slice(0, 10) === input,
      'Choose valid calendar dates.'
    );

    return timestamp;
  }
  const first = day(start);
  const last = day(end);
  invariant(
    Number.isInteger(maxRangeDays) && maxRangeDays > 0,
    'Maximum range days must be positive.'
  );
  invariant(
    first <= last &&
      (last - first) / fixedUnitMilliseconds.DAY < maxRangeDays &&
      (minDate === undefined || first >= day(minDate)) &&
      (maxDate === undefined || last <= day(maxDate)),
    `Choose up to ${maxRangeDays} days within the available range.`
  );

  return { start: start as string, end: end as string };
}

/** Accepts numeric strings from DuckDB; rejects negative, fractional, and unsafe integers. */
export function parseCount(value: unknown): number {
  const number =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : NaN;
  invariant(
    Number.isSafeInteger(number) &&
      number >= 0 &&
      (typeof value !== 'string' || !!value.trim()),
    'Invalid count in query result.'
  );

  return number;
}

export function parseLabel(value: unknown, maxLength = 100): string {
  invariant(
    typeof value === 'string' && !!value && value.length <= maxLength,
    'Invalid label in query result.'
  );

  return value;
}

export function defineQueryNames<const Names extends Record<string, string>>(
  names: Names
): Names {
  const values = Object.values(names);
  invariant(
    values.every(name => !!name.trim()) &&
      new Set(values).size === values.length,
    'Query names must be nonempty and unique.'
  );

  return names;
}

type RegisteredQueryParameters<
  Queries extends QueryDefinitions,
  Name extends keyof Queries,
> = QueryInputParameters<Queries[Name]['params']>;
type ExactQueryParameters<Expected, Params extends object> = Params &
  Expected &
  Record<Exclude<keyof Params, keyof Expected>, never> &
  (Params extends (...args: never[]) => unknown ? never : object);

type ParameterNames<
  Queries extends QueryDefinitions,
  Name extends keyof Queries,
> = Name extends keyof Queries
  ? keyof RegisteredQueryParameters<Queries, Name>
  : never;

/** Dynamic limits are checked at execution; known limits must be positive integers. */
type QueryLimit<Limit extends number> = number extends Limit
  ? number
  : `${Limit}` extends '0' | `-${string}`
    ? never
    : `${Limit}` extends `${bigint}`
      ? Limit
      : never;

export type RegisteredQuery<Queries extends QueryDefinitions> = <
  Name extends keyof Queries & string,
  const Params extends object = {},
  const Limit extends number = number,
>(
  name: Name &
    (true extends IsUnion<NoInfer<Name>>
      ? [ParameterNames<Queries, Name>] extends [never]
        ? unknown
        : never
      : unknown),
  params?: ExactQueryParameters<
    RegisteredQueryParameters<Queries, NoInfer<Name>>,
    Params
  >,
  options?: { limit?: Limit & QueryLimit<NoInfer<Limit>> }
) => Promise<QueryResult<QueryRow<Queries[Name]['projections']>>>;

type OperationRun<Input, Output, Queries extends QueryDefinitions> = (
  context: Pick<OperationContext, 'signal'> & {
    query: RegisteredQuery<NoInfer<Queries>>;
  },
  input: Input
) => Promise<Output>;
type OperationPolicy = DataOperation<unknown, unknown>['policy'];

/** An operation that reads app filters. Its input has one field per filter, validated by
 * the filters themselves; views derive their filters, scope, and period from it. */
export type FilterOperationDefinition<
  Filters extends FilterCollection,
  Output,
  Queries extends QueryDefinitions,
> = {
  /** The filters `run` reads. Omit for an operation without inputs. */
  filters?: CheckedOperationFilters<Filters>;
  input?: never;
  checks?: never;
  policy: OperationPolicy;
  run: OperationRun<FilterInput<Filters>, Output, Queries>;
};

/** An operation with its own input, such as a detail destination's record id. */
export type InputOperationDefinition<
  Input,
  Output,
  Queries extends QueryDefinitions,
> = {
  input: (value: unknown) => Input;
  /** Representative valid inputs; each must pass `input`. */
  checks: readonly [Input, ...Input[]];
  filters?: never;
  policy: OperationPolicy;
  run: OperationRun<Input, Output, Queries>;
};

export type DefinedOperation<
  Input,
  Output,
  Queries extends QueryDefinitions,
  Filters extends FilterCollection | undefined = undefined,
> = Omit<DataOperation<Input, Output>, 'queryNames' | 'filters'> & {
  queryNames: { readonly [Name in keyof Queries & string]: Name };
} & (Filters extends FilterCollection
    ? { readonly filters: Filters }
    : { readonly filters?: never });

export function defineOperation<
  Input,
  Output,
  const Queries extends QueryDefinitions,
>(
  operation: InputOperationDefinition<Input, Output, Queries> & {
    queries: CheckedQueries<Queries>;
  }
): DefinedOperation<Input, Output, Queries>;
export function defineOperation<
  const Queries extends QueryDefinitions,
  const Filters extends FilterCollection = {},
  Output = unknown,
>(
  operation: FilterOperationDefinition<Filters, Output, Queries> & {
    queries: CheckedQueries<Queries>;
  }
): DefinedOperation<FilterInput<Filters>, Output, Queries, Filters>;
export function defineOperation(
  operation: (
    | FilterOperationDefinition<FilterCollection, unknown, QueryDefinitions>
    | InputOperationDefinition<unknown, unknown, QueryDefinitions>
  ) & { queries: QueryDefinitions }
): any {
  const { policy } = operation;
  invariant(
    Number.isInteger(policy.maxQueryRows) &&
      policy.maxQueryRows > 0 &&
      policy.maxQueryRows <= MAX_QUERY_ROWS &&
      Number.isInteger(policy.maxDurationMs) &&
      policy.maxDurationMs > 0 &&
      (policy.maxResponseBytes === undefined ||
        (Number.isInteger(policy.maxResponseBytes) &&
          policy.maxResponseBytes > 0)),
    `Each data operation needs positive row and duration limits, with at most ${MAX_QUERY_ROWS.toLocaleString('en-US')} rows.`
  );
  const contract = operationInputContract(operation);
  const queries = snapshotQueries(operation.queries);
  const queryNames = Object.fromEntries(
    Object.keys(queries).map(name => [name, name])
  );

  const defined: DataOperation<unknown, unknown> = {
    ...contract,
    policy,
    queryNames,
    async run(context, input) {
      async function query(
        name: string,
        values: Record<
          string,
          | import('../core/queries.ts').QueryParameterValue
          | import('../core/date-time-range.ts').DateTimeRange
          | undefined
        > = {},
        options?: { limit?: number }
      ) {
        invariant(Object.hasOwn(queries, name), `Unknown query name: ${name}.`);
        const definition = queries[name]!;
        const params = resolveQueryParameters(
          definition.params,
          values,
          context.queryParams ?? {}
        );
        const result = await context.lakehouse.queryAll(definition.statement, {
          name,
          params,
          limit: options?.limit ?? policy.maxQueryRows,
          signal: context.signal,
        });
        return decodeQueryResult(result, definition.projections);
      }
      if (contract.filters)
        await validateSourceMembers(contract.filters, input, query);
      context.signal.throwIfAborted();
      return operation.run(
        { signal: context.signal, query: query as never },
        input as never
      );
    },
  };
  attachDimensionSelectors(defined, queries);
  return defined;
}

/** Filter operations derive their parser and checks; others supply both. */
function operationInputContract(
  operation:
    | FilterOperationDefinition<FilterCollection, unknown, QueryDefinitions>
    | InputOperationDefinition<unknown, unknown, QueryDefinitions>
): Pick<DataOperation<unknown, unknown>, 'input' | 'checks' | 'filters'> {
  if (operation.input) {
    invariant(
      !operation.filters,
      'An operation reads filters or parses its own input, not both.'
    );
    const { input, checks } = operation;
    invariant(
      Array.isArray(checks) && checks.length > 0,
      'An operation with its own input needs check inputs.'
    );
    for (const check of checks) input(check);
    return { input, checks };
  }
  const filters = defineOperationFilters(operation.filters ?? {});
  return {
    filters,
    input: value => parseFilterInput(filters, value),
    checks: [defaultFilterInput(filters)],
  };
}

/** The built-in connection operation shares one contract with setup clients. */
export type ConnectionOperation = Omit<
  DataOperation<Record<string, never>, true>,
  'queryNames' | 'filters'
> & {
  readonly filters: {};
  queryNames: { readonly connection: 'connection' };
};

/** A connectivity probe uses the app's registered connection query. */
export function connectionCheck<
  const Queries extends QueryDefinitions & {
    connection: QueryDefinitions[string];
  },
>(queries: CheckedQueries<Queries>): ConnectionOperation {
  const connection: QueryDefinitions[string] = queries.connection;
  return defineOperation({
    queries: { connection } as CheckedQueries<{
      connection: QueryDefinitions[string];
    }>,
    policy: { maxQueryRows: 1, maxDurationMs: 15_000 },
    async run({ query }): Promise<true> {
      await query('connection');
      return true;
    },
  });
}

export {
  dimensionFilter,
  parseDimensionSelection,
  parseFacetOptions,
  dimensionPredicate,
} from '../core/dimension.ts';
export type {
  DimensionSelection,
  DimensionMember,
  DimensionOption,
  DimensionFilter,
  DimensionFilterOptions,
} from '../core/dimension.ts';

export {
  numberFilter,
  booleanFilter,
  parseNumberSelection,
  parseBooleanSelection,
} from '../core/filters.ts';
export type {
  NumberSelection,
  NumberOperator,
  NumberFilter,
  BooleanSelection,
  BooleanFilter,
} from '../core/filters.ts';

export {
  searchFilter,
  choiceFilter,
  displayChoice,
  multiChoiceFilter,
  dateRangeFilter,
} from '../core/app-filters.ts';
export type {
  AppFilter,
  FilterValues,
  SearchFilter,
  ChoiceFilter,
  ChoiceOption,
  MultiChoiceFilter,
  DateRangeFilter,
  DateRangeFilterOptions,
  DateRangeSelection,
  FilterCollection,
  FilterPresentation,
} from '../core/app-filters.ts';
export { facetFilter } from '../core/facet-filter.ts';
export type { FacetFilter } from '../core/facets.ts';
export type { FilterInput } from '../core/operation-filters.ts';

export {
  dateTimeRangeFilter,
  dateTimeRangePresets,
  type DateTimeRangePreset,
  type DateTimeRangeFilter,
  type DateTimeRangeComparisonFilter,
  type DateTimeRangeComparisonFilterOptions,
  type DateTimeRangeComparisonSelection,
  type DateTimeRangeComparisonRequest,
  type DateTimeRangeFilterOptions,
} from '../core/date-time-filter.ts';
export {
  parseDateTimeRange,
  serializeDateTimeRange,
  resolveDateTimeRange,
  formatDateTimeRange,
  formatDateTimeBound,
  parseDateTimeBound,
} from '../core/date-time-range-value.ts';
export type {
  DateTimeRange,
  ResolvedDateTimeRange,
  AbsoluteOrRelativeDateTime,
  RelativeDateTime,
} from '../core/date-time-range.ts';

export { dateTimeRangeSql } from '../core/date-time-range-sql.ts';
