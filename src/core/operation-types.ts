/** Shared operation, query, and response contracts; independent of delivery adapters. */
import type { QueryParameters } from '@/src/core/queries';
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

export type QueryResult = {
  columns: { name: string; type?: string }[];
  rows: unknown[][];
  queryId?: string;
};

/** One registered statement an operation ran, with its parameter values. */
export type DisclosedQuery = {
  name: string;
  statement: string;
  params?: QueryParameters;
  queryId?: string;
};

/** Query interface supplied by a server adapter or an authorized iframe bridge. */
export type Lakehouse = {
  queryAll(
    statement: string,
    options: {
      limit: number;
      signal: AbortSignal;
      name?: string;
      params?: QueryParameters;
    }
  ): Promise<QueryResult>;
};

export type OperationContext = {
  lakehouse: Lakehouse;
  signal: AbortSignal;
  queryParams?: QueryParameters;
};

/**
 * The input parser runs in the operation executor's runtime: server for HTTP apps, browser for
 * bundle apps. Browser validation does not replace backend authorization or query limits.
 * `run` parses query rows once; its result is the operation's data.
 */
export type DataOperation<Input, Output> = {
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

/** Delivery envelope shared by HTTP and iframe transports. */
export type TransportResponse<Body = unknown> = { status: number; body: Body };
