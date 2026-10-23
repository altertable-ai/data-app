import {
  appFailure,
  parseAppDiagnosticReport,
  type AppDiagnosticReport,
  type AppFailure,
} from './core/diagnostics.ts';
import {
  type DataOperations,
  type Lakehouse,
  type OperationContext,
} from './core/operation-types.ts';
import { executeDataOperation } from './core/operation.ts';

/** A backend-owned check. It must use the caller's existing authorization boundary. */
export type AppValidationCheck = {
  kind: AppFailure['kind'];
  name: string;
  source?: AppFailure['source'];
  run: (signal: AbortSignal) => unknown;
};

/** Run independent declared checks without stopping at the first failure. Portable to Node; no browser or Bun dependencies. */
export async function validateDataApp({
  checks,
  signal = new AbortController().signal,
  timeoutMs = 30_000,
}: {
  checks: readonly AppValidationCheck[];
  signal?: AbortSignal;
  /** Bound unfinished checks, including checks that ignore cancellation. */
  timeoutMs?: number;
}): Promise<AppDiagnosticReport> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1)
    throw new Error('Expected a positive validation timeout.');
  const finished = checks.map(() => false);
  const controller = new AbortController();
  const checkSignal = AbortSignal.any([signal, controller.signal]);
  const timer = setTimeout(
    () =>
      controller.abort(new Error('Validation timed out; check unfinished.')),
    timeoutMs
  );
  let results: PromiseSettledResult<unknown>[];
  try {
    results = await Promise.allSettled(
      checks.map(
        (check, index) =>
          new Promise((resolve, reject) => {
            function abort() {
              reject(checkSignal.reason);
            }
            checkSignal.addEventListener('abort', abort, { once: true });
            void Promise.resolve()
              .then(() => {
                checkSignal.throwIfAborted();
                return check.run(checkSignal);
              })
              .then(
                value => {
                  finished[index] = true;
                  resolve(value);
                },
                error => {
                  finished[index] = true;
                  reject(error);
                }
              )
              .finally(() => {
                checkSignal.removeEventListener('abort', abort);
              });
            if (checkSignal.aborted) abort();
          })
      )
    );
  } finally {
    clearTimeout(timer);
  }
  const failures = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    const check = checks[index]!;
    const failure = appFailure(check.kind, check.name, result.reason);
    if (check.source) failure.source = { ...check.source };
    return [failure];
  });
  return parseAppDiagnosticReport({
    failures: failures.slice(0, 30),
    pending: finished.filter(done => !done).length,
    truncated: Math.max(0, failures.length - 30),
    coverage: [
      `${checks.length} declared checks observed: ${results.filter(result => result.status === 'fulfilled').length} passed, ${failures.length} failed or cancelled.`,
      'Only the declared checks were exercised. Unvisited views, queries and interactions are not covered.',
    ],
  });
}

/** Validate each operation's representative inputs independently. Supply separately declared query/render checks for additional coverage. */
export function operationValidationChecks({
  operations,
  lakehouse,
  queryParams,
}: {
  operations: DataOperations;
  lakehouse: Lakehouse;
  queryParams?: OperationContext['queryParams'];
}): AppValidationCheck[] {
  return Object.entries(operations).flatMap(([name, operation]) =>
    operation.checks.map((input, index) => ({
      kind: 'operation' as const,
      name: `${name} check ${index + 1}`,
      run: signal =>
        executeDataOperation(operation, input, {
          operationName: name,
          lakehouse,
          queryParams,
          signal,
          requestId: crypto.randomUUID(),
        }),
    }))
  );
}
