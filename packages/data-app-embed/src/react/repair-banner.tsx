import type { AppDiagnosticReport } from '@altertable/data-app/client';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  AUTOMATIC_REPAIR_LIMIT,
  type DataAppRepairSession,
} from '../repair.ts';

export type DataAppRepairProgress = {
  /**
   * Observed host activity. Use review when the agent stops with errors remaining.
   * Clear progress on a new request or after the updated revision's diagnostics settle.
   */
  phase: 'working' | 'building' | 'loading' | 'review';
  /** Optional agent activity, shown while working. */
  detail?: string;
  /** Fallback start time in milliseconds since the Unix epoch for activity that predates this session. */
  startedAt?: number;
};

type RepairPhase =
  | 'idle'
  | 'preparing'
  | DataAppRepairProgress['phase']
  | 'failed'
  | 'unsupported'
  | 'limited';

const messages: Record<RepairPhase, { title: string; description: string }> = {
  idle: {
    title: 'Something isn’t working',
    description: 'You can keep using the app or try a fix.',
  },
  preparing: {
    title: 'Preparing a fix',
    description: 'You can keep using the rest of the app.',
  },
  working: {
    title: 'Updating your app',
    description: 'Your agent is fixing the reported errors.',
  },
  building: {
    title: 'Updating your app',
    description: 'Building the updated app.',
  },
  loading: {
    title: 'Updating your app',
    description: 'Loading the updated app.',
  },
  review: {
    title: 'The app still needs attention',
    description: 'Your agent has stopped. You can request another fix.',
  },
  failed: {
    title: 'Couldn’t request a fix',
    description: 'The request could not be saved or delivered. Try again.',
  },
  unsupported: {
    title: 'Something isn’t working',
    description: 'Copy the diagnostics into your agent to request a fix.',
  },
  limited: {
    title: 'Automatic fixes are paused',
    description: `${AUTOMATIC_REPAIR_LIMIT} automatic requests have been used. You can request another fix.`,
  },
};

const styles = `
.atbl-repair-banner {
  display: grid; grid-template-columns: 18px minmax(0, 1fr) auto;
  grid-template-areas: "icon status actions"; align-items: start;
  gap: 4px 12px; flex-shrink: 0; padding: 12px 16px; box-sizing: border-box; width: 100%;
  color: light-dark(#252b32, #e6e9ed); background: light-dark(#fafbfc, #20252b);
  border-bottom: 1px solid light-dark(#e3e6e8, #3b4248);
  font: 13px/1.45 var(--atbl-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  -webkit-font-smoothing: antialiased;
}
.atbl-repair-banner > svg { grid-area: icon; margin-top: 1px; }
.atbl-repair-banner-actions { grid-area: actions; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px 12px; }
.atbl-repair-banner-status { grid-area: status; min-width: 0; overflow-wrap: anywhere; }
.atbl-repair-banner-title { font-weight: 600; }
.atbl-repair-banner-elapsed { margin-inline-start: 8px; font-size: 12px; font-weight: 400; color: light-dark(#606a76, #a6b0bc); white-space: nowrap; }
.atbl-repair-banner-feedback, .atbl-repair-banner-description { display: block; margin-top: 2px; color: light-dark(#606a76, #a6b0bc); font-size: 12px; line-height: 1.5; }
.atbl-repair-banner button { display: inline-flex; align-items: center; justify-content: center; flex: none; min-height: 32px; padding: 7px 12px; border: 1px solid light-dark(#cdd3da, #515b66); border-radius: 7px; background: light-dark(#ffffff, #292f36); color: inherit; font: inherit; line-height: 1; font-weight: 500; cursor: default; touch-action: manipulation; }
.atbl-repair-banner button > span { position: relative; top: -.5px; }
.atbl-repair-banner .atbl-repair-banner-copy-button { border-color: transparent; background: transparent; }
.atbl-repair-banner button:disabled { opacity: .6; }
.atbl-repair-banner button:active:not(:disabled) { transform: scale(.97); }
.atbl-repair-banner button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.atbl-repair-banner-feedback:empty { display: none; }
.atbl-repair-banner-feedback { grid-column: 2 / -1; min-width: 0; }
.atbl-repair-banner-fallback { grid-column: 2 / -1; min-width: 0; margin: 0; }
.atbl-repair-banner pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.5 var(--atbl-mono-font, ui-monospace, monospace); }
.atbl-repair-banner-spinner { animation: atbl-repair-spin 1s linear infinite; }
@keyframes atbl-repair-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .atbl-repair-banner-spinner { animation: none; } .atbl-repair-banner button:active:not(:disabled) { transform: none; } }
@media (hover: hover) { .atbl-repair-banner button:hover:not(:disabled) { background: light-dark(#f0f2f5, #343d47); } }
@media (pointer: coarse) { .atbl-repair-banner button { min-height: 44px; } }
@media (max-width: 600px) { .atbl-repair-banner { grid-template-columns: 18px minmax(0, 1fr); grid-template-areas: "icon status" ". actions"; } .atbl-repair-banner-actions { padding-top: 4px; } }
@media (max-width: 420px) { .atbl-repair-banner { padding: 12px; gap: 4px 10px; align-items: start; } }
`;

