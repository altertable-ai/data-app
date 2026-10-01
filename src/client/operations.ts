import type { DataOperations, Lakehouse } from '@/src/core/contract';
import {
  executeDataOperation,
  dataOperationFailure,
} from '@/src/core/operation';
import { getDataAppTransport } from '@/src/client/iframe';
import { DataAppError, type DataTransport } from '@/src/client/transport';

/** Browser operations own their SQL; the host must independently authorize every query. */
export function createOperationTransport(
  operations: DataOperations,
  suppliedLakehouse?: Lakehouse
): DataTransport {
  async function request(
    operation: string,
    input: unknown,
    signal?: AbortSignal
  ) {
    signal?.throwIfAborted();
    const requestId = crypto.randomUUID();
    if (!Object.hasOwn(operations, operation))
      return {
        status: 404,
        body: {
          error: {
            code: 'not_found',
            message: 'Unknown data operation.',
            requestId,
          },
        },
      };
    const lakehouse =
      suppliedLakehouse ??
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
      const { result } = await executeDataOperation(
        operations[operation]!,
        input,
        {
          lakehouse,
          signal: signal ?? new AbortController().signal,
          canDiscloseSql: true,
          requestId,
          name: operation,
        }
      );
      return { status: 200, body: result };
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      if (error instanceof DataAppError) throw error;
      const failure = dataOperationFailure(error);
      return {
        status: failure.status,
        body: {
          error: { code: failure.code, message: failure.message, requestId },
        },
      };
    }
  }

  return request;
}
