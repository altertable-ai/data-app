import { useState, useSyncExternalStore } from 'react';

import {
  AUTOMATIC_REPAIR_LIMIT,
  type DataAppRepairSession,
  type DataAppRepairStatus,
} from '../repair.ts';

const messages: Record<
  DataAppRepairStatus | 'limited',
  { title: string; description: string }
> = {
  idle: {
    title: 'Some parts of this app failed',
    description:
      'Other content is still available. Send the diagnostics to your agent.',
  },
  pending: {
    title: 'Requesting a fix…',
    description: 'Sending the latest diagnostics to your agent.',
  },
  accepted: {
    title: 'Fix requested',
    description: 'Repair request accepted.',
  },
  failed: {
    title: 'Couldn’t request a fix',
    description: 'Request could not be saved or delivered. Try again manually.',
  },
  unsupported: {
    title: 'Some parts of this app failed',
    description:
      'Copy the diagnostics below into your agent and ask it to fix all errors.',
  },
  limited: {
    title: 'Some parts of this app failed',
    description: `Automatic repair limit reached after ${AUTOMATIC_REPAIR_LIMIT} attempts. You can request another fix.`,
  },
};

const styles = `
.atbl-repair-banner {
  display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center;
  gap: 10px 12px; padding: 12px 16px; box-sizing: border-box; width: 100%;
  color: light-dark(#654315, #f0d8b2); background: light-dark(#fff9ef, #2b251c);
  border-bottom: 1px solid light-dark(#eddbc0, #56452d);
  font: 13px/1.45 var(--atbl-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  -webkit-font-smoothing: antialiased;
}
.atbl-repair-banner > svg { align-self: start; margin-top: 3px; }
.atbl-repair-banner-copy { min-width: 0; overflow-wrap: anywhere; }
.atbl-repair-banner-title { font-weight: 600; }
.atbl-repair-banner-count { margin-inline-start: 8px; font-size: 12px; font-weight: 400; color: light-dark(#796343, #c2ae8f); white-space: nowrap; }
.atbl-repair-banner output { display: block; margin-top: 2px; color: light-dark(#796343, #c2ae8f); font-size: 12px; line-height: 1.5; }
.atbl-repair-banner button { flex: none; min-height: 32px; padding: 5px 12px; border: 1px solid light-dark(#d8c4a4, #776040); border-radius: 7px; background: light-dark(#fffdfa, #382f22); color: inherit; font: inherit; font-weight: 500; cursor: default; touch-action: manipulation; }
.atbl-repair-banner button:disabled { opacity: .6; }
.atbl-repair-banner button:active:not(:disabled) { transform: scale(.97); }
.atbl-repair-banner :is(button, summary):focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.atbl-repair-banner details { grid-column: 2 / -1; min-width: 0; color: light-dark(#796343, #c2ae8f); font-size: 12px; }
.atbl-repair-banner summary { width: fit-content; cursor: default; }
.atbl-repair-banner details[open] { padding-top: 10px; border-top: 1px solid light-dark(#eddbc0, #56452d); }
.atbl-repair-banner ul { padding-inline-start: 18px; margin: 10px 0; }
.atbl-repair-banner li + li { margin-top: 8px; }
.atbl-repair-banner code { font: 11px/1.5 var(--atbl-mono-font, ui-monospace, monospace); overflow-wrap: anywhere; }
.atbl-repair-banner p { margin: 10px 0 0; }
.atbl-repair-banner-copy-action { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.atbl-repair-banner-copy-action output { margin: 0; }
@media (hover: hover) { .atbl-repair-banner button:hover:not(:disabled) { background: light-dark(#f6eddd, #443825); } }
@media (pointer: coarse) { .atbl-repair-banner button { min-height: 44px; } }
@media (max-width: 420px) { .atbl-repair-banner { padding: 12px; gap: 8px 10px; align-items: start; } .atbl-repair-banner-count { display: block; margin-inline-start: 0; margin-top: 2px; } }
`;

/** Shared in-flow host banner. Mount above the app iframe with the same repair session. */
export function DataAppRepairBanner({
  session,
}: {
  session: DataAppRepairSession;
}) {
  const [copy, setCopy] = useState<{
    report: unknown;
    status: 'pending' | 'failed';
  }>();
  const { report, status, automaticRequests } = useSyncExternalStore(
    listener => session.subscribe(listener),
    session.snapshot,
    session.snapshot
  );

  if (!report?.failures.length) return null;
  const message =
    status === 'idle' && automaticRequests >= AUTOMATIC_REPAIR_LIMIT
      ? 'limited'
      : status;
  const { title, description } = messages[message];

  return (
    <>
      <style>{styles}</style>
      <section className="atbl-repair-banner" aria-label="App errors">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m10.3 3.9-8.1 14A2 2 0 0 0 3.9 21h16.2a2 2 0 0 0 1.7-3.1l-8.1-14a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4m0 4h.01" />
        </svg>
        <div
          className="atbl-repair-banner-copy"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="atbl-repair-banner-title">{title}</span>
          <span className="atbl-repair-banner-count">
            {report.failures.length} app{' '}
            {report.failures.length === 1 ? 'error' : 'errors'}
          </span>
          <output>{description}</output>
        </div>
        <button
          type="button"
          disabled={status === 'pending' || status === 'unsupported'}
          onClick={() => void session.request()}
        >
          Fix all errors
        </button>
        <details>
          <summary>View diagnostics</summary>
          <ul>
            {report.failures.map((failure, i) => (
              <li key={failure.id ?? i}>
                {failure.kind}: {failure.name} — {failure.message}
                {failure.source && (
                  <div>
                    <code>
                      {failure.source.file}:{failure.source.line}:
                      {failure.source.column}
                    </code>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {(report.pending > 0 || report.truncated > 0) && (
            <p>
              {report.pending > 0 && `${report.pending} checks unfinished.`}{' '}
              {report.truncated > 0 &&
                `${report.truncated} additional diagnostics omitted.`}
            </p>
          )}
          <div className="atbl-repair-banner-copy-action">
            <button
              type="button"
              disabled={copy?.status === 'pending'}
              onClick={() => {
                setCopy({ report, status: 'pending' });
                void Promise.resolve()
                  .then(() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(report, null, 2)
                    )
                  )
                  .then(
                    () => setCopy(undefined),
                    () => setCopy({ report, status: 'failed' })
                  );
              }}
            >
              Copy diagnostics
            </button>
            <output aria-label="Diagnostic clipboard status">
              {copy?.report === report &&
                (copy.status === 'failed'
                  ? 'Couldn’t copy. Select and copy the diagnostics below.'
                  : 'Copying…')}
            </output>
          </div>
          {copy?.report === report && copy.status === 'failed' && (
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(report, null, 2)}
            </pre>
          )}
        </details>
      </section>
    </>
  );
}
