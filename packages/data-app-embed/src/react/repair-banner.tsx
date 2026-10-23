import { useSyncExternalStore } from 'react';

import { type DataAppRepairSession } from '../repair.ts';

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
  const { report, status, automaticRequests } = useSyncExternalStore(
    listener => session.subscribe(listener),
    session.snapshot,
    session.snapshot
  );
  if (!report?.failures.length) return null;
  const title =
    status === 'pending'
      ? 'Requesting a fix…'
      : status === 'accepted'
        ? 'Fix requested'
        : status === 'failed'
          ? 'Couldn’t request a fix'
          : 'Some parts of this app failed';
  const description =
    status === 'pending'
      ? 'Sending the latest diagnostics to your agent.'
      : status === 'accepted'
        ? 'Repair request accepted.'
        : status === 'failed'
          ? 'Request could not be saved or delivered. Try again manually.'
          : status === 'unsupported'
            ? 'Copy the diagnostics below into your agent and ask it to fix all errors.'
            : automaticRequests >= 3
              ? 'Automatic repair limit reached after 3 attempts. You can request another fix.'
              : 'Other content is still available. Send the diagnostics to your agent.';
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
          <p>
            {report.coverage.join(' ')}{' '}
            {report.pending > 0 && `${report.pending} checks unfinished.`}{' '}
            {report.truncated > 0 &&
              `${report.truncated} additional diagnostics omitted.`}
          </p>
        </details>
      </section>
    </>
  );
}
