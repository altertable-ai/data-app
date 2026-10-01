import type { Theme } from '@altertable/data-app/appearance';
import { StrictMode, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppShell } from '@altertable/data-app/react/embed';
import { createMessageRouter } from '@altertable/data-app/contract';
import { createHttpTransport } from '@altertable/data-app/client';
import { createNavigationHandler } from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/browser-tests/fixtures/bridge-routes';
const response = await fetch('/__test/bundle');
const javascript = await response.text();

function Host() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [parentPresentation, setParentPresentation] = useState(true);
  const [embedded, setEmbedded] = useState(true);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [revision, bumpRevision] = useReducer(value => value + 1, 1);
  const [broken, setBroken] = useState(
    new URLSearchParams(location.search).has('broken')
  );
  const urlMode = new URLSearchParams(location.search).has('url');
  const timeout = new URLSearchParams(location.search).has('timeout');
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
      <button onClick={() => setEmbedded(value => !value)}>Change mount</button>
      <button onClick={bumpVersion}>Change handler</button>
      <button onClick={bumpRevision}>Change revision</button>
      <button onClick={() => setBroken(false)}>Fix bundle</button>
      <DataAppShell
        title="Sandbox app"
        presentation={
          parentPresentation
            ? { mount: embedded ? 'altertable' : 'custom', theme }
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
                  : javascript,
                revision: String(revision),
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
