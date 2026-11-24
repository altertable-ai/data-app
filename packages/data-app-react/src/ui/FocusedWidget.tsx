import { appDiagnostics } from '@altertable/data-app/client';
import {
  reportWidgetCapture,
  widgetCaptureRequest,
  type WidgetCaptureRenderState,
} from '@altertable/data-app/internal';
import {
  Component,
  useCallback,
  type ComponentPropsWithRef,
  Suspense,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from 'react';

import { useDataApp } from '../app-context.ts';
import {
  sectionContent,
  validWidgetId,
  type WidgetTarget,
} from '../content.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import { useDeclaredResult } from '../view-runtime.tsx';
import { errorPresentation } from './DataSectionBoundary.tsx';
import { EmptyState } from './EmptyState.tsx';
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { LoadingStatus } from './LoadingStatus.tsx';
import { searchParams, subscribeSearch } from './search.ts';
import { StatusPanel } from './StatusPanel.tsx';
import { useAppAppearance } from './useAppAppearance.ts';
import { useDataAppPresentation } from './useDataAppPresentation.ts';
import { useDataAppTransport } from './useDataAppTransport.ts';

type Target =
  | { widget: WidgetTarget; reason?: never }
  | { widget?: never; reason: string };

type WidgetState = 'loading' | 'ready' | 'empty' | 'error';
type Readiness = {
  widget: WidgetTarget;
  data: unknown;
  input: unknown;
};
type Settled = { readiness: Readiness; state: 'ready' | 'error' };

function widgetTheme() {
  const [theme, ...rest] = searchParams().getAll('theme');
  if (rest.length === 0 && (theme === 'light' || theme === 'dark'))
    return theme;
  return undefined;
}

function currentSearch() {
  return searchParams().toString();
}

function CaptureMain({
  capture,
  ...props
}: ComponentPropsWithRef<'main'> & { capture: WidgetCaptureRenderState }) {
  const transport = useDataAppTransport();
  const subscribe = useCallback(
    (listener: () => void) => transport?.subscribe(listener) ?? (() => {}),
    [transport]
  );
  const search = useSyncExternalStore(subscribeSearch, currentSearch, () => '');
  const request = useSyncExternalStore(
    subscribe,
    () => widgetCaptureRequest(transport?.snapshot(), search),
    () => undefined
  );
  const { state } = capture;
  const widgetId = 'widgetId' in capture ? capture.widgetId : undefined;
  useLayoutEffect(() => {
    if (request) transport?.[reportWidgetCapture]?.(request, capture);
  });

  return (
    <main
      {...props}
      className="altertable-focused-widget"
      data-widget-state={state}
      data-focused-widget={widgetId}
    />
  );
}

function widgetSearch() {
  const ids = searchParams().getAll('widget');
  if (ids.length > 1) return false;
  return ids[0] ?? null;
}

export function useWidgetTarget(
  registry?: ReadonlyMap<string, WidgetTarget>
): Target | null {
  const id = useSyncExternalStore(subscribeSearch, widgetSearch, () => null);
  if (id === null) return null;
  if (id === false || !validWidgetId(id))
    return { reason: 'Provide one valid widget ID in the URL.' };
  const widget = registry?.get(id);
  return widget
    ? { widget }
    : { reason: `No widget is registered as “${id}”.` };
}

export function FocusedWidgetFrame({ target }: { target: Target }) {
  const identity = useId();
  const app = useDataApp();
  const transport = useDataAppTransport();
  const presentation = useDataAppPresentation(transport);
  const theme = useSyncExternalStore(
    subscribeSearch,
    widgetTheme,
    () => undefined
  );
  useAppAppearance(app.appearance, theme ?? presentation?.theme);
  if (!target.widget)
    return (
      <CaptureMain capture={{ state: 'invalid-target' }}>
        <StatusPanel
          status="error"
          title="Widget unavailable"
          description={target.reason}
        />
      </CaptureMain>
    );
  const { widget } = target;
  return (
    <FocusedWidgetContext value={true}>
      <FocusedRenderBoundary id={widget.id} identity={identity}>
        <FocusedWidgetResult widget={widget} />
      </FocusedRenderBoundary>
    </FocusedWidgetContext>
  );
}

class FocusedRenderBoundary extends Component<
  { id: string; identity: string; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    appDiagnostics.record('render', this.props.id, error, this.props.identity);
  }

  override componentWillUnmount() {
    appDiagnostics.clear('render', this.props.id, this.props.identity);
  }

  override render() {
    return this.state.failed ? (
      <CaptureMain capture={{ state: 'error', widgetId: this.props.id }}>
        <StatusPanel status="error" title="This widget couldn’t render" />
      </CaptureMain>
    ) : (
      this.props.children
    );
  }
}

