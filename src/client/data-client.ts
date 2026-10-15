import type { IsUnion, KnownRecord } from '@/src/core/queries';
import { randomUuid } from '@/src/core/uuid';
import { createHttpTransport, DataAppError } from '@/src/client/transport';
import { getDataAppTransport, localFrameBridge } from '@/src/client/iframe';
import {
  executeDataOperation,
  toDataOperationFailure,
} from '@/src/core/operation';
import type { DataOperations, Lakehouse } from '@/src/core/contract';
import { defineDataQueryRoute, MessageRoutingError } from '@/src/core/messages';
import type { DataTransport } from '@/src/client/transport';
import type {
  DataQueryBody,
  InputOf,
  OutputOf,
} from '@/src/core/operation-types';
export type { InputOf, OutputOf } from '@/src/core/operation-types';

/**
 * Parsed operation data and query evidence.
 */
export type DataResponse<Output, Input = unknown> = DataQueryBody<Output> & {
  /** The exact browser input that produced this response. */
  input: Input;
};

declare const clientContract: unique symbol;
export type DataClient<Operations extends DataOperations> = {
  /** Preserve the operation registry when passing clients through helpers. */
  readonly [clientContract]: (operations: Operations) => Operations;
  query<Name extends keyof Operations & string>(
    this: void,
    name: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown),
    input: InputOf<Operations[NoInfer<Name>]>,
    options?: { signal?: AbortSignal }
  ): Promise<
    DataResponse<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
  >;
};

/** The factory is the only place that grants a client its invariant contract witness. */
function typedClient<Operations extends DataOperations>(
  implementation: Pick<DataClient<Operations>, 'query'>
): DataClient<Operations> {
  return implementation as DataClient<Operations>;
}

type TransportOptions = {
  operations?: never;
  lakehouse?: never;
  transport?: DataTransport;
  endpoint?: string;
  fetch?: typeof fetch;
};
/** Browser operations and named-operation delivery are mutually exclusive. */
export type DataClientOptions<Operations extends DataOperations> =
  (KnownRecord<Operations> extends never
    ? never
    : true extends {
          [Name in keyof Operations]: IsUnion<Operations[Name]>;
        }[keyof Operations]
      ? never
      : unknown) &
    (
      | {
          operations: Operations;
          lakehouse?: Lakehouse;
          transport?: never;
          endpoint?: never;
          fetch?: never;
        }
      | TransportOptions
    );

const dataQueryRoute = defineDataQueryRoute();

/** Named HTTP operations, or browser-owned operations executed through an authorized SQL bridge. */
export function createDataClient<Operations extends DataOperations>(
  options: DataClientOptions<Operations>
): DataClient<Operations>;
/** Named clients derive data from the declared operations' run return types. */
export function createDataClient<Operations extends DataOperations>(
  ...args: DataClientOptions<Operations> extends never ? [options: never] : []
): DataClient<Operations>;
/** Without an operation contract, external operation data remains unknown. */
export function createDataClient(
  options?: TransportOptions
): DataClient<DataOperations>;
export function createDataClient<Operations extends DataOperations>(
  options: DataClientOptions<Operations> | TransportOptions = {}
): DataClient<Operations> {
  if (options.operations)
    return createOperationClient({
      operations: options.operations,
      lakehouse: options.lakehouse,
    });
  const http = createHttpTransport(options);
  const useHttp = options.endpoint !== undefined || options.fetch !== undefined;

  return typedClient<Operations>({
    async query(name, input, { signal } = {}) {
      const transport =
        options.transport ??
        (useHttp ? http : (localFrameBridge()?.transport ?? http));
      const response = await transport(name, input, signal);
      const ok = response.status >= 200 && response.status < 300;
      let body: Omit<DataResponse<OutputOf<Operations[typeof name]>>, 'input'>;
      try {
        // The envelope is validated here; the shared operation contract owns data.
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
  });
}

function createOperationClient<Operations extends DataOperations>(options: {
  operations: Operations;
  lakehouse?: Lakehouse;
}): DataClient<Operations> {
  const operations = Object.freeze({ ...options.operations });
  return typedClient<Operations>({
    async query(name, input, { signal } = {}) {
      signal?.throwIfAborted();
      const requestId = randomUuid();
      if (!Object.hasOwn(operations, name))
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
        const { body } = await executeDataOperation(operations[name]!, input, {
          lakehouse,
          signal: signal ?? new AbortController().signal,
          requestId,
          operationName: name,
        });

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
  });
}
