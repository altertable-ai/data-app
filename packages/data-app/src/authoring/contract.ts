/**
 * Shared operation contracts and input validation for browser and server.
 * @module @altertable/data-app/contract
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/contract.md
 */
import { parseDate, today } from '@internationalized/date';

import { createDateTimeRangeContract } from '../core/date-time-range-contract.ts';
import {
  attachDimensionSelectors,
  validateVariableInput,
} from '../core/dimension-source.ts';
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

export function parseEmptyInput(value: unknown): Record<string, never> {
  invariant(
    typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0,
    'This operation takes no inputs.'
  );

  return {};
}

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

/** Infer operation data from run(). */
export type OperationDefinition<
  Input,
  Output,
  Queries extends QueryDefinitions,
> = Omit<DataOperation<Input, Output>, 'run' | 'queryNames'> & {
  run: (
    context: Pick<OperationContext, 'signal'> & {
      query: RegisteredQuery<NoInfer<Queries>>;
    },
    input: Input
  ) => Promise<Output>;
};

export function defineOperation<
  Input,
  Output,
  const Queries extends QueryDefinitions,
>(
  operation: OperationDefinition<Input, Output, Queries> & {
    queries: CheckedQueries<Queries>;
  }
): Omit<DataOperation<Input, Output>, 'queryNames'> & {
  queryNames: { readonly [Name in keyof Queries & string]: Name };
} {
  invariant(
    Array.isArray(operation.checks) &&
      operation.checks.length > 0 &&
      Number.isInteger(operation.policy.maxQueryRows) &&
      operation.policy.maxQueryRows > 0 &&
      operation.policy.maxQueryRows <= MAX_QUERY_ROWS &&
      Number.isInteger(operation.policy.maxDurationMs) &&
      operation.policy.maxDurationMs > 0 &&
      (operation.policy.maxResponseBytes === undefined ||
        (Number.isInteger(operation.policy.maxResponseBytes) &&
          operation.policy.maxResponseBytes > 0)),
    `Each data operation needs check inputs and positive row and duration limits, with at most ${MAX_QUERY_ROWS.toLocaleString('en-US')} rows.`
  );
  const queries = snapshotQueries(operation.queries);
  const queryNames = Object.fromEntries(
    Object.keys(queries).map(name => [name, name])
  ) as { readonly [Name in keyof Queries & string]: Name };
  for (const input of operation.checks) operation.input(input);

  const defined: Omit<DataOperation<Input, Output>, 'queryNames'> & {
    queryNames: { readonly [Name in keyof Queries & string]: Name };
  } = {
    ...operation,
    queryNames,
    async run(context, input) {
      async function query<Name extends keyof Queries & string>(
        name: Name,
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
          limit: options?.limit ?? operation.policy.maxQueryRows,
          signal: context.signal,
        });
        return decodeQueryResult<Queries[Name]['projections']>(
          result,
          definition.projections
        );
      }
      await validateVariableInput(operation.input, input, query);
      context.signal.throwIfAborted();
      return operation.run({ signal: context.signal, query }, input);
    },
  };
  attachDimensionSelectors(defined, queries);
  return defined;
}

/** The built-in connection operation shares one contract with setup clients. */
export type ConnectionOperation = Omit<
  DataOperation<Record<string, never>, true>,
  'queryNames'
> & { queryNames: { readonly connection: 'connection' } };

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
    input: parseEmptyInput,
    checks: [{}],
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
  DimensionVariable,
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

export { variableInput } from '../core/dimension-source.ts';

export {
  dateTimeRangeVariable,
  dateTimeRangePresets,
  type DateTimeRangePreset,
  type DateTimeRangeVariable,
  type DateTimeRangeComparisonVariable,
  type DateTimeRangeComparisonVariableOptions,
  type DateTimeRangeComparisonSelection,
  type DateTimeRangeComparisonRequest,
  type DateTimeRangeVariableOptions,
} from '../core/date-time-variable.ts';
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
