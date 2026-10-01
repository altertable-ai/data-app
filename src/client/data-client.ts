import { createHttpTransport, DataAppError } from '@/src/client/transport';
import { getDataAppTransport, localFrameBridge } from '@/src/client/iframe';
import {
  executeDataOperation,
  toDataOperationFailure,
} from '@/src/core/operation';
import type { DataOperations, Lakehouse } from '@/src/core/contract';
import { defineDataQueryRoute, MessageRoutingError } from '@/src/core/messages';
import type { DataTransport } from '@/src/client/transport';
import type { DataQueryBody } from '@/src/core/messages';

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
export type DataResponse<Output, Input = unknown> = DataQueryBody<Output> & {
  /** The exact browser input that produced this response. */
  input: Input;
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

const dataQueryRoute = defineDataQueryRoute();

/** Named HTTP operations, or browser-owned operations executed through an authorized SQL bridge. */
export function createDataClient<Operations extends DataOperations>(
  options: DataClientOptions<Operations> = {}
): DataClient<Operations> {
  if (options.operations)
    return createOperationClient({
      operations: options.operations,
      lakehouse: options.lakehouse,
    });
  const http = createHttpTransport(options);
  const useHttp = options.endpoint !== undefined || options.fetch !== undefined;

  return {
    async query(name, input, { signal } = {}) {
      const transport =
        options.transport ??
        (useHttp ? http : (localFrameBridge()?.transport ?? http));
      const response = await transport(name, input, signal);
      const ok = response.status >= 200 && response.status < 300;
      let body: Omit<DataResponse<OutputOf<Operations[typeof name]>>, 'input'>;
      try {
        body = dataQueryRoute.output(response, { operation: name, input })
          .body as typeof body;
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error instanceof MessageRoutingError)
          throw new DataAppError(error.message, error.code, error.requestId);
        throw new DataAppError(
          ok ? 'The data response was invalid.' : 'Could not load data.',
          ok ? 'invalid_response' : 'request_failed'
        );
      }

      return { ...body, input };
    },
  };
}

function createOperationClient<Operations extends DataOperations>(options: {
  operations: Operations;
  lakehouse?: Lakehouse;
}): DataClient<Operations> {
  return {
    async query(name, input, { signal } = {}) {
      signal?.throwIfAborted();
      const requestId = crypto.randomUUID();
      if (!Object.hasOwn(options.operations, name))
        throw new DataAppError(
          'Unknown data operation.',
          'not_found',
          requestId
        );
      const lakehouse =
        options.lakehouse ??
        (typeof window === 'undefined'
          ? undefined
          : getDataAppTransport()?.lakehouse);
      if (!lakehouse)
        throw new DataAppError(
          'An authorized SQL bridge must be installed first.',
          'bridge_unavailable',
          requestId
        );

      try {
        const { body } = await executeDataOperation(
          options.operations[name]!,
          input,
          {
            lakehouse,
            signal: signal ?? new AbortController().signal,
            includeSql: true,
            requestId,
            operationName: name,
          }
        );

        return { ...body, input } as DataResponse<
          OutputOf<Operations[typeof name]>,
          InputOf<Operations[typeof name]>
        >;
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        if (error instanceof DataAppError) throw error;
        const failure = toDataOperationFailure(error);
        throw new DataAppError(failure.message, failure.code, requestId);
      }
    },
  };
}
