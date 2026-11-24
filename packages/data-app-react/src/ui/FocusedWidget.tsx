import { appDiagnostics } from '@altertable/data-app/client';
import {
  Component,
  Suspense,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';

import { useDataApp } from '../app-context.ts';
import { sectionContent, validWidgetId, type ViewWidget } from '../content.ts';
import { DetailRoutes, type DetailContent } from '../details.tsx';
import { useDeclaredResult } from '../view-runtime.tsx';
import { StandaloneSection } from './DataSection.tsx';
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { LoadingStatus } from './LoadingStatus.tsx';
import { searchParams, subscribeSearch } from './search.ts';
import { StatusPanel } from './StatusPanel.tsx';
import { TooltipProvider } from './Tooltip.tsx';
import { useAppAppearance } from './useAppAppearance.ts';
import { useDataAppPresentation } from './useDataAppPresentation.ts';
import { useDataAppTransport } from './useDataAppTransport.ts';

type Target =
  | { widget: ViewWidget<unknown, unknown>; reason?: never }
  | { widget?: never; reason: string };

const noDetails: readonly DetailContent<any, any>[] = [];

type WidgetState = 'loading' | 'ready' | 'empty' | 'error';
type Readiness = {
  widget: ViewWidget<unknown, unknown>;
  data: unknown;
  input: unknown;
};
type Settled = { readiness: Readiness; state: 'ready' | 'error' };

function widgetSearch() {
  const ids = searchParams().getAll('widget');
  if (ids.length > 1) return false;
  return ids[0] ?? null;
}

export function useWidgetTarget(
  registry: ReadonlyMap<string, ViewWidget<unknown, unknown>>
): Target | null {
  const id = useSyncExternalStore(subscribeSearch, widgetSearch, () => null);
  if (id === null) return null;
  if (id === false || !validWidgetId(id))
    return { reason: 'Provide one valid widget ID in the URL.' };
  const widget = registry.get(id);
  return widget
    ? { widget }
    : { reason: `No widget is registered as “${id}”.` };
}

export function FocusedWidgetFrame({
  target,
  details,
}: {
  target: Target;
  details?: readonly DetailContent<any, any>[];
}) {
  const identity = useId();
  const app = useDataApp();
  const transport = useDataAppTransport();
  const presentation = useDataAppPresentation(transport);
  useAppAppearance(app.appearance, presentation?.theme);
  if (!target.widget)
    return (
      <main data-widget-state="invalid-target">
        <StatusPanel
          status="error"
          title="Widget unavailable"
          description={target.reason}
        />
      </main>
    );
  const { widget } = target;
  return (
    <TooltipProvider>
      <DetailRoutes details={details ?? noDetails} syncLocation={false}>
        <FocusedWidgetContext value={true}>
          <FocusedRenderBoundary id={widget.id} identity={identity}>
            <FocusedWidgetResult widget={widget} />
          </FocusedRenderBoundary>
        </FocusedWidgetContext>
      </DetailRoutes>
    </TooltipProvider>
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
      <main data-widget-state="error" data-focused-widget={this.props.id}>
        <StatusPanel status="error" title="This widget couldn’t render" />
      </main>
    ) : (
      this.props.children
    );
  }
}

function FocusedWidgetResult({
  widget,
}: {
  widget: ViewWidget<unknown, unknown>;
}) {
  const { view, ...section } = sectionContent(widget);
  const result = useDeclaredResult(view);
  const { kind } = result.view;
  const data = result.snapshot?.data;
  const input = result.snapshot?.input;
  const element = useRef<HTMLElement>(null);
  const readiness = useMemo(
    () => (kind === 'ready' ? { widget, data, input } : undefined),
    [kind, data, input, widget]
  );
  const [settled, setSettled] = useState<Settled>();

  let state: WidgetState = 'loading';
  if (kind === 'error' || kind === 'stale-error') state = 'error';
  else if (kind === 'empty') state = 'empty';
  else if (readiness && settled?.readiness === readiness) state = settled.state;

  return (
    <main
      ref={element}
      className="altertable-focused-widget"
      data-widget-state={state}
      data-focused-widget={widget.id}
      aria-busy={state === 'loading'}
    >
      {readiness &&
      settled?.readiness === readiness &&
      settled.state === 'error' ? (
        <StatusPanel
          status="error"
          title="This widget couldn’t finish rendering"
        />
      ) : (
        <Suspense fallback={<WidgetLoading reset={setSettled} />}>
          <StandaloneSection {...section} result={result} />
          {readiness && (
            <WidgetReadiness
              element={element}
              readiness={readiness}
              settle={setSettled}
            />
          )}
        </Suspense>
      )}
    </main>
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
