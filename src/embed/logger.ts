import { isLogEntry, type DataAppLogger } from '@/src/core/logger';

export function receiveLog(logger: DataAppLogger, value: unknown) {
  if (!isLogEntry(value)) return;
  try {
    logger[value.method](...value.args);
  } catch {
    // A host logger failure must not break bridge delivery.
  }
}
