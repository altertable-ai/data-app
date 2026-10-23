import {
  appFailure,
  type AppFailure,
  type AppDiagnosticReport,
} from '../core/diagnostics.ts';
import { getDataAppTransport } from './iframe.ts';

const listeners = new Set<() => void>();
const failures = new Map<string, AppFailure>();
let pending = 0;
function publish() {
  for (const listener of listeners) listener();
}

/** Lightweight live observations only. No query values or result rows are retained. */
type Diagnostics = {
  snapshot: () => AppDiagnosticReport;
  subscribe: (listener: () => void) => () => void;
  record: (
    kind: AppFailure['kind'],
    name: string,
    error: unknown,
    identity?: string
  ) => void;
  clear: (kind: AppFailure['kind'], name: string, identity?: string) => void;
  begin: () => () => void;
};
function installed(): Diagnostics | undefined {
  const diagnostics =
    typeof window === 'undefined'
      ? undefined
      : getDataAppTransport()?.diagnostics;
  return diagnostics !== appDiagnostics ? diagnostics : undefined;
}
export const appDiagnostics: Diagnostics = {
  snapshot(): AppDiagnosticReport {
    if (installed()) return installed()!.snapshot();
    const observed: AppFailure[] = [];
    for (const failure of failures.values()) {
      observed.push(failure);
      if (observed.length === 30) break;
    }
    return {
      failures: observed,
      pending,
      truncated: Math.max(0, failures.size - 30),
      coverage: [
        'Live SDK operations and mounted widget renders only. Unvisited views, interactions and independent query validation are not covered.',
      ],
    };
  },
  subscribe(listener: () => void) {
    if (installed()) return installed()!.subscribe(listener);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  record(
    kind: AppFailure['kind'],
    name: string,
    error: unknown,
    identity?: string
  ) {
    if (installed()) return installed()!.record(kind, name, error, identity);
    const failure = appFailure(kind, name, error);
    if (identity) failure.id = identity;
    const key = `${kind}:${identity ?? name}`;
    // Retain active failures until cleared; bound messages and outgoing reports.
    failures.set(key, failure);
    publish();
  },
  clear(kind: AppFailure['kind'], name: string, identity?: string) {
    if (installed()) return installed()!.clear(kind, name, identity);
    if (failures.delete(`${kind}:${identity ?? name}`)) publish();
  },
  begin() {
    if (installed()) return installed()!.begin();
    pending++;
    publish();
    return () => {
      pending--;
      publish();
    };
  },
};
