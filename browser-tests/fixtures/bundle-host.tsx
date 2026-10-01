import type { Theme } from '@altertable/data-app/appearance';
import { StrictMode, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import { createMessageRouter } from '@altertable/data-app/contract';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  type DataAppStatus,
  createNavigationHandler,
} from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/browser-tests/fixtures/bridge-routes';
const response = await fetch('/__test/bundle');
const javascript = await response.text();

function Host() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [parentPresentation, setParentPresentation] = useState(true);
  const [embedded, setEmbedded] = useState(true);
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, bumpAttempt] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [bundleVersion, bumpBundleVersion] = useReducer(value => value + 1, 1);
  const [broken, setBroken] = useState(
    new URLSearchParams(location.search).has('broken')
  );
  const urlMode = new URLSearchParams(location.search).has('url');
  const timeout = new URLSearchParams(location.search).has('timeout');
  // Extra attributes can still arrive from JavaScript callers or spread objects.
  const iframeProps = {
    hidden: status !== 'ready',
    className: 'app-frame',
    ...(new URLSearchParams(location.search).has('lazy')
      ? { loading: 'lazy' as const }
      : {}),
  };
  const forward = createHttpTransport();
  const router = createMessageRouter(bridgeRoutes, {
    'test:echo'({ period }) {
      return { period, version };
    },
    'data:query'({ operation, input }, { signal }) {
      return forward(operation, input, signal);
    },
    'navigation:update': createNavigationHandler(),
  });

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
                  ? 'throw new Error("Broken app")'
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
