import type { DataOperations, Lakehouse } from '@/src/core/contract';
import {
  executeDataOperation,
  toDataOperationFailure,
} from '@/src/core/operation';
import { getDataAppTransport } from '@/src/client/iframe';
import { DataAppError } from '@/src/client/transport';
import type {
  DataClient,
  DataResponse,
  InputOf,
  OutputOf,
} from '@/src/client/types';

/** Run app-owned operations directly; the SQL adapter owns authorized query delivery. */
export function createBrowserOperationClient<Operations extends DataOperations>(
  operations: Operations,
  configuredLakehouse?: Lakehouse
): DataClient<Operations> {
  return {
    async query(operationName, input, { signal } = {}) {
      signal?.throwIfAborted();
      const requestId = crypto.randomUUID();
      if (!Object.hasOwn(operations, operationName))
        throw new DataAppError(
          'Unknown data operation.',
          'not_found',
          requestId
        );
      const lakehouse =
        configuredLakehouse ??
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
          operations[operationName]!,
          input,
          {
            lakehouse,
            signal: signal ?? new AbortController().signal,
            includeSql: true,
            requestId,
            operationName,
          }
        );

        return { ...body, input } as DataResponse<
          OutputOf<Operations[typeof operationName]>,
          InputOf<Operations[typeof operationName]>
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
