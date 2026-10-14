import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { invariant } from '@/src/core/invariant';
import {
  ViewContent,
  sectionContent,
  type DataContentState,
} from '@/src/react/content';
import { useDeclaredResult, type DeclaredView } from '@/src/react/view-runtime';
import { DateFormattingContext } from '@/src/react/date-formatting';
import { DataSectionBoundary } from '@/src/react/ui/DataSectionBoundary';
import { InspectionProvider } from '@/src/react/ui/InspectionProvider';
import { InspectionContext } from '@/src/react/ui/InspectionContext';
import { Sheet } from '@/src/react/ui/Sheet';
import { EmptyState } from '@/src/react/ui/EmptyState';
import {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';

import type { DetailRequest, DetailTarget } from '@/src/react/actions';
type DetailPanelProps = {
  input: unknown;
  open: boolean;
  close: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  onClosed: () => void;
};

/** Registered content hides heterogeneous destination types without erasing author-side checks. */
export type DetailContent = {
  id: string;
  target: object;
  parseInput: (value: unknown) => unknown;
  render: (props: DetailPanelProps) => ReactNode;
  renderRecords: (input: unknown) => ReactNode;
};

export function createDetailContent<Data, Input>(
  view: DeclaredView<Data, Input> & DetailTarget<Input>,
  render: (source: DataContentState<Data, Input>) => ReactNode,
  describeInput: (input: Input) => string
): DetailContent {
  invariant(
    !!view.id.trim() && !!view.title.trim(),
    'Detail views need an ID and title.'
  );
  const content = new ViewContent(view, render, describeInput);
  const { loadingFallback, children } = sectionContent(content);
  function DetailPanel({
    input,
    open,
    close,
    returnFocus,
    onClosed,
  }: DetailPanelProps) {
    const result = useDeclaredResult(view, input as Input);
    const cancel = useEffectEvent(() => {
      void result.cancel(true);
    });
    useEffect(() => {
      if (!open) cancel();
    }, [open]);
    const snapshot = result.snapshot;
    const scope = describeInput(snapshot ? snapshot.input : (input as Input));
    return (
      <InspectionProvider>
        <Sheet
          open={open}
          onOpenChange={next => {
            if (!next) close();
          }}
          title={view.title}
          description={scope}
          returnFocus={returnFocus}
          onClose={onClosed}
          wide
        >
          <ResultContent result={result} />
        </Sheet>
      </InspectionProvider>
    );
  }
  function ResultContent({
    result,
  }: {
    result: ReturnType<typeof useDeclaredResult<Data, Input>>;
  }) {
    return (
      <DateFormattingContext value={{ timeZone: result.timeZone }}>
        <InspectionContext
          value={{ dataContext: result.dataContext, queries: result.queries }}
        >
          <DataSectionBoundary
            loadingFallback={loadingFallback}
            result={result}
            notice="inline"
          >
            {children}
          </DataSectionBoundary>
        </InspectionContext>
      </DateFormattingContext>
    );
  }
  function Records({ input }: { input: Input }) {
    const result = useDeclaredResult(view, input);
    return <ResultContent result={result} />;
  }

  return {
    id: view.id,
    target: view,
    parseInput: view.parseInput,
    render: props => <DetailPanel {...props} />,
    renderRecords: input => (
      <Records key={JSON.stringify(input)} input={view.parseInput(input)} />
    ),
  };
}

const DetailContext = createContext<{
  open: (request: DetailRequest, trigger?: HTMLElement) => void;
  active: boolean;
  details: readonly DetailContent[];
} | null>(null);
export function useDetailActive() {
  return useContext(DetailContext)?.active ?? false;
}
function currentDetailSearch() {
  return searchParams().toString();
}

/** One URL-driven detail sheet; the dashboard stays mounted behind it. */
export function DetailProvider({
  details,
  children,
}: {
  details: readonly DetailContent[];
  children: ReactNode;
}) {
  const search = useSyncExternalStore(
    subscribeSearch,
    currentDetailSearch,
    () => ''
  );
  const returnFocus = useRef<HTMLElement | null>(null);
  type Selection = { content: DetailContent; input: unknown; key: string };
  const [retained, setRetained] = useState<Selection | null>(null);
  const ids = details.map(detail => detail.id);
  invariant(
    new Set(ids).size === ids.length,
    'Detail destination IDs must be unique.'
  );
  const params = new URLSearchParams(search);
  const id = params.get('detail');
  const encoded = params.get('detailInput');
  let selected: Selection | null = null;
  let invalid = false;
  if (id || encoded) {
    const content = details.find(detail => detail.id === id);
    try {
      invariant(
        content && encoded && encoded.length <= 8192,
        'Unknown or invalid detail destination.'
      );
      selected = {
        content,
        input: content.parseInput(JSON.parse(encoded)),
        key: `${id}:${encoded}`,
      };
    } catch {
      invalid = true;
    }
  }
  if (invalid && retained) setRetained(null);
  else if (selected && selected.key !== retained?.key) setRetained(selected);
  function close() {
    writeSearch({
      detail: null,
      detailInput: null,
      about: null,
      tab: null,
      present: null,
      step: null,
    });
  }
  function open(request: DetailRequest, trigger?: HTMLElement) {
    const content = details.find(detail => detail.id === request.id);
    invariant(
      content?.target === request.target,
      `Register the ${request.id} detail content on DataApp.`
    );
    const input = JSON.stringify(request.input);
    invariant(
      input !== undefined && input.length <= 8192,
      'Drill inputs must be JSON-serializable and fit in a shared URL.'
    );
    // Execute exactly the parsed input that a reopened URL will use.
    content.parseInput(JSON.parse(input));
    // Replacement sheets keep the dashboard origin, not a control about to unmount.
    if (!selected && !invalid)
      returnFocus.current =
        trigger ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
    writeSearch(
      { detail: request.id, detailInput: input, about: null, tab: null },
      'push'
    );
  }
  const displayed = selected ?? retained;
  return (
    <DetailContext value={{ open, active: !!selected || invalid, details }}>
      {children}
      {invalid ? (
        <Sheet
          open
          onOpenChange={next => {
            if (!next) close();
          }}
          title="Cannot open details"
          returnFocus={returnFocus}
        >
          <EmptyState
            title="This detail link is invalid"
            description="Close this panel and choose a detail action from the dashboard."
          />
        </Sheet>
      ) : (
        displayed && (
          <div key={displayed.key}>
            {displayed.content.render({
              input: displayed.input,
              open: !!selected,
              close,
              returnFocus,
              onClosed: () => {
                if (!selected) setRetained(null);
              },
            })}
          </div>
        )
      )}
    </DetailContext>
  );
}

export function useDetailOpener() {
  return useContext(DetailContext)?.open;
}

/** Resolve registration while inside DataApp; the resulting content can mount in its inspection host. */
export function useDetailRecords(request: DetailRequest | undefined) {
  const context = useContext(DetailContext);
  if (!request) return undefined;
  const content = context?.details.find(detail => detail.id === request.id);
  invariant(
    content?.target === request.target,
    `Register the ${request.id} detail content on DataApp.`
  );
  return (
    <DetailContext value={context}>
      {content.renderRecords(request.input)}
    </DetailContext>
  );
}
