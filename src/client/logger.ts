import { type DataAppLogger, type LogEntry } from '@/src/core/logger';

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
      const resolved = resolve(args);
      if (resolved.length > 128) return;
      send({ method, args: resolved });
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
