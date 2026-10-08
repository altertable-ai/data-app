import { StrictMode, useReducer, useState, type ComponentRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createMessageRouter } from '@altertable/data-app/contract';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  createNavigationHandler,
  type DataAppLogger,
} from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import '@/dev/fixtures/dev-reload';

function trackNavigation(
  input: Parameters<ReturnType<typeof createNavigationHandler>>[0]
) {
  document.body.dataset.navigationRequests = String(
    Number(document.body.dataset.navigationRequests ?? 0) + 1
  );

  return createNavigationHandler()(input);
}

function Host() {
  const [iframe, setIframe] = useState<ComponentRef<'iframe'> | null>(null);
  const [generation, bumpGeneration] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [connected, setConnected] = useState(true);
  const [logging, setLogging] = useState(true);
  const [logs, setLogs] = useState<unknown[][]>([]);
  const [diagnostics, setDiagnostics] = useState<unknown[][]>([]);
  function record(level: string, args: unknown[]) {
    if (args[0] === 'Sending message to parent') {
      setDiagnostics(previous => [...previous, [version, level, ...args]]);
      return;
    }
    setLogs(previous => [...previous, [version, level, ...args]]);
  }
  const logger: DataAppLogger = {
    log: (...args) => record('log', args),
    info: (...args) => record('info', args),
    warn: (...args) => record('warn', args),
    error: (...args) => record('error', args),
  };
  const forward = createHttpTransport();
  const router = createMessageRouter(bridgeRoutes, {
    'data:query'({ operation, input }, { signal }) {
      return forward(operation, input, signal);
    },
    'navigation:update': trackNavigation,
    'test:echo'({ period }) {
      return { period, version };
    },
  });

  return (
    <>
      <button onClick={bumpGeneration}>Replace iframe</button>
      <button onClick={bumpVersion}>Change handler</button>
      <button onClick={() => setConnected(!connected)}>Toggle bridge</button>
      <button onClick={() => setLogging(!logging)}>Toggle logging</button>
      <output id="logs">{JSON.stringify(logs)}</output>
      <output id="diagnostics">{JSON.stringify(diagnostics)}</output>
      {connected && (
        <DataAppBridge
          iframe={iframe}
          connection={{ type: 'origin', origin: window.location.origin }}
          onMessage={router.dispatch}
          logger={logging ? logger : undefined}
        />
      )}
      <iframe
        key={generation}
        ref={setIframe}
        title="Embedded test app"
        src="/bridge-frame"
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Host />
  </StrictMode>
);
