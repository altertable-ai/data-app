/**
 * Run a named operation when the host has no `data:query` handler.
 * Each statement is executed by the host; credentials stay there.
 */
import { executeHostQuery } from '@/src/client/host-query';
import { DataAppError } from '@/src/client/transport';
import type { TransportResponse } from '@/src/core/bridge';
import {
  DataSourceError,
  type DataOperations,
  type DisclosedQuery,
  type Lakehouse,
} from '@/src/core/contract';

const sourceErrorMessages = {
  unauthorized:
    "Lakehouse access needs attention. Run this app with 'altertable app dev', or run 'altertable login' and retry.",
  forbidden:
    "This app cannot access its lakehouse data. Check the selected profile's permissions.",
  rate_limited: 'The lakehouse is busy. Wait a moment and retry.',
  query_rejected:
    "A lakehouse query was rejected. Check the app's data operation.",
  unavailable: 'The lakehouse is unavailable. Check the connection and retry.',
};

function problem(
  status: number,
  code: string,
  message: string,
  requestId: string
): TransportResponse {
  return { status, body: { error: { code, message, requestId } } };
}

function operationFor(operations: DataOperations, name: string) {
  if (!Object.hasOwn(operations, name)) return undefined;

  return operations[name];
}

/**
 * Execute one registered operation and return the same envelope as the server handler.
 * The host is asked only for `{ sql }`.
 */
export async function executeHostedOperation(
  operations: DataOperations,
  name: string,
  input: unknown,
  signal?: AbortSignal
): Promise<TransportResponse> {
  const requestId = crypto.randomUUID();
  const operation = operationFor(operations, name);
  if (!operation)
    return problem(404, 'not_found', 'Unknown data operation.', requestId);
  let parsed: unknown;
  try {
    parsed = operation.input(input);
  } catch {
    return problem(
      400,
      'invalid_input',
      "Check this operation's inputs.",
      requestId
    );
  }
  signal?.throwIfAborted();
  const timeout = AbortSignal.timeout(operation.policy.maxDurationMs);
  const scoped = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const queryIds: string[] = [];
  const queries: DisclosedQuery[] = [];
  const lakehouse: Lakehouse = {
    async queryAll(statement, options) {
      if (!Number.isInteger(options.limit) || options.limit < 1)
        throw new Error('Query needs a positive row limit.');
      if (
        operation.queryNames &&
        !Object.values(operation.queryNames).includes(options.name ?? '')
      )
        throw new Error(`Query name is not registered for operation ${name}.`);
      const query: DisclosedQuery = {
        name: options.name ?? `Query ${queries.length + 1}`,
        statement,
      };
      queries.push(query);
      const limit = Math.min(options.limit, operation.policy.maxQueryRows);
      const result = await executeHostQuery(statement, {
        signal: AbortSignal.any([scoped, options.signal]),
      });
      if (result.rows.length > limit)
        throw new Error('Result exceeds row limit.');
      if (result.queryId) {
        query.queryId = result.queryId;
        queryIds.push(result.queryId);
      }

      return result;
    },
  };
  let abort: (() => void) | undefined;
  try {
    scoped.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      function rejectAborted() {
        reject(scoped.reason);
      }

      abort = rejectAborted;
      scoped.addEventListener('abort', rejectAborted, { once: true });
      if (scoped.aborted) rejectAborted();
    });
    const data = operation.output(
      await Promise.race([
        cancelled,
        Promise.resolve().then(() => {
          scoped.throwIfAborted();

          return operation.run({ lakehouse, signal: scoped }, parsed as never);
        }),
      ])
    );
    const result = {
      data,
      requestId,
      queriedAt: new Date().toISOString(),
      queryIds,
      ...(operation.policy.exposeSql ? { queries } : {}),
    };
    const body = JSON.stringify(result);
    if (
      new TextEncoder().encode(body).byteLength >
      (operation.policy.maxResponseBytes ?? 1_000_000)
    )
      throw new Error('Response exceeds byte limit.');

    return { status: 200, body: result };
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (
      scoped.aborted ||
      (error instanceof DataAppError && error.code === 'timeout')
    )
      return problem(504, 'timeout', 'The data request timed out.', requestId);
    if (error instanceof DataSourceError)
      return problem(
        error.reason === 'rate_limited' ? 429 : 502,
        `source_${error.reason}`,
        sourceErrorMessages[error.reason],
        requestId
      );
    if (error instanceof DataAppError && error.code === 'source_query_rejected')
      return problem(
        502,
        'source_query_rejected',
        error.message || sourceErrorMessages.query_rejected,
        error.requestId ?? requestId
      );
    if (error instanceof DataAppError && error.code === 'bridge_unavailable')
      return problem(502, error.code, error.message, requestId);

    return problem(502, 'query_failed', 'The data request failed.', requestId);
  } finally {
    if (abort) scoped.removeEventListener('abort', abort);
  }
}
