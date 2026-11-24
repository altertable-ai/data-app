import { appDiagnostics } from '@altertable/data-app/client';
import {
  readWidgetId,
  reportWidgetCapture,
  readWidgetCaptureRequest,
  type WidgetCaptureRenderState,
  appUrlKeys,
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
import { sectionContent, type WidgetTarget } from '../content.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import { useDeclaredResult } from '../view-runtime.tsx';
import { errorPresentation } from './DataSectionBoundary.tsx';
import { EmptyState } from './EmptyState.tsx';
import { LoadingStatus } from './LoadingStatus.tsx';
import { searchParams, subscribeSearch } from './search.ts';
import { StaticRenderContext } from './static-render.ts';
import { StatusPanel } from './StatusPanel.tsx';
import { useAppAppearance } from './useAppAppearance.ts';
import { useDataAppPresentation } from './useDataAppPresentation.ts';
import { useDataAppTransport } from './useDataAppTransport.ts';

/** What a `?_widget=` link selects: a registered widget, or why it cannot render. */
export type FocusedTarget =
  | { kind: 'widget'; widget: WidgetTarget }
  | { kind: 'invalid'; reason: string };

type WidgetState = Exclude<WidgetCaptureRenderState['state'], 'invalid-target'>;
/** One committed result the widget draws; a new result starts a new drawing. */
type Drawing = { widget: WidgetTarget; data: unknown; input: unknown };
type DrawingOutcome = { drawing: Drawing; state: 'ready' | 'error' };

function readThemeOverride() {
  const [theme, ...rest] = searchParams().getAll(appUrlKeys.theme);
  if (rest.length === 0 && (theme === 'light' || theme === 'dark'))
    return theme;
  return undefined;
}

function currentSearch() {
  return searchParams().toString();
}

function FocusedWidgetSurface({
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
    () => readWidgetCaptureRequest(transport?.snapshot(), search),
    () => undefined
  );
  const { state } = capture;
  const widgetId = 'widgetId' in capture ? capture.widgetId : undefined;
  // Frame sizing re-measures a ready widget when its content resizes.
  useLayoutEffect(() => {
    if (!request) return;
    transport?.[reportWidgetCapture]?.(
      request,
      widgetId === undefined ? { state: 'invalid-target' } : { state, widgetId }
    );
  }, [transport, request, state, widgetId]);

  return (
    <main
      {...props}
      className="altertable-focused-widget"
      data-widget-state={state}
      data-focused-widget={widgetId}
    />
  );
}

export function useFocusedTarget(
  registry?: ReadonlyMap<string, WidgetTarget>
): FocusedTarget | null {
  const id = useSyncExternalStore(
    subscribeSearch,
    () => readWidgetId(searchParams()),
    () => undefined
  );
  // Screens without a view cannot register widgets, so their URLs stay theirs.
  if (!registry || id === undefined) return null;
  if (id === null)
    return {
      kind: 'invalid',
      reason: 'Provide one valid widget ID in the URL.',
    };
  const widget = registry.get(id);
  return widget
    ? { kind: 'widget', widget }
    : { kind: 'invalid', reason: `No widget is registered as “${id}”.` };
}

export function FocusedWidget({ target }: { target: FocusedTarget }) {
  const identity = useId();
  const app = useDataApp();
  const transport = useDataAppTransport();
  const presentation = useDataAppPresentation(transport);
  const theme = useSyncExternalStore(
    subscribeSearch,
    readThemeOverride,
    () => undefined
  );
  const search = useSyncExternalStore(subscribeSearch, currentSearch, () => '');
  useAppAppearance(app.appearance, theme ?? presentation?.theme);
  if (target.kind === 'invalid')
    return (
      <FocusedWidgetSurface capture={{ state: 'invalid-target' }}>
        <StatusPanel
          status="error"
          title="Widget unavailable"
          description={target.reason}
        />
      </FocusedWidgetSurface>
    );
  const { widget } = target;
  return (
    <StaticRenderContext value={true}>
      <FocusedRenderBoundary
        id={widget.id}
        identity={identity}
        resetKey={search}
      >
        <FocusedWidgetResult widget={widget} />
      </FocusedRenderBoundary>
    </StaticRenderContext>
  );
}

type BoundaryProps = {
  id: string;
  identity: string;
  /** A new URL retries a render that failed for the previous filters. */
  resetKey: string;
  children: ReactNode;
};

class FocusedRenderBoundary extends Component<
  BoundaryProps,
  { failed: boolean; resetKey: string }
> {
  override state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: { failed: boolean; resetKey: string }
  ) {
    return props.resetKey === state.resetKey
      ? null
      : { failed: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    appDiagnostics.record('render', this.props.id, error, this.props.identity);
  }

  override componentDidUpdate(_: BoundaryProps, previous: { failed: boolean }) {
    if (previous.failed && !this.state.failed)
      appDiagnostics.clear('render', this.props.id, this.props.identity);
  }

  override componentWillUnmount() {
    appDiagnostics.clear('render', this.props.id, this.props.identity);
  }

  override render() {
    return this.state.failed ? (
      <FocusedWidgetSurface
        capture={{ state: 'error', widgetId: this.props.id }}
      >
        <StatusPanel status="error" title="This widget couldn’t render" />
      </FocusedWidgetSurface>
    ) : (
      this.props.children
    );
  }
}

function stopInteraction(event: SyntheticEvent) {
  event.stopPropagation();
}

/** Keeps pointer, keyboard, and click handlers inside the widget from running. */
const blockedInteraction = {
  onPointerDownCapture: stopInteraction,
  onPointerOverCapture: stopInteraction,
  onPointerOutCapture: stopInteraction,
  onPointerMoveCapture: stopInteraction,
  onMouseOverCapture: stopInteraction,
  onMouseOutCapture: stopInteraction,
  onMouseMoveCapture: stopInteraction,
  onTouchStartCapture: stopInteraction,
  onKeyDownCapture: stopInteraction,
  onContextMenuCapture: stopInteraction,
  onClickCapture(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
  },
};

function FocusedWidgetResult({ widget }: { widget: WidgetTarget }) {
  const section = sectionContent(widget.content);
  const result = useDeclaredResult(section.view);
  const view = result.view;
  const { kind } = view;
  const data = result.snapshot?.data;
  const input = result.snapshot?.input;
  const element = useRef<HTMLElement>(null);
  const drawing = useMemo(
    () => (kind === 'ready' ? { widget, data, input } : undefined),
    [kind, data, input, widget]
  );
  const [outcome, setOutcome] = useState<DrawingOutcome>();
  const drawn =
    drawing && outcome?.drawing === drawing ? outcome.state : undefined;

  const requestError =
    kind === 'error' || kind === 'stale-error'
      ? errorPresentation(view.error)
      : undefined;
  let state: WidgetState = 'loading';
  if (requestError) state = 'error';
  else if (kind === 'empty') state = 'empty';
  else if (drawn) state = drawn;

  return (
    <FocusedWidgetSurface
      ref={element}
      capture={{ state, widgetId: widget.id }}
      aria-busy={state === 'loading'}
      {...blockedInteraction}
    >
      {requestError ? (
        <StatusPanel
          status="error"
          title={requestError.title}
          description={requestError.description}
        />
      ) : kind === 'empty' ? (
        <EmptyState {...result.emptyFallback} />
      ) : drawn === 'error' ? (
        <StatusPanel
          status="error"
          title="This widget couldn’t finish rendering"
        />
      ) : (
        <Suspense fallback={<WidgetLoading reset={setOutcome} />}>
          <DateFormattingContext value={{ timeZone: result.timeZone }}>
            {/* A component keeps a suspending renderer under this boundary. */}
            <WidgetContent
              render={() =>
                kind === 'ready'
                  ? section.children(view.data, view.input)
                  : section.loadingFallback
              }
            />
          </DateFormattingContext>
          {state === 'loading' && <LoadingStatus label="Loading widget" />}
          {drawing && (
            <DrawingObserver
              element={element}
              drawing={drawing}
              settle={setOutcome}
            />
          )}
        </Suspense>
      )}
    </FocusedWidgetSurface>
  );
}

function WidgetLoading({ reset }: { reset: (state: undefined) => void }) {
  useLayoutEffect(() => reset(undefined), [reset]);
  return <LoadingStatus label="Loading widget" />;
}

function WidgetContent({ render }: { render: () => ReactNode }) {
  return render();
}

/** Settles a drawing once custom rendering, fonts, and the next frame are done. */
function DrawingObserver({
  element,
  drawing,
  settle,
}: {
  element: RefObject<HTMLElement | null>;
  drawing: Drawing;
  settle: (outcome: DrawingOutcome) => void;
}) {
  useLayoutEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    async function wait() {
      // Parent refs attach later in the same commit.
      await Promise.resolve();
      if (signal.aborted || !element.current) return;
      await drawing.widget.waitForReady?.(element.current, signal);
      if (signal.aborted) return;
      await document.fonts.ready;
      if (signal.aborted) return;
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve())
      );
    }
    void wait().then(
      () => {
        if (!signal.aborted) settle({ drawing, state: 'ready' });
      },
      () => {
        if (!signal.aborted) settle({ drawing, state: 'error' });
      }
    );
    return () => abort.abort();
  }, [element, drawing, settle]);
  return null;
}
