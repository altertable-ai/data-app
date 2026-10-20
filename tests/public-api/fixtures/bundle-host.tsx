import { useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app-embed/react';
import { createHttpTransport } from '@altertable/data-app/client';
import {
  createMessageRouter,
  defineMessageRoute,
  sqlQueryRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import {
  createNavigationHandler,
  createSqlQueryHandler,
  type DataAppDiagnostic,
  type DataAppLogger,
  type DataAppStatus,
} from '@altertable/data-app-embed';
import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';

const { frameURL } = await fetch('/__test/config').then(response =>
  response.json()
);
const params = new URLSearchParams(location.search);
const starter = location.pathname === '/starter-data-app';
const javascript = await fetch(
  starter
    ? '/__test/starter-data-app'
    : params.has('manual-sizing')
      ? '/__test/content-sizing'
      : '/__test/bundle'
).then(response => response.text());
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

const offscreen = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
} as const;

function Host() {
  const [echoRequests, setEchoRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [cancelledRequests, setCancelledRequests] = useState(0);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [contentSizing, setContentSizing] = useState(
    params.has('content-sizing')
  );
  const [panelHeight, setPanelHeight] = useState(600);
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, retry] = useReducer(value => value + 1, 0);
  const [version, changeHandler] = useReducer(value => value + 1, 1);
  const [broken, setBroken] = useState(params.has('broken'));
  const [exportFailure, setExportFailure] = useState(
    params.has('export-error')
  );
  const [failures, setFailures] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<DataAppDiagnostic[]>([]);
  const logger: DataAppLogger = {
    log() {},
    info() {},
    warn() {},
    error(label, cause) {
      if (
        label !== 'Data app failed' ||
        !cause ||
        typeof cause !== 'object' ||
        !('message' in cause) ||
        typeof cause.message !== 'string'
      )
        return;
      const { message } = cause;
      const name =
        'name' in cause && typeof cause.name === 'string'
          ? cause.name
          : undefined;
      setFailures(previous => [
        ...previous,
        name ? `${name}: ${message}` : message,
      ]);
    },
  };
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
  const router = createMessageRouter(
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
        async queryAll(statement, { limit, signal, params }) {
          const response = await fetch('/api/sql', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ statement, limit, params }),
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
  return (
    <div
      style={
        params.has('panel')
          ? { height: '100vh', overflow: 'hidden' }
          : undefined
      }
    >
      <output aria-label="Echo requests">{echoRequests}</output>
      <output aria-label="Pending requests">{pendingRequests}</output>
      <output aria-label="Cancelled requests">{cancelledRequests}</output>
      <output aria-label="Handler version">{version}</output>
      <output aria-label="App failures" style={offscreen}>
        {JSON.stringify(failures)}
      </output>
      <output aria-label="Host diagnostics" style={offscreen}>
        {JSON.stringify(diagnostics)}
      </output>
      <button onClick={changeHandler}>Change handler</button>
      <button
        onClick={() => setTheme(value => (value === 'dark' ? 'light' : 'dark'))}
      >
        Change theme
      </button>
      <button onClick={() => setContentSizing(value => !value)}>
        Toggle content sizing
      </button>
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
      {params.has('panel') && (
        <button
          onClick={() => setPanelHeight(value => (value === 600 ? 300 : 600))}
        >
          Resize embed panel
        </button>
      )}
      <section
        aria-label="Embed panel"
        style={
          params.has('panel')
            ? { height: panelHeight, overflow: 'hidden' }
            : undefined
        }
      >
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
          presentation={{
            theme,
            surface: 'embedded',
            ...(contentSizing ? { sizing: 'content' } : {}),
          }}
          source={
            params.has('url')
              ? {
                  type: 'url',
                  url: new URL('/report', frameURL).href,
                }
              : {
                  type: 'bundle',
                  bootstrapUrl: params.has('packaged')
                    ? undefined
                    : `/__test/${params.has('timeout') ? 'silent' : 'runtime'}`,
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
          logger={logger}
          onDiagnostic={event => {
            if (event.type !== 'runtime:log')
              setDiagnostics(previous => [...previous, event]);
          }}
        />
      </section>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Host />);
