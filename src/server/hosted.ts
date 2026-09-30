/**
 * Run named `data:query` requests on the host, next to lakehouse credentials.
 * The iframe client only sends `{ operation, input }`.
 */
import type { TransportResponse } from '@/src/core/bridge';
import type { DataOperations } from '@/src/core/contract';
import { createDataHandler } from '@/src/server/handler';
import {
  createQueryExecutorLakehouse,
  type QueryExecutor,
} from '@/src/server/query-executor';

const hostedOrigin = 'https://data-app.local';

export type HostedQueryAccess = { canDiscloseSql?: boolean };

/**
 * Adapt a host SQL executor to the `data:query` envelope.
 * Build one handler per viewer session so `execute` closes over that viewer's credentials.
 * `authorize` runs before the operation; a throw becomes `403/forbidden` with no private detail.
 */
export function createHostedQueryHandler(
  operations: DataOperations,
  options: {
    execute: QueryExecutor;
    canDiscloseSql?: boolean;
    authorize?: (
      operation: string,
      signal: AbortSignal
    ) => Promise<void | HostedQueryAccess>;
  }
) {
  const handle = createDataHandler(operations, async (request, operation) => {
    const access = await options.authorize?.(operation, request.signal);

    return {
      lakehouse: createQueryExecutorLakehouse(options.execute),
      canDiscloseSql: access?.canDiscloseSql ?? options.canDiscloseSql ?? false,
    };
  });

  return async function handleHostedQuery(
    payload: { operation: string; input: unknown },
    signal: AbortSignal
  ): Promise<TransportResponse> {
    const request = new Request(
      `${hostedOrigin}/api/data/${encodeURIComponent(payload.operation)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: hostedOrigin,
        },
        body: JSON.stringify(payload.input ?? {}),
        signal,
      }
    );
    const response = await handle(request);

    return { status: response.status, body: await response.json() };
  };
}
