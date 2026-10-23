import { useSyncExternalStore } from 'react';

import { type DataAppRepairSession } from '../repair.ts';

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
  return (
    <section
      aria-label="App errors"
      style={{
        color: 'light-dark(#382b22, #f2e6da)',
        background: 'light-dark(#faf5ef, #2a2520)',
        border: '1px solid light-dark(#e5d8c9, #574839)',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 8,
        font: '13px/1.5 system-ui',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 16px',
      }}
    >
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <strong>
          {report.failures.length} app{' '}
          {report.failures.length === 1 ? 'error' : 'errors'}
        </strong>
        <output style={{ display: 'block' }}>
          {status === 'pending'
            ? 'Sending repair request…'
            : status === 'accepted'
              ? 'Repair request accepted.'
              : status === 'failed'
                ? 'Request could not be saved or delivered. Try manually.'
                : status === 'unsupported'
                  ? 'Copy the diagnostics below into your agent and ask it to fix all errors.'
                  : automaticRequests >= 3
                    ? 'Automatic repair limit reached. Request another repair manually.'
                    : 'Repair available.'}
        </output>
        <details>
          <summary>View diagnostics</summary>
          <ul>
            {report.failures.map((failure, i) => (
              <li key={i} style={{ overflowWrap: 'anywhere' }}>
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
      </div>
      <button
        type="button"
        disabled={status === 'pending' || status === 'unsupported'}
        onClick={() => void session.request()}
        style={{
          font: 'inherit',
          color: 'inherit',
          background: 'transparent',
          border: '1px solid currentColor',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'default',
        }}
      >
        Fix all errors
      </button>
    </section>
  );
}
