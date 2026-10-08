import { useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  createMessageRouter,
  defineMessageRoute,
  sqlQueryRoute,
  registeredQueryRoute,
  navigationUpdateRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import {
  createNavigationHandler,
  createSqlQueryHandler,
  type DataAppStatus,
} from '@altertable/data-app/embed';
import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';

const { frameURL } = await fetch('/__test/config').then(response =>
  response.json()
);
const starter = location.pathname === '/starter-data-app';
const javascript = await fetch(
  starter ? '/__test/starter-data-app' : '/__test/bundle'
).then(response => response.text());
const params = new URLSearchParams(location.search);
const fileRoute = defineMessageRoute({
  input(value: unknown) {
    const file = value as { filename: string; blob: Blob };
    if (typeof file?.filename !== 'string' || !(file.blob instanceof Blob))
      throw new Error('Invalid export');
    return file;
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid export response');
    return null;
  },
});

function Host() {
  const [echoRequests, setEchoRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [cancelledRequests, setCancelledRequests] = useState(0);

  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, retry] = useReducer(value => value + 1, 0);
  const [version, changeHandler] = useReducer(value => value + 1, 1);
  const [broken, setBroken] = useState(params.has('broken'));
  const [exportFailure, setExportFailure] = useState(
    params.has('export-error')
  );
  const forward = createHttpTransport();
  function download(file: { filename: string; blob: Blob }) {
    if (exportFailure) throw new Error('Export unavailable');
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  }
  const appRouter = createMessageRouter(
    {
      ...bridgeRoutes,
      'data:sql': sqlQueryRoute,
      'export:csv': fileRoute,
      'export:zip': fileRoute,
    },
    {
      'test:wait'(_input, { signal }) {
        setPendingRequests(value => value + 1);
        return new Promise<number>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              setPendingRequests(value => value - 1);
              setCancelledRequests(value => value + 1);
              reject(signal.reason);
            },
            { once: true }
          );
        });
      },
      'test:echo'({ period }) {
        setEchoRequests(value => value + 1);
        return { period, version };
      },
      'data:query': ({ operation, input }, { signal }) =>
        forward(operation, input, signal),
      'navigation:update': createNavigationHandler(),
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
      'export:csv': download,
      'export:zip': download,
    }
  );
  // The hosted starter sends registered query IDs and values, never SQL.
  const starterRouter = createMessageRouter(
    {
      'data:query': registeredQueryRoute,
      'navigation:update': navigationUpdateRoute,
      'export:csv': fileRoute,
      'export:zip': fileRoute,
    },
    {
      async 'data:query'(query, { signal }) {
        const response = await fetch('/api/registered-query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(query),
          signal,
        });
        if (!response.ok) throw new DataSourceError('unavailable');
        return response.json();
      },
      'navigation:update': createNavigationHandler(),
      'export:csv': download,
      'export:zip': download,
    }
  );
  const router = starter ? starterRouter : appRouter;
  return (
    <>
      <output aria-label="Echo requests">{echoRequests}</output>
      <output aria-label="Pending requests">{pendingRequests}</output>
      <output aria-label="Cancelled requests">{cancelledRequests}</output>
      <button onClick={changeHandler}>Change handler</button>
      <button
        onClick={() => {
          setBroken(false);
          retry();
        }}
      >
        Fix bundle
      </button>
      <button onClick={() => setExportFailure(false)}>Allow exports</button>
      {status === 'failed' && (
        <div role="alert">
          Could not load the data app. <button onClick={retry}>Retry</button>
        </div>
      )}
      <DataAppBridge
        key={attempt}
        title="Sandbox app"
        iframeProps={{
          hidden: status !== 'ready',
          allow: params.has('no-fullscreen')
            ? "fullscreen 'none'"
            : 'fullscreen *',
          allowFullScreen: true,
          style: { width: '100%', height: '80vh', border: 0 },
        }}
        presentation={{ theme: 'dark', surface: 'embedded' }}
        source={
          params.has('url')
            ? {
                type: 'url',
                url: new URL('/report', frameURL).href,
              }
            : {
                type: 'bundle',
                bootstrapUrl: `/__test/${params.has('timeout') ? 'silent' : 'runtime'}`,
                javascript: broken
                  ? params.has('syntax')
                    ? 'const ='
                    : 'throw new Error("Broken app")'
                  : javascript,
              }
        }
        startupTimeoutMs={params.has('timeout') ? 200 : 10000}
        onStatusChange={setStatus}
        onMessage={router.dispatch}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
