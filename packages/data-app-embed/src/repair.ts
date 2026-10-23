import { type AppDiagnosticReport } from '@altertable/data-app/client';
import { parseAppDiagnosticReport } from '@altertable/data-app/internal';

/** Host-retained state for one app repair session. Never reset for revisions, healthy reports or manual requests. */
export type DataAppRepairState = {
  automaticRequests: number;
  attemptedRevisions: string[];
};
export type DataAppRepairStatus =
  | 'idle'
  | 'pending'
  | 'accepted'
  | 'failed'
  | 'unsupported';
export type DataAppRepairOptions = {
  /** Restore before creating the viewer; retain outside its mount lifecycle. */
  state: DataAppRepairState;
  /** Persist the reservation before delivery. Rejection disables automatic delivery for this controller. */
  saveState: (state: DataAppRepairState) => void | Promise<void>;
  /** Acceptance means delivery only, not that an agent has started execution. */
  requestRepair?: (
    report: AppDiagnosticReport,
    context: { revision: string; automatic: boolean }
  ) => Promise<void>;
};

/** Share one controller across all buttons and retain it while viewers are recreated. */
export function createDataAppRepairSession(options: DataAppRepairOptions) {
  const listeners = new Set<() => void>();
  let state: DataAppRepairState = {
    automaticRequests: Math.min(
      3,
      Math.max(
        0,
        Number.isSafeInteger(options.state.automaticRequests)
          ? options.state.automaticRequests
          : 3
      )
    ),
    attemptedRevisions: [...options.state.attemptedRevisions],
  };
  let active: object | undefined;
  let revision = '';
  let report: AppDiagnosticReport | undefined;
  let status: DataAppRepairStatus = options.requestRepair
    ? 'idle'
    : 'unsupported';
  let savingFailed = false;
  let busy = false;
  let reportChanged: (() => void) | undefined;
  let snapshot: {
    report: AppDiagnosticReport | undefined;
    status: DataAppRepairStatus;
    automaticRequests: number;
  } = { report, status, automaticRequests: state.automaticRequests };
  function publish() {
    const resume = reportChanged;
    reportChanged = undefined;
    resume?.();
    snapshot = { report, status, automaticRequests: state.automaticRequests };
    for (const listener of listeners) listener();
  }
  async function request(automatic = false) {
    if (busy || !report?.failures.length || !options.requestRepair || !active)
      return;
    if (
      automatic &&
      (savingFailed ||
        state.automaticRequests >= 3 ||
        state.attemptedRevisions.includes(revision) ||
        report.pending > 0)
    )
      return;
    busy = true;
    status = 'pending';
    const owner = active;
    const currentRevision = revision;
    if (automatic)
      state = {
        automaticRequests: state.automaticRequests + 1,
        attemptedRevisions: [...state.attemptedRevisions, revision],
      };
    Object.assign(options.state, state);
    publish();
    try {
      // Save before sending. A failed delivery consumes its reservation and never retries automatically.
      if (automatic) {
        try {
          await options.saveState({
            ...state,
            attemptedRevisions: [...state.attemptedRevisions],
          });
        } catch (error) {
          savingFailed = true;
          throw error;
        }
      }
      // New work may have started while persistence was in flight. Keep this
      // reservation and serialization lock until the latest report settles.
      while (
        automatic &&
        owner === active &&
        report?.pending &&
        report.failures.length
      )
        await new Promise<void>(resolve => {
          reportChanged = resolve;
        });
      if (owner !== active) return;
      if (!report?.failures.length) {
        status = 'idle';
        return;
      }
      await options.requestRepair(report!, {
        revision: currentRevision,
        automatic,
      });
      if (owner === active) status = 'accepted';
    } catch {
      if (owner === active) status = 'failed';
    } finally {
      busy = false;
      if (owner !== active) status = 'idle';
      publish();
      if (owner !== active) void request(true);
    }
  }
  return {
    snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request: () => request(false),
    /** A bridge owns this lease. Reports from an old iframe/bridge are ignored. */
    connect(appRevision: string) {
      const owner = {};
      active = owner;
      revision = appRevision;
      report = undefined;
      status = busy
        ? 'pending'
        : savingFailed
          ? 'failed'
          : options.requestRepair
            ? 'idle'
            : 'unsupported';
      publish();
      return {
        report(value: unknown, automatic = true) {
          if (owner !== active) return;
          report = parseAppDiagnosticReport(value);
          publish();
          if (automatic) void request(true);
        },
        request() {
          return owner === active ? request(false) : Promise.resolve();
        },
        dispose() {
          if (owner === active) {
            active = undefined;
            report = undefined;
            publish();
          }
        },
      };
    },
  };
}
export type DataAppRepairSession = ReturnType<
  typeof createDataAppRepairSession
>;