/** Shared in-flow host banner. Mount above the app iframe with the same repair session. */
export function DataAppRepairBanner({
  session,
  progress,
}: {
  session: DataAppRepairSession;
  /** Optional observed host activity; request acceptance alone does not mean an agent is working. */
  progress?: DataAppRepairProgress;
}) {
  const [clipboard, setClipboard] = useState<{
    report: AppDiagnosticReport;
    status: 'pending' | 'failed';
  }>();
  const {
    report,
    status,
    automaticRequests,
    startedAt: requestStartedAt,
  } = useSyncExternalStore(
    listener => session.subscribe(listener),
    session.snapshot,
    session.snapshot
  );

  const [lastFailure, setLastFailure] = useState({ session, report });
  if (
    lastFailure.session !== session ||
    (report?.failures.length && report !== lastFailure.report)
  ) {
    setLastFailure({ session, report });
  }
  let phase: RepairPhase;
  if (status === 'failed' || status === 'unsupported') {
    phase = status;
  } else if (status === 'pending') {
    phase = 'preparing';
  } else if (progress) {
    phase = progress.phase;
  } else if (status === 'accepted') {
    phase = 'preparing';
  } else if (automaticRequests >= AUTOMATIC_REPAIR_LIMIT) {
    phase = 'limited';
  } else {
    phase = 'idle';
  }
  const inProgress =
    phase === 'preparing' ||
    phase === 'working' ||
    phase === 'building' ||
    phase === 'loading';
  const startedAt = inProgress
    ? (requestStartedAt ?? progress?.startedAt)
    : undefined;
  const hasActiveProgress =
    progress !== undefined && progress.phase !== 'review';
  const visibleReport = report?.failures.length
    ? report
    : hasActiveProgress && lastFailure.session === session
      ? lastFailure.report
      : undefined;
  if (!visibleReport?.failures.length && !hasActiveProgress) return null;
  const feedback = messages[phase];
  const clipboardFailed =
    clipboard?.status === 'failed' && clipboard.report === visibleReport;

  async function copyDiagnostics(report: AppDiagnosticReport) {
    setClipboard({ report, status: 'pending' });
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setClipboard(undefined);
    } catch {
      setClipboard({ report, status: 'failed' });
    }
  }

  return (
    <>
      <style>{styles}</style>
      <section className="atbl-repair-banner" aria-label="App errors">
        <svg
          className={inProgress ? 'atbl-repair-banner-spinner' : undefined}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          role={inProgress ? 'progressbar' : undefined}
          aria-label={inProgress ? 'Repair in progress' : undefined}
          aria-hidden={inProgress ? undefined : true}
        >
          {inProgress ? (
            <path d="M12 3a9 9 0 1 1-9 9" />
          ) : (
            <>
              <path d="m10.3 3.9-8.1 14A2 2 0 0 0 3.9 21h16.2a2 2 0 0 0 1.7-3.1l-8.1-14a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4m0 4h.01" />
            </>
          )}
        </svg>
        <output
          className="atbl-repair-banner-status"
          aria-label="Repair request status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="atbl-repair-banner-title">{feedback.title}</span>
          {startedAt !== undefined && (
            <ElapsedTime key={startedAt} startedAt={startedAt} />
          )}
          <span className="atbl-repair-banner-description">
            {phase === 'working'
              ? progress?.detail || feedback.description
              : feedback.description}
          </span>
        </output>
        <div className="atbl-repair-banner-actions">
          {visibleReport && (
            <button
              type="button"
              className="atbl-repair-banner-copy-button"
              disabled={clipboard?.status === 'pending'}
              onClick={() => void copyDiagnostics(visibleReport)}
            >
              <span>Copy diagnostics</span>
            </button>
          )}
          <button
            type="button"
            disabled={
              inProgress || phase === 'unsupported' || !report?.failures.length
            }
            onClick={() => void session.requestRepair()}
          >
            <span>Fix errors</span>
          </button>
        </div>
        <output
          className="atbl-repair-banner-feedback"
          aria-label="Diagnostic clipboard status"
          aria-live="polite"
        >
          {clipboard &&
            clipboard.report === visibleReport &&
            (clipboard.status === 'failed'
              ? 'Couldn’t copy. Select and copy the diagnostics below.'
              : 'Copying…')}
        </output>
        {clipboardFailed && (
          <pre className="atbl-repair-banner-fallback">
            {JSON.stringify(visibleReport, null, 2)}
          </pre>
        )}
      </section>
    </>
  );
}

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.floor((now - startedAt) / 1000);
  if (seconds < 1) return null;
  return (
    <span className="atbl-repair-banner-elapsed" aria-live="off">
      {seconds}s elapsed
    </span>
  );
}
