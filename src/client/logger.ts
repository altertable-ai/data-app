import type { BridgeMessage } from '@/src/core/bridge';
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

/** Log only delivery metadata; payloads and session credentials stay private. */
export function logBridgeMessage(
  logger: DataAppLogger,
  message: BridgeMessage
) {
  if (message.type === 'runtime:log') return;
  logger.log(() => {
    const metadata: {
      type: BridgeMessage['type'];
      id?: string;
      route?: string;
      operation?: string;
    } = { type: message.type };
    if ('id' in message) metadata.id = message.id;
    if (message.type === 'bridge:request') {
      metadata.route = message.route;
      const payload = message.payload;
      if (
        message.route === 'data:query' &&
        payload &&
        typeof payload === 'object' &&
        'operation' in payload &&
        typeof payload.operation === 'string'
      )
        metadata.operation = payload.operation;
    }
    return ['Sending message to parent', metadata];
  });
}
