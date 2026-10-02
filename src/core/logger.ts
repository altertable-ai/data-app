/** Host-owned log sink; compatible with console and frontend createLogger(). */
export type DataAppLogger = {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type LogEntry = {
  method: keyof DataAppLogger;
  args: unknown[];
};

export function isLogEntry(value: unknown): value is LogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as LogEntry;
  return (
    (entry.method === 'log' ||
      entry.method === 'info' ||
      entry.method === 'warn' ||
      entry.method === 'error') &&
    Array.isArray(entry.args) &&
    entry.args.length <= 128
  );
}
