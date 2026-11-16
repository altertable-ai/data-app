import {
  type DataAppActions,
  type DataAppLogger,
  type DataAppStatus,
  createNavigationHandler,
  createExternalLinkHandler,
} from '@altertable/data-app-embed';
import {
  DataAppBridge,
  type DataAppBridgeHandle,
} from '@altertable/data-app-embed/react';
import {
  AnnotationBar,
  type AnnotationBarHandle,
  injectDataAppAnnotationStyles,
  Tooltip,
  TooltipProvider,
} from '@altertable/data-app-react';
import { AppIcon } from '@altertable/data-app-react/ui';
import type { Theme } from '@altertable/data-app/appearance';
import {
  MessageRoutingError,
  annotationDraftRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationSendRoute,
  annotationUpdateRoute,
  createMessageRouter,
  openExternalLinkRoute,
  defineMessageRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import { KEY_SEPARATOR } from '@altertable/data-app/internal';

import '@/packages/data-app-react/src/ui/Tooltip.css';
import '@/packages/data-app-react/src/ui/Kbd.css';

import {
  Moon,
  Sun,
  PanelsTopLeft,
  AppWindow,
  RefreshCw,
  Square,
  Download,
  Presentation,
  Info,
} from 'lucide-react';
import {
  StrictMode,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import { createRoot } from 'react-dom/client';

import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
import { useAnnotationHost } from '@/dev/fixtures/use-annotation-host';
import { Kbd } from '@/packages/data-app-react/src/ui/Kbd.tsx';
import {
  shortcuts,
  useShortcut,
  ariaKeyShortcuts,
} from '@/packages/data-app-react/src/ui/shortcuts.ts';
import '@/dev/fixtures/dev-reload';

import '@/dev/playground-host.css';
injectDataAppAnnotationStyles();
const hostOptions = new URLSearchParams(location.search);
const iframeLogger: DataAppLogger = {
  log: (...args) => console.debug('[DataApps:Iframe]', ...args),
  info: (...args) => console.info('[DataApps:Iframe]', ...args),
  warn: (...args) => console.warn('[DataApps:Iframe]', ...args),
  error: (...args) => console.error('[DataApps:Iframe]', ...args),
};
const isContentSizing = location.pathname === '/content-sizing';
const isPlayground = location.pathname === '/playground' || isContentSizing;
const showSizingControls = isContentSizing || hostOptions.has('content-sizing');
if (isPlayground)
  document.title = `${isContentSizing ? 'Content sizing' : 'Playground'} · Altertable`;
const appPreview = [
  '/starter-data-app',
  '/starter-metric-data-app',
  '/starter-finding-data-app',
  '/playground',
  '/content-sizing',
].includes(location.pathname);
const response = await fetch(
  appPreview
    ? `/__test${location.pathname}`
    : hostOptions.has('annotation-state')
      ? '/__test/annotation-state'
      : '/__test/bundle'
);
const javascript = await response.text();
const sourceHash = Array.from(
  new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(javascript))
  ),
  byte => byte.toString(16).padStart(2, '0')
).join('');

const connectionLabels: Record<DataAppStatus, string> = {
  connecting: 'Connecting',
  connected: 'Connecting',
  ready: 'Connected',
  failed: 'Disconnected',
  disconnected: 'Connecting',
};
const themeControls = {
  dark: { nextTheme: 'light', label: 'Switch to light theme' },
  light: { nextTheme: 'dark', label: 'Switch to dark theme' },
} satisfies Record<Theme, { nextTheme: Theme; label: string }>;
const previewLabels = {
  embedded: 'Preview standalone app',
  standalone: 'Preview embedded app',
};

/** Page actions the embedded app offers, rendered by the host instead of an in-app toolbar. */
function HostPageActions({
  actions,
  run,
  portalRoot,
}: {
  actions: DataAppActions;
  run: DataAppBridgeHandle['runAction'];
  portalRoot: RefObject<HTMLElement | null>;
}) {
  const { refresh, exportCsv, presentStory, aboutData } = actions;
  const items = [
    refresh && {
      label: refresh.refreshing
        ? refresh.cancellable
          ? 'Cancel refresh'
          : 'Refreshing data'
        : 'Refresh data',
      icon: refresh.refreshing && refresh.cancellable ? Square : RefreshCw,
      disabled: refresh.refreshing && !refresh.cancellable,
      busy: refresh.refreshing,
      run: () =>
        run({ type: refresh.refreshing ? 'cancelRefresh' : 'refresh' }),
    },
    exportCsv && {
      label:
        exportCsv.tables.length > 1 ? 'Export all data (ZIP)' : 'Export CSV',
      icon: Download,
      disabled: !exportCsv.enabled,
      run: () => run({ type: 'exportCsv' }),
    },
    presentStory && {
      label: 'Present story',
      icon: Presentation,
      disabled: !presentStory.enabled,
      run: () => run({ type: 'presentStory' }),
    },
    aboutData && {
      label: 'Explore data',
      icon: Info,
      disabled: !aboutData.enabled,
      run: () => run({ type: 'aboutData' }),
    },
  ].filter(item => !!item);
  return items.map(item => (
    <Tooltip
      key={item.label}
      content={item.label}
      placement="bottom"
      portalRoot={portalRoot}
    >
      <button
        aria-label={item.label}
        aria-busy={item.busy}
        disabled={item.disabled}
        onClick={item.run}
      >
        <item.icon size={16} aria-hidden="true" />
      </button>
    </Tooltip>
  ));
}

