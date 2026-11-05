import {
  useCallback,
  useContext,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react';

import { sectionContent, type ViewContent } from '../content.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import {
  AppViewResultsContext,
  assertAppRendersFilters,
  type DeclaredView,
  type ViewResult,
  useDeclaredResult,
} from '../view-runtime.tsx';
import { DataSectionBoundary } from './DataSectionBoundary.tsx';
import {
  InspectionContext,
  useInspectionDefaults,
} from './InspectionContext.tsx';
import { type EmptyContent } from './presentation.ts';
import { useHasNearedViewport } from './useHasNearedViewport.ts';

export type DataSectionProps<Data, Input = unknown> = {
  content: ViewContent<Data, Input>;
  emptyFallback?: EmptyContent;
  error?: { title: ReactNode; description?: ReactNode; onRetry?: () => void };
  label?: string;
} & Omit<ComponentPropsWithRef<'div'>, 'children' | 'content'>;

type SectionProps<Data, Input> = Omit<
  DataSectionProps<Data, Input>,
  'content'
> &
  Omit<ReturnType<typeof sectionContent<Data, Input>>, 'view'>;

/** Sections of views that `<DataApp>` runs share its results; every other section
 * requests its own view once it nears the viewport. */
export function DataSection<Data, Input>({
  content,
  ...presentation
}: DataSectionProps<Data, Input>) {
  const app = useContext(AppViewResultsContext);
  const { view, ...section } = sectionContent(content);
  // Identity proves the shared result belongs to this content's declaration.
  const appResult = app?.results.get(view) as
    | ViewResult<Data, Input>
    | undefined;
  if (!appResult) {
    if (app) assertAppRendersFilters(view, app.primaryView);
    return <LazySection view={view} {...section} {...presentation} />;
  }
  // The app reports the primary view's request state for the whole page.
  if (view === app?.primaryView)
    return (
      <DataSectionBoundary
        {...section}
        {...presentation}
        result={appResult}
        notice="none"
      />
    );
  return (
    <StandaloneSection {...section} {...presentation} result={appResult} />
  );
}

/** Requests its view only once the section nears the viewport,
 * so each widget's query runs when a reader can see it. */
function LazySection<Data, Input>({
  view,
  ref,
  ...props
}: SectionProps<Data, Input> & { view: DeclaredView<Data, Input> }) {
  const [observeViewport, hasNearedViewport] = useHasNearedViewport();
  const result = useDeclaredResult(view, { enabled: hasNearedViewport });
  const sectionRef = useCallback(
    (element: HTMLDivElement | null) => {
      assignRef(ref, element);
      const stopObserving = observeViewport(element);
      return () => {
        stopObserving?.();
        assignRef(ref, null);
      };
    },
    [ref, observeViewport]
  );
  return <StandaloneSection {...props} ref={sectionRef} result={result} />;
}

/** Reports its own request state inline and inspects its own queries. */
function StandaloneSection<Data, Input>({
  result,
  ...props
}: SectionProps<Data, Input> & { result: ViewResult<Data, Input> }) {
  const defaults = useInspectionDefaults();
  return (
    <DateFormattingContext value={{ timeZone: result.timeZone }}>
      <InspectionContext
        value={{
          ...defaults,
          dataContext: result.dataContext,
          queries: result.queries,
        }}
      >
        <DataSectionBoundary {...props} result={result} notice="inline" />
      </InspectionContext>
    </DateFormattingContext>
  );
}

function assignRef<Value>(ref: Ref<Value> | undefined, value: Value) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}
