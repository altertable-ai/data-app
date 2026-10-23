import {
  createDataAppRepairSession,
  type DataAppRepairState,
} from '@altertable/data-app-embed';
import {
  DataAppBridge,
  DataAppRepairBanner,
} from '@altertable/data-app-embed/react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
const javascript = await fetch('/__test/diagnostics').then(response =>
  response.text()
);
const params = new URLSearchParams(location.search);
const state: DataAppRepairState = JSON.parse(
  sessionStorage.getItem('repair') ??
    '{"automaticRequests":0,"attemptedRevisions":[]}'
);
const requests: unknown[] = JSON.parse(
  sessionStorage.getItem('requests') ?? '[]'
);
function makeSession() {
  return createDataAppRepairSession({
    state,
    saveState(next) {
      sessionStorage.setItem('repair', JSON.stringify(next));
      if (params.has('save-failure')) throw new Error();
    },
    requestRepair: params.has('unsupported')
      ? undefined
      : async (report, context) => {
          requests.push({ report, context });
          sessionStorage.setItem('requests', JSON.stringify(requests));
          document.dispatchEvent(new Event('delivered'));
          await new Promise(resolve => setTimeout(resolve, 300));
          if (params.has('delivery-failure')) throw new Error();
        },
  });
}
function Host() {
  const [revision, setRevision] = useState(
    Number(sessionStorage.getItem('revision') ?? '1')
  );
  const [mount, setMount] = useState(0);
  const [session, setSession] = useState(makeSession);
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
      <output aria-label="Repair requests">{count}</output>
      <DataAppRepairBanner session={session} />
      <DataAppBridge
        key={`${revision}-${mount}`}
        source={{ type: 'bundle', javascript }}
        title="Diagnostic app"
        repair={{ session, revision: `${revision}` }}
        onMessage={async () => null}
        presentation={{ surface: 'embedded', theme, sizing: 'content' }}
        iframeProps={{ style: { width: '100%', minHeight: 200, border: 0 } }}
      />
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
