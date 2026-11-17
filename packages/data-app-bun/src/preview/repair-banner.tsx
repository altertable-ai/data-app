import type { DataAppRepairSession } from '@altertable/data-app-embed';
import type { AppDiagnosticReport } from '@altertable/data-app/client';
import { useState, useSyncExternalStore } from 'react';

const styles = `
.atbl-repair-banner {
  display: grid; grid-template-columns: 18px minmax(0, 1fr) auto;
  grid-template-areas: "icon status actions"; align-items: start;
  gap: 4px 12px; padding: 12px 16px; box-sizing: border-box; width: 100%;
  color: light-dark(#252b32, #e6e9ed); background: light-dark(#fafbfc, #20252b);
  border-bottom: 1px solid light-dark(#e3e6e8, #3b4248);
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.atbl-repair-banner > svg { grid-area: icon; margin-top: 1px; }
.atbl-repair-banner-status { grid-area: status; min-width: 0; overflow-wrap: anywhere; }
.atbl-repair-banner-title { font-weight: 600; }
.atbl-repair-banner-description, .atbl-repair-banner-feedback { display: block; margin-top: 2px; color: light-dark(#606a76, #a6b0bc); font-size: 12px; }
.atbl-repair-banner button { grid-area: actions; min-height: 32px; padding: 7px 12px; border: 1px solid light-dark(#cdd3da, #515b66); border-radius: 7px; background: light-dark(#ffffff, #292f36); color: inherit; font: inherit; font-weight: 500; }
.atbl-repair-banner button:disabled { opacity: .6; }
.atbl-repair-banner button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.atbl-repair-banner-feedback:empty { display: none; }
.atbl-repair-banner-feedback, .atbl-repair-banner pre { grid-column: 2 / -1; min-width: 0; margin: 0; }
.atbl-repair-banner pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.5 ui-monospace, monospace; }
@media (max-width: 600px) { .atbl-repair-banner { grid-template-columns: 18px minmax(0, 1fr); grid-template-areas: "icon status" ". actions"; } }
`;

/** The preview cannot invoke an agent, so it offers the observed diagnostics to copy. */
export function RepairBanner({ session }: { session: DataAppRepairSession }) {
  const { report } = useSyncExternalStore(
    listener => session.subscribe(listener),
    session.snapshot,
    session.snapshot
  );
  const [clipboard, setClipboard] = useState<{
    report: AppDiagnosticReport;
    status: 'pending' | 'failed';
  }>();
  if (!report?.failures.length) return null;
  const current = clipboard?.report === report ? clipboard : undefined;

  async function copyDiagnostics(copied: AppDiagnosticReport) {
    setClipboard({ report: copied, status: 'pending' });
    try {
      await navigator.clipboard.writeText(JSON.stringify(copied, null, 2));
      setClipboard(undefined);
    } catch {
      setClipboard({ report: copied, status: 'failed' });
    }
  }

  return (
    <section className="atbl-repair-banner" aria-label="App errors">
      <style>{styles}</style>
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
      <p className="atbl-repair-banner-status">
        <span className="atbl-repair-banner-title">
          Something isn’t working
        </span>
        <span className="atbl-repair-banner-description">
          Copy the diagnostics into your agent to request a fix.
        </span>
      </p>
      <button
        type="button"
        disabled={current?.status === 'pending'}
        onClick={() => void copyDiagnostics(report)}
      >
        Copy diagnostics
      </button>
      <output
        className="atbl-repair-banner-feedback"
        aria-label="Diagnostic clipboard status"
        aria-live="polite"
      >
        {current &&
          (current.status === 'failed'
            ? 'Couldn’t copy. Select and copy the diagnostics below.'
            : 'Copying…')}
      </output>
      {current?.status === 'failed' && (
        <pre>{JSON.stringify(report, null, 2)}</pre>
      )}
    </section>
  );
}