function Host() {
  const bridge = useRef<DataAppBridgeHandle>(null);
  const [actions, setActions] = useState<DataAppActions>({});
  const [annotationFailure, setAnnotationFailure] = useState(
    hostOptions.has('annotation-error')
  );
  const [sentCount, setSentCount] = useState(0);
  const hostRef = useRef<ComponentRef<'div'>>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [parentPresentation, setParentPresentation] = useState(true);
  const [embedded, setEmbedded] = useState(true);
  const [contentSizing, setContentSizing] = useState(showSizingControls);
  const [compactPanel, setCompactPanel] = useState(false);
  const sizesToContent = contentSizing && embedded;
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, bumpAttempt] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [bundleVersion, bumpBundleVersion] = useReducer(value => value + 1, 1);
  const annotationsHost = useAnnotationHost({
    sourceVersion: isPlayground
      ? [sourceHash, bundleVersion].join(KEY_SEPARATOR)
      : 'fixture',
    storageKey: isPlayground
      ? ['playground', location.origin].join(KEY_SEPARATOR)
      : undefined,
  });
  const annotationBarRef = useRef<AnnotationBarHandle>(null);
  const sendAnnotations = useEffectEvent(async () => {
    await annotationBarRef.current?.send();
    return null;
  });
  const {
    drafts: annotations,
    active: annotating,
    setActive: setAnnotating,
    pinsVisible,
    setPinsVisible,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    pending: sending,
  } = annotationsHost;
  const { selectedAnnotationId, selectionId } = annotationsHost.presentation;
  const [exportFailure, setExportFailure] = useState(
    hostOptions.has('export-error')
  );
  const [broken, setBroken] = useState(hostOptions.has('broken'));
  const urlMode = hostOptions.has('url');
  const timeout = hostOptions.has('timeout');
  useShortcut(
    shortcuts.annotate,
    () => setAnnotating(value => !value),
    isPlayground && embedded && status === 'ready',
    true
  );
  const surface = embedded ? 'embedded' : 'standalone';
  const connectionLabel = connectionLabels[status];
  const themeControl = themeControls[theme];
  const themeLabel = embedded
    ? themeControl.label
    : 'In standalone mode, change the app theme in its footer';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const SurfaceIcon = embedded ? AppWindow : PanelsTopLeft;
  const hasParentPresentation = isPlayground ? embedded : parentPresentation;
  const presentation = hasParentPresentation
    ? ({
        surface,
        theme,
        sizing: sizesToContent ? 'content' : 'frame',
        ...(isPlayground || hostOptions.has('annotations')
          ? {
              annotations: {
                enabled: true,
                // Without an in-frame toolbar, the host always owns annotation mode.
                active: annotating,
                ...(isPlayground
                  ? {
                      pinsVisible,
                      showHint: annotations.length === 0,
                      readOnly: sending || !annotationsHost.ready,
                    }
                  : {}),
                ...(selectedAnnotationId
                  ? {
                      selectedAnnotationId,
                      selectedTargetId: annotations.find(
                        draft => draft.id === selectedAnnotationId
                      )?.target.id,
                      selectionId,
                    }
                  : {}),
                targets: annotations.map((draft, index) => ({
                  id: draft.id,
                  targetId: draft.target.id,
                  number: index + 1,
                  comment: draft.comment,
                  anchor: draft.context.anchor,
                  region: draft.context.region,
                })),
              },
            }
          : {}),
      } as const)
    : undefined;
  // Extra attributes can still arrive from JavaScript callers or spread objects.
  const iframeProps = {
    hidden: status !== 'ready',
    allow: hostOptions.has('no-fullscreen')
      ? "fullscreen 'none'"
      : 'fullscreen *',
    allowFullScreen: true,
    className: 'app-frame',
    ...((appPreview || hostOptions.has('annotations')) && !isPlayground
      ? {
          style: { display: 'block', width: '100%', height: '80vh', border: 0 },
        }
      : {}),
    ...(hostOptions.has('lazy') ? { loading: 'lazy' as const } : {}),
  };
  const [openExternalLink] = useState(() => createExternalLinkHandler());

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
      'annotation:draft': annotationDraftRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
      'annotation:send': annotationSendRoute,
      'annotation:update': annotationUpdateRoute,
      'navigation:openExternal': openExternalLinkRoute,
      'export:csv': fileExportRoute,
      'export:zip': fileExportRoute,
    },
    {
      ...annotationsHost.handlers,
      'annotation:send': sendAnnotations,
      'annotation:draft'(draft) {
        if (hostOptions.has('annotation-limit'))
          throw new MessageRoutingError(
            'annotation_limit',
            'Delete an annotation before adding another.'
          );
        if (annotationFailure) throw new Error('Fixture failure');
        return annotationsHost.handlers['annotation:draft'](draft);
      },
      'navigation:openExternal': openExternalLink,
      'export:csv': downloadExport,
      'export:zip': downloadExport,
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
      'test:echo'({ period }) {
        return { period, version };
      },
      'navigation:update': createNavigationHandler(),
    }
  );

  const presentationControls = (
    <>
      <button
        aria-label="Change theme"
        onClick={() => setTheme(value => themeControls[value].nextTheme)}
      >
        Change theme
      </button>
      <button
        aria-label="Toggle parent presentation"
        aria-pressed={parentPresentation}
        onClick={() => setParentPresentation(value => !value)}
      >
        Toggle parent presentation
      </button>
      <button
        aria-label="Change surface"
        onClick={() => {
          setAnnotating(false);
          setEmbedded(value => !value);
        }}
      >
        Change surface
      </button>
      {hostOptions.has('annotations') && (
        <button
          aria-pressed={annotating}
          onClick={() => setAnnotating(value => !value)}
        >
          Annotate
        </button>
      )}
    </>
  );
  const testControls = (
    <>
      {exportFailure && (
        <button onClick={() => setExportFailure(false)}>Allow exports</button>
      )}
      {annotationFailure && (
        <button onClick={() => setAnnotationFailure(false)}>
          Allow annotations
        </button>
      )}
      <output aria-label="Annotation drafts" hidden>
        {JSON.stringify(annotations)}
      </output>
      <button onClick={bumpVersion}>Change handler</button>
      <button onClick={bumpBundleVersion}>Change javascript</button>
      <button onClick={() => setBroken(false)}>Fix bundle</button>
    </>
  );

  return (
    <div
      ref={hostRef}
      className={isPlayground ? 'playground-host' : undefined}
      data-theme={theme}
    >
      {isPlayground ? (
        <header className="playground-navbar">
          <strong className="playground-title">
            {isContentSizing ? 'Content sizing' : 'Playground'}
          </strong>
          <output
            className="playground-connection"
            data-status={status}
            aria-label={connectionLabel}
            title={connectionLabel}
          />
          <TooltipProvider>
            <nav
              aria-label="Playground controls"
              className="playground-controls"
            >
              <HostPageActions
                actions={actions}
                run={action => bridge.current?.runAction(action)}
                portalRoot={hostRef}
              />
              {showSizingControls && (
                <>
                  <button
                    className="playground-sizing-control"
                    aria-pressed={contentSizing}
                    disabled={!embedded}
                    onClick={() => setContentSizing(value => !value)}
                  >
                    Content height
                  </button>
                  <button
                    className="playground-sizing-control"
                    aria-pressed={compactPanel}
                    disabled={!sizesToContent}
                    onClick={() => setCompactPanel(value => !value)}
                  >
                    Compact panel
                  </button>
                </>
              )}
              <Tooltip
                content={
                  <>
                    Point at items to change the data app{' '}
                    <Kbd shortcut={shortcuts.annotate} />
                  </>
                }
                placement="bottom"
                portalRoot={hostRef}
              >
                <button
                  aria-label="Annotate"
                  aria-keyshortcuts={ariaKeyShortcuts(shortcuts.annotate)}
                  className="playground-annotate altertable-annotation-trigger"
                  aria-pressed={annotating}
                  disabled={
                    !embedded || status !== 'ready' || !annotationsHost.ready
                  }
                  onClick={() => setAnnotating(value => !value)}
                >
                  <AppIcon name="annotate" size={16} />
                  {annotations.length > 0 && (
                    <span
                      className="playground-annotation-count"
                      aria-label={`${annotations.length} annotations`}
                    >
                      {annotations.length}
                    </span>
                  )}
                </button>
              </Tooltip>
              <Tooltip
                content={themeLabel}
                placement="bottom"
                portalRoot={hostRef}
              >
                <button
                  disabled={!embedded}
                  aria-label={themeLabel}
                  onClick={() =>
                    setTheme(value => themeControls[value].nextTheme)
                  }
                >
                  <ThemeIcon size={16} aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip
                content={previewLabels[surface]}
                placement="bottom"
                portalRoot={hostRef}
              >
                <button
                  aria-label="Standalone preview"
                  aria-pressed={!embedded}
                  onClick={() => {
                    setAnnotating(false);
                    setEmbedded(value => !value);
                  }}
                >
                  <SurfaceIcon size={16} aria-hidden="true" />
                </button>
              </Tooltip>
            </nav>
          </TooltipProvider>
        </header>
      ) : (
        <>
          {presentationControls}
          {testControls}
          <TooltipProvider>
            <fieldset aria-label="Host page actions">
              <HostPageActions
                actions={actions}
                run={action => bridge.current?.runAction(action)}
                portalRoot={hostRef}
              />
            </fieldset>
          </TooltipProvider>
        </>
      )}
      {isPlayground && (annotating || annotationsHost.deletedAnnotationId) && (
        <AnnotationBar
          ref={annotationBarRef}
          active={annotating}
          annotations={annotations}
          theme={theme}
          pinsVisible={pinsVisible}
          onPinsVisibleChange={setPinsVisible}
          hasUnsavedChanges={hasUnsavedChanges}
          disabled={sending || !annotationsHost.ready}
          deletedAnnotationId={annotationsHost.deletedAnnotationId}
          onUndoDelete={id => annotationsHost.undoDelete(id)}
          onDismissUndo={() => annotationsHost.dismissUndo()}
          onSelect={annotationsHost.selectAnnotation}
          onDelete={annotationsHost.deleteAnnotation}
          onClear={annotationsHost.clearAnnotations}
          onClose={() => setAnnotating(false)}
          onSend={async batch => {
            await annotationsHost.submit(batch, async snapshot => {
              const response = await fetch('/api/annotations', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ annotations: snapshot }),
              });
              if (!response.ok)
                throw new Error('Annotation submission failed.');
            });
            setSentCount(batch.length);
          }}
        />
      )}
      {isPlayground && !annotating && sentCount > 0 && (
        <output
          className="playground-submission-status"
          aria-label="Annotation submission"
        >
          Sent {sentCount} annotations to the preview host.
        </output>
      )}
      {isPlayground && annotationsHost.persisting && (
        <output
          aria-label="Annotation storage status"
          className="playground-persistence-status"
        >
          Saving annotations locally…
        </output>
      )}
      {isPlayground && annotationsHost.storageError && (
        <output role="alert">
          Local annotation recovery is unavailable. Keep this page open until
          you send your annotations.
        </output>
      )}
      <main
        className={isPlayground ? 'playground-stage' : undefined}
        data-sizing={sizesToContent ? 'content' : 'frame'}
      >
        {showSizingControls && (
          <section
            className="playground-context"
            aria-label="Embedding example"
          >
            <h1>An app inside a page</h1>
            <p>
              Scroll the report, open its data inspector or story from the page
              actions above, and resize the compact panel.
            </p>
            <output aria-label="Scroll owner">
              {sizesToContent
                ? 'The parent page scrolls.'
                : 'The app scrolls inside its frame.'}
            </output>
          </section>
        )}
        <section
          className={isPlayground ? 'playground-embed-panel' : undefined}
          aria-label="Embedded report"
          data-compact={sizesToContent && compactPanel ? '' : undefined}
        >
          {status === 'failed' && (
            <div
              role="alert"
              className={isPlayground ? 'playground-error' : undefined}
            >
              Could not load the data app.{' '}
              <button onClick={bumpAttempt}>Retry</button>
            </div>
          )}
          <DataAppBridge
            key={attempt}
            ref={bridge}
            onActionsChange={setActions}
            onStatusChange={nextStatus => {
              setStatus(nextStatus);
              if (nextStatus === 'failed' || nextStatus === 'disconnected')
                setHasUnsavedChanges(false);
            }}
            iframeProps={iframeProps}
            title={isPlayground ? 'Orders preview' : 'Sandbox app'}
            presentation={presentation}
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
                      ? hostOptions.has('syntax')
                        ? 'const ='
                        : 'throw new Error("Broken app")'
                      : `${javascript}\ndocument.body.dataset.bundleVersion = "${bundleVersion}";`,
                  }
            }
            startupTimeoutMs={timeout ? 200 : 10_000}
            logger={iframeLogger}
            onMessage={async (message, context) => {
              try {
                return await router.dispatch(message, context);
              } catch (error) {
                if (!context.signal.aborted)
                  console.error(
                    '[DataApps:Host] Request failed',
                    message,
                    error
                  );
                throw error;
              }
            }}
            onDiagnostic={event => {
              document.body.dataset.diagnostic = JSON.stringify(event);
              if (event.type !== 'runtime:log')
                console.debug('[DataApps:Host]', event);
            }}
          />
        </section>
        {showSizingControls && sizesToContent && (
          <footer className="playground-context">
            This is parent-page content after the app.
          </footer>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Host />
  </StrictMode>
);
