import { DataSourceError } from '@/src/core/contract';
import type {
  DataOperations,
  DisclosedQuery,
  Lakehouse,
  OperationContext,
  DataQueryBody,
} from '@/src/core/operation-types';

type Operation = DataOperations[string];
type OperationExecutionOptions = {
  operationName: string;
  lakehouse: Lakehouse;
  signal: AbortSignal;
  /** Include query evidence in the response; this does not keep browser-owned SQL private. */
  includeSql: boolean;
  requestId: string;
};

/** Shared operation execution. Adapters own authorization, delivery, and public errors. */
export async function executeDataOperation(
  operation: Operation,
  value: unknown,
  {
    operationName,
    lakehouse,
    signal: requestSignal,
    includeSql,
    requestId,
  }: OperationExecutionOptions
) {
  requestSignal.throwIfAborted();
  let input: unknown;
  try {
    input = operation.input(value);
  } catch {
    throw new OperationInputError();
  }

  const signal = AbortSignal.any([
    requestSignal,
    AbortSignal.timeout(operation.policy.maxDurationMs),
  ]);
  const execution = createOperationLakehouse(
    operation,
    lakehouse,
    signal,
    operationName
  );
  try {
    const output = await runOperation(operation, input, {
      lakehouse: execution.lakehouse,
      signal,
    });
    const body: DataQueryBody<unknown> = {
      data: operation.output(output),
      requestId,
      queriedAt: new Date().toISOString(),
      queryIds: execution.queryIds,
      ...(operation.policy.exposeSql && includeSql
        ? { queries: execution.queries }
        : {}),
    };
    const serializedBody = JSON.stringify(body);
    const responseBytes = new TextEncoder().encode(serializedBody).byteLength;
    if (responseBytes > (operation.policy.maxResponseBytes ?? 1_000_000))
      throw new Error('Response exceeds byte limit.');

    return { body, serializedBody };
  } catch (error) {
    if (signal.aborted && !(error instanceof DataSourceError))
      throw new OperationTimeoutError();
    throw error;
  }
}

/** Query evidence follows statement invocation order; query IDs retain completion order. */
function createOperationLakehouse(
  operation: Operation,
  source: Lakehouse,
  signal: AbortSignal,
  operationName: string
) {
  const queryIds: string[] = [];
  const queries: DisclosedQuery[] = [];
  const lakehouse: Lakehouse = {
    async queryById(name, values, options) {
      if (!source.queryById)
        throw new Error('A registered query bridge is required.');
      if (!Number.isSafeInteger(options.limit) || options.limit < 1)
        throw new Error('Query needs a positive row limit.');
      if (
        !operation.queryNames ||
        !Object.values(operation.queryNames).includes(name)
      )
        throw new Error('Unknown registered query name.');
      const limit = Math.min(options.limit, operation.policy.maxQueryRows);
      const result = await source.queryById(name, values, {
        limit,
        signal: AbortSignal.any([signal, options.signal]),
      });
      if (result.rows.length > limit)
        throw new Error('Result exceeds row limit.');
      if (result.queryId) queryIds.push(result.queryId);
      return result;
    },
    async queryAll(statement, options) {
      if (!Number.isInteger(options.limit) || options.limit < 1)
        throw new Error('Query needs a positive row limit.');
      if (
        operation.queryNames &&
        !Object.values(operation.queryNames).includes(options.name ?? '')
      )
        throw new Error(
          `Query name is not registered for operation ${operationName}.`
        );
      const query: DisclosedQuery = {
        name: options.name ?? `Query ${queries.length + 1}`,
        statement,
      };
      queries.push(query);
      const limit = Math.min(options.limit, operation.policy.maxQueryRows);
      let result;
      try {
        result = await source.queryAll(statement, {
          limit,
          name: options.name,
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

  return { lakehouse, queries, queryIds };
}

/** Settle cancellation even when operation code or its lakehouse ignores the signal. */
async function runOperation(
  operation: Operation,
  input: unknown,
  { lakehouse, signal }: OperationContext
) {
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

    return await Promise.race([
      cancelled,
      Promise.resolve().then(() => {
        signal.throwIfAborted();

        return operation.run({ lakehouse, signal }, input as never);
      }),
    ]);
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
  }
}

class OperationTimeoutError extends Error {}

class OperationInputError extends Error {}

const sourceErrorMessages = {
  unauthorized:
    'This app could not authenticate its data connection. Contact the app owner.',
  forbidden:
    'This app cannot access the requested data. Contact the app owner.',
  rate_limited: 'The lakehouse is busy. Wait a moment and retry.',
  query_rejected:
    "A lakehouse query was rejected. Check the app's data operation.",
  unavailable: 'The lakehouse is unavailable. Check the connection and retry.',
};

export function toDataOperationFailure(error: unknown, aborted = false) {
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