function stopInteraction(event: SyntheticEvent) {
  event.stopPropagation();
}

function FocusedWidgetResult({ widget }: { widget: WidgetTarget }) {
  const section = sectionContent(widget.content);
  const result = useDeclaredResult(section.view);
  const view = result.view;
  const { kind } = view;
  const data = result.snapshot?.data;
  const input = result.snapshot?.input;
  const element = useRef<HTMLElement>(null);
  const readiness = useMemo(
    () => (kind === 'ready' ? { widget, data, input } : undefined),
    [kind, data, input, widget]
  );
  const [settled, setSettled] = useState<Settled>();

  const requestError =
    kind === 'error' || kind === 'stale-error'
      ? errorPresentation(view.error)
      : undefined;
  let state: WidgetState = 'loading';
  if (requestError) state = 'error';
  else if (kind === 'empty') state = 'empty';
  else if (readiness && settled?.readiness === readiness) state = settled.state;

  return (
    <CaptureMain
      ref={element}
      capture={{ state, widgetId: widget.id }}
      aria-busy={state === 'loading'}
      onPointerDownCapture={stopInteraction}
      onPointerOverCapture={stopInteraction}
      onPointerOutCapture={stopInteraction}
      onPointerMoveCapture={stopInteraction}
      onMouseOverCapture={stopInteraction}
      onMouseOutCapture={stopInteraction}
      onMouseMoveCapture={stopInteraction}
      onTouchStartCapture={stopInteraction}
      onKeyDownCapture={stopInteraction}
      onContextMenuCapture={stopInteraction}
      onClickCapture={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {requestError ? (
        <StatusPanel
          status="error"
          title={requestError.title}
          description={requestError.description}
        />
      ) : kind === 'empty' ? (
        <EmptyState {...result.emptyFallback} />
      ) : readiness &&
        settled?.readiness === readiness &&
        settled.state === 'error' ? (
        <StatusPanel
          status="error"
          title="This widget couldn’t finish rendering"
        />
      ) : (
        <Suspense fallback={<WidgetLoading reset={setSettled} />}>
          <DateFormattingContext value={{ timeZone: result.timeZone }}>
            {kind === 'ready'
              ? section.children(view.data, view.input)
              : section.loadingFallback}
          </DateFormattingContext>
          {state === 'loading' && <LoadingStatus label="Loading widget" />}
          {readiness && (
            <WidgetReadiness
              element={element}
              readiness={readiness}
              settle={setSettled}
            />
          )}
        </Suspense>
      )}
    </CaptureMain>
  );
}

function WidgetLoading({ reset }: { reset: (state: undefined) => void }) {
  useLayoutEffect(() => reset(undefined), [reset]);
  return <LoadingStatus label="Loading widget" />;
}

function WidgetReadiness({
  element,
  readiness,
  settle,
}: {
  element: RefObject<HTMLElement | null>;
  readiness: Readiness;
  settle: (settled: Settled) => void;
}) {
  useLayoutEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    async function wait() {
      // Parent refs attach later in the same commit.
      await Promise.resolve();
      if (signal.aborted || !element.current) return;
      await readiness.widget.waitForReady?.(element.current, signal);
      if (signal.aborted) return;
      await document.fonts.ready;
      if (signal.aborted) return;
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve())
      );
    }
    void wait().then(
      () => {
        if (!signal.aborted) settle({ readiness, state: 'ready' });
      },
      () => {
        if (!signal.aborted) settle({ readiness, state: 'error' });
      }
    );
    return () => abort.abort();
  }, [element, readiness, settle]);
  return null;
}
