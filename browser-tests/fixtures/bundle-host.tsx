import type { Theme } from '@altertable/data-app/appearance';
import { StrictMode, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import {
  createMessageRouter,
  defineMessageRoute,
  sqlQueryRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  type DataAppStatus,
  createNavigationHandler,
  createSqlQueryHandler,
} from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/browser-tests/fixtures/bridge-routes';
const response = await fetch(
  location.pathname === '/starter-data-app'
    ? '/__test/starter-data-app'
    : '/__test/bundle'
);
const javascript = await response.text();

function Host() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [parentPresentation, setParentPresentation] = useState(true);
  const [embedded, setEmbedded] = useState(true);
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, bumpAttempt] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [bundleVersion, bumpBundleVersion] = useReducer(value => value + 1, 1);
  const [exportFailure, setExportFailure] = useState(
    new URLSearchParams(location.search).has('export-error')
  );
  const [broken, setBroken] = useState(
    new URLSearchParams(location.search).has('broken')
  );
  const starterPreview = location.pathname === '/starter-data-app';
  const urlMode = new URLSearchParams(location.search).has('url');
  const timeout = new URLSearchParams(location.search).has('timeout');
  // Extra attributes can still arrive from JavaScript callers or spread objects.
  const iframeProps = {
    hidden: status !== 'ready',
    allow: new URLSearchParams(location.search).has('no-fullscreen')
      ? "fullscreen 'none'"
      : 'fullscreen *',
    allowFullScreen: true,
    className: 'app-frame',
    ...(starterPreview
      ? {
          style: { display: 'block', width: '100%', height: '80vh', border: 0 },
        }
      : {}),
    ...(new URLSearchParams(location.search).has('lazy')
      ? { loading: 'lazy' as const }
      : {}),
  };
  const forward = createHttpTransport();
  const fileExportRoute = defineMessageRoute({
    input(value: unknown): { filename: string; blob: Blob } {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid data export.');
      const file = value as { filename: string; blob: Blob };
      if (typeof file.filename !== 'string' || !(file.blob instanceof Blob))
        throw new Error('Invalid data export.');
      return file;
    },
    output(value: unknown): null {
      if (value !== null) throw new Error('Invalid data export response.');
      return null;
    },
  });
  function downloadExport({
    filename,
    blob,
  }: {
    filename: string;
    blob: Blob;
  }) {
    if (exportFailure) throw new Error('Fixture export failure');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  }
  const router = createMessageRouter(
    {
      ...bridgeRoutes,
      'data:sql': sqlQueryRoute,
      'export:csv': fileExportRoute,
      'export:zip': fileExportRoute,
    },
    {
      'export:csv': downloadExport,
      'export:zip': downloadExport,
      'data:sql': createSqlQueryHandler(async () => ({
        async queryAll(statement, { limit, signal }) {
          const response = await fetch('/api/sql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ statement, limit }),
            signal,
          });
          if (!response.ok) throw new DataSourceError('unavailable');
          return response.json();
        },
      })),
      'test:echo'({ period }) {
        return { period, version };
      },
      'data:query'({ operation, input }, { signal }) {
        return forward(operation, input, signal);
      },
      'navigation:update': createNavigationHandler(),
    }
  );

  return (
    <>
      <button
        onClick={() => setTheme(value => (value === 'dark' ? 'light' : 'dark'))}
      >
        Change theme
      </button>
      <button onClick={() => setParentPresentation(value => !value)}>
        Toggle parent presentation
      </button>
      <button onClick={() => setEmbedded(value => !value)}>
        Change surface
      </button>
      {exportFailure && (
        <button onClick={() => setExportFailure(false)}>Allow exports</button>
      )}
      <button onClick={bumpVersion}>Change handler</button>
      <button onClick={bumpBundleVersion}>Change javascript</button>
      <button onClick={() => setBroken(false)}>Fix bundle</button>
      {status === 'failed' && (
        <div role="alert">
          Could not load the data app.{' '}
          <button onClick={bumpAttempt}>Retry</button>
        </div>
      )}
      <DataAppBridge
        key={attempt}
        onStatusChange={setStatus}
        iframeProps={iframeProps}
        title="Sandbox app"
        presentation={
          parentPresentation
            ? { surface: embedded ? 'embedded' : 'standalone', theme }
            : undefined
        }
        source={
          urlMode
            ? {
                type: 'url',
                url: `http://127.0.0.1:${Number(location.port) + 1}/report`,
              }
            : {
                type: 'bundle',
                bootstrapUrl: `/__test/${timeout ? 'silent' : 'runtime'}`,
                javascript: broken
                  ? new URLSearchParams(location.search).has('syntax')
                    ? 'const ='
                    : 'throw new Error("Broken app")'
                  : `${javascript}\ndocument.body.dataset.bundleVersion = "${bundleVersion}";`,
              }
        }
        startupTimeoutMs={timeout ? 200 : 10_000}
        onMessage={router.dispatch}
        onDiagnostic={event => {
          document.body.dataset.diagnostic = JSON.stringify(event);
        }}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Host />
  </StrictMode>
);
