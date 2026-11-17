/** Shared operation, query, and response contracts; independent of delivery adapters. */
import type { FilterCollection } from './app-filters.ts';
import { type QueryParameters } from './queries.ts';

export type OperationContracts = Record<
  string,
  { input: (value: unknown) => unknown }
>;

export type InputOf<T> = T extends { input: (value: unknown) => infer Input }
  ? Input
  : never;
/** An operation's data is what its `run` resolves to. */
export type OutputOf<T> = T extends {
  run: (...args: never[]) => Promise<infer Output>;
}
  ? Output
  : unknown;

/** Lakehouse results contain positional unknown cells; registered queries supply decoded records. */
export type QueryResult<Row = unknown[]> = {
  columns: { name: string; type?: string }[];
  rows: Row[];
  queryId?: string;
};

/** One registered statement an operation ran, with its parameter values. */
export type DisclosedQuery = {
  name: string;
  statement: string;
  params?: QueryParameters;
  queryId?: string;
};

type QueryOptions = {
  limit: number;
  signal: AbortSignal;
  params?: QueryParameters;
};

/** SQL execution supplied by a local server adapter. */
export type SqlLakehouse = {
  queryAll(
    statement: string,
    options: QueryOptions & { name?: string }
  ): Promise<QueryResult>;
};

/** Registered query execution supplied by an authorized hosted bridge. */
export type HostedLakehouse = {
  queryAllById(queryId: string, options: QueryOptions): Promise<QueryResult>;
};

export type Lakehouse = SqlLakehouse | HostedLakehouse;

export type OperationContext = {
  lakehouse: SqlLakehouse;
  signal: AbortSignal;
  queryParams?: QueryParameters;
};

/**
 * The input parser runs in the browser. Browser validation does not replace
 * backend authorization or query limits.
 * Registered queries decode rows from their declared projections; `run` derives the operation's data.
 */
export type DataOperation<Input, Output> = {
  /** The app filters the operation reads; its input has one field per filter. */
  filters?: Readonly<FilterCollection>;
  input: (value: unknown) => Input;
  run: (context: OperationContext, input: Input) => Promise<Output>;
  checks: readonly [Input, ...Input[]];
  queryNames?: Readonly<Record<string, string>>;
  policy: {
    maxQueryRows: number;
    maxDurationMs: number;
    maxResponseBytes?: number;
  };
};

/** Heterogeneous registry: inputs vary per operation, so checks retain unknown values. */
export type DataOperations = Record<
  string,
  OperationContracts[string] &
    Omit<DataOperation<never, unknown>, 'input' | 'checks'> & {
      checks: readonly [unknown, ...unknown[]];
    }
>;
export type DataQueryInput<Operations extends OperationContracts> = {
  [Name in keyof Operations & string]: {
    operation: Name;
    input: InputOf<Operations[Name]>;
  };
}[keyof Operations & string];
export type DataQueryBody<Output> = {
  data: Output;
  requestId: string;
  queriedAt: string;
  queryIds: string[];
  queries?: DisclosedQuery[];
};

/** Delivery envelope for typed message routes. */
export type TransportResponse<Body = unknown> = { status: number; body: Body };
