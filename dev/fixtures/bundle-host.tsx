import { AppIcon } from '@altertable/data-app/react/ui';
import { Kbd } from '@/src/react/ui/Kbd';
import { useAnnotationHost } from '@/dev/fixtures/use-annotation-host';
import type { Theme } from '@altertable/data-app/appearance';
import {
  StrictMode,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Moon, Sun, PanelsTopLeft, AppWindow } from 'lucide-react';
import {
  AnnotationBar,
  type AnnotationBarHandle,
  injectDataAppAnnotationStyles,
  Tooltip,
  TooltipProvider,
} from '@altertable/data-app/react';
import '@/src/react/ui/Tooltip.css';
import '@/src/react/ui/Kbd.css';

import {
  shortcuts,
  useShortcut,
  ariaKeyShortcuts,
} from '@/src/react/ui/shortcuts';
import { createRoot } from 'react-dom/client';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import {
  MessageRoutingError,
  annotationDraftRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationSendRoute,
  annotationUpdateRoute,
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
import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
import '@/dev/fixtures/dev-reload';
import '@/dev/playground-host.css';
injectDataAppAnnotationStyles();
const hostOptions = new URLSearchParams(location.search);
const isPlayground = location.pathname === '/playground';
if (isPlayground) document.title = 'Playground · Altertable';
const appPreview = ['/starter-data-app', '/playground'].includes(
  location.pathname
);
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

function Host() {
  const [annotationFailure, setAnnotationFailure] = useState(
    hostOptions.has('annotation-error')
  );
  const [sentCount, setSentCount] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [parentPresentation, setParentPresentation] = useState(true);
  const [embedded, setEmbedded] = useState(true);
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, bumpAttempt] = useReducer(value => value + 1, 0);
  const [version, bumpVersion] = useReducer(value => value + 1, 1);
  const [bundleVersion, bumpBundleVersion] = useReducer(value => value + 1, 1);
  const annotationsHost = useAnnotationHost({
    sourceVersion: isPlayground ? `${sourceHash}:${bundleVersion}` : 'fixture',
    storageKey: isPlayground ? `playground:${location.origin}` : undefined,
  });
  const annotationBar = useRef<AnnotationBarHandle>(null);
  const requestAnnotationSend = useEffectEvent(async () => {
    await annotationBar.current?.send();
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
        ...(isPlayground || hostOptions.has('annotations')
          ? {
              annotations: {
                enabled: true,
                ...(isPlayground
                  ? {
                      active: annotating,
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
      'annotation:draft': annotationDraftRoute,
      'annotation:mode': annotationModeRoute,
      'annotation:editor': annotationEditorStateRoute,
      'annotation:send': annotationSendRoute,
      'annotation:update': annotationUpdateRoute,
      'data:sql': sqlQueryRoute,
      'export:csv': fileExportRoute,
      'export:zip': fileExportRoute,
    },
    {
      ...annotationsHost.handlers,
      'annotation:send': requestAnnotationSend,
      'annotation:draft'(draft) {
        if (hostOptions.has('annotation-limit'))
          throw new MessageRoutingError(
            'annotation_limit',
            'Delete an annotation before adding another.'
          );
        if (annotationFailure) throw new Error('Fixture failure');
        return annotationsHost.handlers['annotation:draft'](draft);
      },
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
          <strong className="playground-title">Playground</strong>
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
        </>
      )}
      {isPlayground && (annotating || annotationsHost.deletedAnnotationId) && (
        <AnnotationBar
          ref={annotationBar}
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
      <main className={isPlayground ? 'playground-stage' : undefined}>
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
          onMessage={router.dispatch}
          onDiagnostic={event => {
            document.body.dataset.diagnostic = JSON.stringify(event);
          }}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Host />
  </StrictMode>
);
