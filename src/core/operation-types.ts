/** Shared operation, query, and response contracts; independent of delivery adapters. */
import type { QueryParameters } from '@/src/core/queries';
export type OperationContracts = Record<
  string,
  {
    input: OperationInputParser<unknown>;
    output: (value: unknown) => unknown;
  }
>;

export type InputOf<T> = T extends { input: (value: unknown) => infer Input }
  ? Input
  : never;
export type OutputOf<T> = T extends { output: (value: unknown) => infer Output }
  ? Output
  : never;

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

const inputValidationErrorBrand = Symbol.for(
  '@altertable/data-app.input-validation-error'
);
export class InputValidationError extends Error {
  readonly name = 'InputValidationError';
  readonly [inputValidationErrorBrand] = true;
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [inputValidationErrorBrand]?: unknown })[
        inputValidationErrorBrand
      ] === true
    );
  }
}

/** Source-backed validation runs after parsing and before business queries, in the operation executor. */
export type OperationInputParser<Input> = ((value: unknown) => Input) & {
  validation?: {
    queries: import('@/src/core/queries').QueryDefinitions;
    operations?: DataOperations;
    run(
      query: (
        name: string,
        params: QueryParameters,
        options: { limit: number }
      ) => Promise<QueryResult>,
      input: Input
    ): Promise<void>;
  };
};

/**
 * Parsers run in the operation executor's runtime: server for HTTP apps, browser for bundle apps.
 * Browser validation does not replace backend authorization or query limits.
 */
export type DataOperation<Input, Output> = {
  input: OperationInputParser<Input>;
  output: (value: unknown) => Output;
  run: (context: OperationContext, input: Input) => Promise<Output>;
  checks: readonly Input[];
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
    Omit<DataOperation<never, unknown>, 'input' | 'output' | 'checks'> & {
      checks: readonly unknown[];
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
