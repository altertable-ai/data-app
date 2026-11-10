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
export type {
  DateTimeRangeContract,
  DateTimeRangeRequest,
} from '../core/date-time-range-contract.ts';
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

/** One source policy for datetime picker validation and operation requests. */
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

  return {
    datetime,
    bounds,
  };
}

export type DateRangeContract = ReturnType<typeof defineDateRangeContract>;

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

/** An operation with its own input, such as a detail destination's record id. It may
 * also read filters, such as the displayed scope it lists records for. */
export type InputOperationDefinition<
  Input,
  Output,
  Queries extends QueryDefinitions,
  Filters extends FilterCollection = {},
> = {
  /** Filters the operation reads beside its own input; they are parsed for it. */
  filters?: CheckedOperationFilters<Filters>;
  /** Parses the operation's own fields, without the filters. */
  input: (value: unknown) => Input;
  /** Representative valid own inputs; each must pass `input`. */
  checks: readonly [Input, ...Input[]];
  policy: OperationPolicy;
  run: OperationRun<WithFilterInput<Filters, Input>, Output, Queries>;
};

/** The full input of an operation with its own fields and optional filters. */
export type WithFilterInput<
  Filters extends FilterCollection,
  Input,
> = keyof Filters extends never ? Input : FilterInput<Filters> & Input;

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
  const Filters extends FilterCollection = {},
>(
  operation: InputOperationDefinition<Input, Output, Queries, Filters> & {
    queries: CheckedQueries<Queries>;
  }
): DefinedOperation<
  WithFilterInput<Filters, Input>,
  Output,
  Queries,
  keyof Filters extends never ? undefined : Filters
>;
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
          | import('../core/dimension.ts').DimensionSelection
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

/** Filters parse themselves; an operation's own `input` parses only its other fields. */
function operationInputContract(
  operation:
    | FilterOperationDefinition<FilterCollection, unknown, QueryDefinitions>
    | InputOperationDefinition<unknown, unknown, QueryDefinitions>
): Pick<DataOperation<unknown, unknown>, 'input' | 'checks' | 'filters'> {
  const filters = defineOperationFilters(operation.filters ?? {});
  const defaults = defaultFilterInput(filters);
  if (!operation.input)
    return {
      filters,
      input: value => parseFilterInput(filters, value),
      checks: [defaults],
    };
  const parseOwn = operation.input;
  invariant(
    Array.isArray(operation.checks) && operation.checks.length > 0,
    'An operation with its own input needs check inputs.'
  );
  if (!Object.keys(filters).length) {
    for (const check of operation.checks) parseOwn(check);
    return { input: parseOwn, checks: operation.checks };
  }
  function input(value: unknown) {
    invariant(
      value && typeof value === 'object' && !Array.isArray(value),
      'Expected operation input.'
    );
    const own: Record<string, unknown> = {};
    const selected: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(value))
      (Object.hasOwn(filters, name) ? selected : own)[name] = field;
    const parsed = parseOwn(own);
    invariant(
      !!parsed && typeof parsed === 'object',
      'Expected parsed input object.'
    );
    for (const name of Object.keys(parsed))
      invariant(
        !Object.hasOwn(filters, name),
        `Input field ${name} is also a filter; the filter parses it.`
      );
    return { ...parseFilterInput(filters, selected), ...parsed };
  }
  const checks = operation.checks.map(check => ({
    ...defaults,
    ...(check as object),
  })) as unknown as readonly [unknown, ...unknown[]];
  for (const check of checks) input(check);
  return { filters, input, checks };
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
} from '../core/app-filters.ts';
export type {
  AppFilter,
  FilterValues,
  SearchFilter,
  ChoiceFilter,
  ChoiceOption,
  MultiChoiceFilter,
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
