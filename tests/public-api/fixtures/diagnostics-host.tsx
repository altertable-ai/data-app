import {
  createDataAppRepairSession,
  type DataAppRepairState,
} from '@altertable/data-app-embed';
import {
  DataAppBridge,
  DataAppRepairBanner,
  type DataAppRepairProgress,
} from '@altertable/data-app-embed/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
const params = new URLSearchParams(location.search);
const javascript = await fetch('/__test/diagnostics').then(response =>
  response.text()
);
const state: DataAppRepairState = JSON.parse(
  sessionStorage.getItem('repair') ??
    '{"automaticRequests":0,"attemptedRevisions":[]}'
);
if (params.has('automatic-limit')) state.automaticRequests = 3;
const requests: unknown[] = JSON.parse(
  sessionStorage.getItem('requests') ?? '[]'
);
let completeDelivery: ((result: 'accepted' | 'failed') => void) | undefined;
function makeSession() {
  return createDataAppRepairSession({
    state,
    onStateChange(next) {
      sessionStorage.setItem('repair', JSON.stringify(next));
      if (params.has('save-failure')) throw new Error();
    },
    onRepairRequest: params.has('unsupported')
      ? undefined
      : async (report, context) => {
          requests.push({ report, context });
          sessionStorage.setItem('requests', JSON.stringify(requests));
          document.dispatchEvent(new Event('delivered'));
          if (params.has('controlled-delivery')) {
            await new Promise<void>((resolve, reject) => {
              completeDelivery = result => {
                completeDelivery = undefined;
                if (result === 'failed') reject(new Error('Delivery failed'));
                else resolve();
              };
            });
          } else await new Promise(resolve => setTimeout(resolve, 300));
          if (params.has('delivery-failure')) throw new Error();
        },
  });
}
function Host() {
  const [revision, setRevision] = useState(
    Number(sessionStorage.getItem('revision') ?? '1')
  );
  const [progress, setProgress] = useState<DataAppRepairProgress>();
  const [mount, setMount] = useState(0);
  const [session, setSession] = useState(makeSession);
  const diagnostics = useSyncExternalStore(
    listener => session.subscribe(listener),
    session.snapshot,
    session.snapshot
  );
  const [count, setCount] = useState(requests.length);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    params.has('dark') ? 'dark' : 'light'
  );
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    function listener() {
      setCount(requests.length);
      // A new host request replaces activity from the previous attempt.
      setProgress(undefined);
    }
    document.addEventListener('delivered', listener);
    return () => document.removeEventListener('delivered', listener);
  }, []);
  return (
    <div style={{ padding: 12, fontFamily: 'system-ui' }}>
      <button
        onClick={() => {
          const next = revision + 1;
          sessionStorage.setItem('revision', `${next}`);
          setRevision(next);
        }}
      >
        Next revision
      </button>
      <button
        onClick={() => {
          setMount(mount + 1);
          setSession(makeSession());
        }}
      >
        Recreate viewer
      </button>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Change theme
      </button>
      {params.has('progress') && (
        <>
          {(['working', 'building', 'loading', 'review'] as const).map(
            phase => (
              <button
                key={phase}
                onClick={() =>
                  setProgress({
                    phase,
                    detail:
                      'Checking the revenue calculation and fixing the reported errors.',
                  })
                }
              >
                {phase}
              </button>
            )
          )}
          <button
            onClick={() => {
              setProgress(undefined);
              setRevision(revision + 1);
            }}
          >
            Finish update
          </button>
        </>
      )}
      {params.has('controlled-delivery') && (
        <>
          <button onClick={() => completeDelivery?.('accepted')}>
            Accept repair request
          </button>
          <button onClick={() => completeDelivery?.('failed')}>
            Reject repair request
          </button>
        </>
      )}
      <output aria-label="Repair delivery status">{diagnostics.status}</output>
      <output aria-label="Repair requests">{count}</output>
      <output aria-label="Observed app errors">
        {diagnostics.report?.failures.length ?? 0}
      </output>
      <div
        className="diagnostics-preview"
        style={{
          marginTop: 12,
          border: '1px solid light-dark(#e3e6e8, #3b4248)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <DataAppRepairBanner session={session} progress={progress} />
        <DataAppBridge
          key={`${revision}-${mount}`}
          source={{ type: 'bundle', javascript }}
          title="Diagnostic app"
          repair={{ session, revision: `${revision}` }}
          onMessage={async () => null}
          presentation={{ surface: 'embedded', theme, sizing: 'content' }}
          iframeProps={{
            style: {
              width: '100%',
              minHeight: 200,
              border: 0,
              display: 'block',
            },
          }}
        />
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
