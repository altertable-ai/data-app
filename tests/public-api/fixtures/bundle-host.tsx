import {
  createNavigationHandler,
  createExternalLinkHandler,
  type DataAppActions,
  type DataAppDiagnostic,
  type DataAppLogger,
  type DataAppStatus,
} from '@altertable/data-app-embed';
import {
  DataAppBridge,
  type DataAppBridgeHandle,
} from '@altertable/data-app-embed/react';
import {
  createMessageRouter,
  openExternalLinkRoute,
  defineMessageRoute,
  DataSourceError,
  MessageRoutingError,
} from '@altertable/data-app/contract';
import {
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createRoot } from 'react-dom/client';

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

/** Host-owned page actions, as a parent shell renders them from the app's offer. */
function HostActionBar({
  actions,
  run,
}: {
  actions: DataAppActions;
  run: DataAppBridgeHandle['runAction'];
}) {
  const { refresh, exportCsv, presentStory, aboutData } = actions;
  return (
    <fieldset aria-label="Host page actions">
      {refresh && (
        <button
          aria-busy={refresh.refreshing}
          disabled={refresh.refreshing && !refresh.cancellable}
          onClick={() =>
            run({ type: refresh.refreshing ? 'cancelRefresh' : 'refresh' })
          }
        >
          {refresh.refreshing ? 'Cancel refresh' : 'Refresh data'}
        </button>
      )}
      {exportCsv &&
        (exportCsv.tables.length > 1 ? (
          <>
            {exportCsv.tables.map(table => (
              <button
                key={table}
                disabled={!exportCsv.enabled}
                onClick={() => run({ type: 'exportCsv', table })}
              >
                Export {table} CSV
              </button>
            ))}
            <button
              disabled={!exportCsv.enabled}
              onClick={() => run({ type: 'exportCsv' })}
            >
              Export all ZIP
            </button>
          </>
        ) : (
          <button
            disabled={!exportCsv.enabled}
            onClick={() => run({ type: 'exportCsv' })}
          >
            Export CSV
          </button>
        ))}
      {presentStory && (
        <button
          disabled={!presentStory.enabled}
          onClick={() => run({ type: 'presentStory' })}
        >
          Present story
        </button>
      )}
      {aboutData && (
        <button
          disabled={!aboutData.enabled}
          onClick={() => run({ type: 'aboutData' })}
        >
          Explore data
        </button>
      )}
    </fieldset>
  );
}

function Host() {
  const bridge = useRef<DataAppBridgeHandle>(null);
  const [actions, setActions] = useState<DataAppActions>({});
  const [externalNavigation, setExternalNavigation] = useState('');
  function navigateNewWindowOrTab(
    url: string,
    event: KeyboardEvent | ReactKeyboardEvent | ReactMouseEvent
  ) {
    const target = event.shiftKey
      ? 'window'
      : event.metaKey || event.ctrlKey
        ? 'tab'
        : undefined;
    if (!target) return;
    setExternalNavigation(
      JSON.stringify({
        url,
        target,
        keys: {
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        },
        keyboardEvent: event instanceof KeyboardEvent,
        activated: navigator.userActivation.isActive,
      })
    );
    if (params.has('navigation-error')) throw new Error('Navigation failed');
    window.open(
      url,
      '_blank',
      target === 'window' ? 'popup,noopener,noreferrer' : 'noopener,noreferrer'
    );
  }
  const [openExternalLink] = useState(() =>
    createExternalLinkHandler({
      allowedOrigins: ['https://example.com'],
      navigate: params.has('custom-navigation')
        ? navigateNewWindowOrTab
        : undefined,
    })
  );
  const [echoRequests, setEchoRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [cancelledRequests, setCancelledRequests] = useState(0);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [contentSizing, setContentSizing] = useState(
    params.has('content-sizing')
  );
  const [panelHeight, setPanelHeight] = useState(600);
  const [panelOffset, setPanelOffset] = useState(0);
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
      'navigation:openExternal': openExternalLinkRoute,
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
      'navigation:update': createNavigationHandler(),
      // Exercise the host's query-ID boundary in browser integration tests.
      async 'data:query'({ queryId, limit, params }, { signal }) {
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ queryId, limit, params }),
          signal,
        });
        if (response.status === 404)
          throw new MessageRoutingError('forbidden', 'Query not registered.');
        if (!response.ok) throw new DataSourceError('unavailable');
        return response.json();
      },
      'navigation:openExternal': openExternalLink,
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
      <output aria-label="External navigation">{externalNavigation}</output>
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
      {params.has('panel') && (
        <button onClick={() => setPanelOffset(value => (value ? 0 : 96))}>
          Move embedded report
        </button>
      )}
      <HostActionBar
        actions={actions}
        run={action => bridge.current?.runAction(action)}
      />
      <section
        aria-label="Embed panel"
        style={
          params.has('panel')
            ? { height: panelHeight, overflow: 'hidden' }
            : undefined
        }
      >
        <div style={{ height: panelOffset }} />
        <DataAppBridge
          key={attempt}
          ref={bridge}
          title="Sandbox app"
          iframeProps={{
            hidden: status !== 'ready',
            allow: 'fullscreen *',
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
          onActionsChange={setActions}
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
