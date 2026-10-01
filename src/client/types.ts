import type {
  DataOperations,
  DisclosedQuery,
  Lakehouse,
} from '@/src/core/contract';
import type { DataTransport } from '@/src/client/transport';

/** Browser operations and named-operation delivery are mutually exclusive configurations. */
export type DataClientOptions<Operations extends DataOperations> =
  | {
      operations: Operations;
      lakehouse?: Lakehouse;
      transport?: never;
      endpoint?: never;
      fetch?: never;
    }
  | {
      operations?: never;
      lakehouse?: never;
      transport?: DataTransport;
      endpoint?: string;
      fetch?: typeof fetch;
    };

export type InputOf<T> = T extends { input: (value: unknown) => infer Input }
  ? Input
  : never;
export type OutputOf<T> = T extends { output: (value: unknown) => infer Output }
  ? Output
  : never;

/**
 * Parsed operation data and query evidence. `queries` is present only when SQL disclosure is
 * allowed.
 */
export type DataResponse<Output, Input = unknown> = {
  data: Output;
  /** The exact browser input that produced this response. Never infer it from current controls. */
  input: Input;
  requestId: string;
  queriedAt: string;
  queryIds: string[];
  queries?: DisclosedQuery[];
};

export type DataClient<Operations extends DataOperations> = {
  query<Name extends keyof Operations & string>(
    name: Name,
    input: InputOf<Operations[Name]>,
    options?: { signal?: AbortSignal }
  ): Promise<
    DataResponse<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
  >;
};
