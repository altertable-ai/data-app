import {
  createNavigationHandler,
  createSqlQueryHandler,
  type DataAppStatus,
} from '@altertable/data-app-embed';
import { DataAppBridge } from '@altertable/data-app-embed/react';
import {
  DataSourceError,
  createMessageRouter,
  defineMessageRoute,
  navigationUpdateRoute,
  sqlQueryRoute,
} from '@altertable/data-app/contract';
import { downloadBlob } from '@altertable/data-app/internal';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const fileExportRoute = defineMessageRoute({
  input(value: unknown): { filename: string; blob: Blob } {
    const file = value as { filename?: unknown; blob?: unknown } | null;
    if (typeof file?.filename !== 'string' || !(file.blob instanceof Blob))
      throw new Error('Invalid data export.');
    return { filename: file.filename, blob: file.blob };
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid data export response.');
    return null;
  },
});

function download({ filename, blob }: { filename: string; blob: Blob }) {
  downloadBlob({ filename, blob });
  return null;
}

const router = createMessageRouter(
  {
    'data:sql': sqlQueryRoute,
    'navigation:update': navigationUpdateRoute,
    'export:csv': fileExportRoute,
    'export:zip': fileExportRoute,
  },
  {
    'data:sql': createSqlQueryHandler(async () => ({
      async queryAll(statement, { limit, signal, params }) {
        const response = await fetch('/api/sql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ statement, limit, params }),
          signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new DataSourceError(
            body.reason ?? 'unavailable',
            response.status
          );
        return body;
      },
    })),
    'navigation:update': createNavigationHandler(),
    'export:csv': download,
    'export:zip': download,
  }
);

type Bundle = { javascript: string } | { error: string };

async function loadBundle(): Promise<Bundle> {
  const response = await fetch('/bundle.js', { cache: 'no-store' });
  const text = await response.text();
  return response.ok ? { javascript: text } : { error: text };
}

function DevFileHost() {
  const [bundle, setBundle] = useState<Bundle>();
  const [status, setStatus] = useState<DataAppStatus>('connecting');

  useEffect(() => {
    let active = true;
    let session: string | undefined;
    let refreshId = 0;
    async function refresh() {
      const id = ++refreshId;
      let next: Bundle;
      try {
        next = await loadBundle();
      } catch (error) {
        next = { error: `Could not load the app bundle: ${String(error)}` };
      }
      if (active && id === refreshId) {
        setBundle(next);
      }
    }
    const events = new EventSource('/reload');
    // A new session means the dev server restarted, possibly with a new host page.
    events.addEventListener('ready', event => {
      if (session && session !== event.data) {
        location.reload();
        return;
      }
      session = event.data;
      void refresh();
    });
    events.onmessage = () => void refresh();
    void refresh();
    return () => {
      active = false;
      events.close();
    };
  }, []);

  if (!bundle) return null;
  if ('error' in bundle)
    return <pre className="dev-file-error">{bundle.error}</pre>;
  return (
    <>
      {status === 'failed' && (
        <p className="dev-file-error dev-file-runtime-error" role="alert">
          The data app failed to start. Check the browser console.
        </p>
      )}
      <DataAppBridge
        source={{ type: 'bundle', javascript: bundle.javascript }}
        title="Data app"
        onMessage={router.dispatch}
        onStatusChange={setStatus}
        iframeProps={{ className: 'dev-file-frame' }}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevFileHost />
  </StrictMode>
);
