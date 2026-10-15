import { type BridgeDiagnostic } from '../core/bridge.ts';
import { type DataAppLogger, type LogEntry } from '../core/logger.ts';

/** Lazy arguments run in the iframe; only resolved values cross the bridge. */
export function createBridgeLogger(
  enabled: () => boolean,
  send: (entry: LogEntry) => void
): DataAppLogger {
  function resolve(args: unknown[]): unknown[] {
    if (args.length === 1 && typeof args[0] === 'function') {
      const value: unknown = args[0]();
      return Array.isArray(value) ? value : [value];
    }
    return args.map(arg => (typeof arg === 'function' ? arg() : arg));
  }

  function write(method: keyof DataAppLogger, args: unknown[]) {
    if (!enabled()) return;
    try {
      send({ method, args: resolve(args) });
    } catch {
      // Logging must not interrupt the app or recursively log delivery failures.
    }
  }

  return {
    log: (...args) => write('log', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
  };
}

const diagnosticLabels = {
  send: 'Sending message to parent',
  receive: 'Received message from parent',
  drop: 'Ignored message from parent',
} as const;

/** Log only delivery metadata; payloads and session credentials stay private. */
export function logBridgeDiagnostic(
  logger: DataAppLogger,
  { direction, ...metadata }: BridgeDiagnostic
) {
  if (metadata.type === 'runtime:log') return;
  logger.log(diagnosticLabels[direction], metadata);
}

/** Error instances do not survive every logger, so only their text crosses the bridge. */
export function describeError(error: unknown) {
  if (error instanceof Error)
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  return { message: String(error) };
}
