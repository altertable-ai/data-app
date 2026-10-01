import {
  DataSourceError,
  type DataOperations,
  type DisclosedQuery,
  type Lakehouse,
} from '@/src/core/contract';

/** Validate and execute an input using a local or remote lakehouse. Browser policies are not authorization. */
export async function executeDataOperation(
  operation: DataOperations[string],
  value: unknown,
  {
    lakehouse,
    signal: requestSignal,
    canDiscloseSql = false,
    requestId = crypto.randomUUID(),
    name = 'operation',
  }: {
    lakehouse: Lakehouse;
    signal: AbortSignal;
    canDiscloseSql?: boolean;
    requestId?: string;
    name?: string;
  }
) {
  requestSignal.throwIfAborted();
  let input: unknown;
  try {
    input = operation.input(value);
  } catch {
    throw new OperationInputError();
  }

  const timeout = AbortSignal.timeout(operation.policy.maxDurationMs);
  const signal = AbortSignal.any([requestSignal, timeout]);
  const queryIds: string[] = [];
  const queries: DisclosedQuery[] = [];
  const boundedLakehouse: Lakehouse = {
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
      let result;
      try {
        result = await lakehouse.queryAll(statement, {
          limit,
          signal: AbortSignal.any([signal, options.signal]),
        });
      } catch (error) {
        if (error instanceof DataSourceError) error.queryName = query.name;
        throw error;
      }
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
    signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      function rejectAborted() {
        reject(new Error('Request aborted.'));
      }
      abort = rejectAborted;
      signal.addEventListener('abort', rejectAborted, { once: true });
      if (signal.aborted) rejectAborted();
    });
    const data = operation.output(
      await Promise.race([
        cancelled,
        Promise.resolve().then(() => {
          signal.throwIfAborted();

          return operation.run(
            { lakehouse: boundedLakehouse, signal },
            input as never
          );
        }),
      ])
    );
    const result = {
      data,
      requestId,
      queriedAt: new Date().toISOString(),
      queryIds,
      ...(operation.policy.exposeSql && canDiscloseSql ? { queries } : {}),
    };
    const body = JSON.stringify(result);
    if (
      new TextEncoder().encode(body).byteLength >
      (operation.policy.maxResponseBytes ?? 1_000_000)
    ) {
      throw new Error('Response exceeds byte limit.');
    }

    return { result, serializedBody: body };
  } catch (error) {
    if (signal.aborted && !(error instanceof DataSourceError))
      throw new OperationTimeoutError();
    throw error;
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
  }
}

class OperationTimeoutError extends Error {}

class OperationInputError extends Error {}

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

export function dataOperationFailure(error: unknown, aborted = false) {
  if (error instanceof OperationInputError)
    return {
      status: 400,
      code: 'invalid_input',
      message: "Check this operation's inputs.",
    };
  if (error instanceof DataSourceError)
    return {
      status: error.reason === 'rate_limited' ? 429 : 502,
      code: `source_${error.reason}`,
      message: sourceErrorMessages[error.reason],
    };
  const timedOut = aborted || error instanceof OperationTimeoutError;
  return {
    status: timedOut ? 504 : 502,
    code: timedOut ? 'timeout' : 'query_failed',
    message: timedOut
      ? 'The data request timed out.'
      : 'The data request failed.',
  };
}
