import { invariant } from '@/src/core/invariant';
import { ownedSource } from '@/src/react/source-owner';
import { DataSectionBoundary } from '@/src/react/ui/DataSectionBoundary';
import { InspectionContext } from '@/src/react/ui/InspectionContext';
import {
  InspectionOwner,
  InspectionProvider,
} from '@/src/react/ui/InspectionProvider';
import { Sheet } from '@/src/react/ui/Sheet';
import { StatusPanel } from '@/src/react/ui/StatusPanel';
import {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type RefObject,
} from 'react';
import type { EmptyContent } from '@/src/react/ui/presentation';
import type { ViewSource } from '@/src/react/bindings';
import type { ViewResult } from '@/src/react/view-runtime';

export type DetailViewDefinition<Data, Input> = {
  id: string;
  title: ReactNode;
  /** Validates untrusted navigation input before a detail operation can run. */
  parseInput: (input: unknown) => Input;
  describeInput: (input: Input) => string;
  isEmpty: (data: Data) => boolean;
  emptyFallback: EmptyContent;
};

/** A typed, query-backed destination. */
export class DetailView<Data, Input> {
  #content?: DetailContent<Data, Input>;
  constructor(
    readonly definition: DetailViewDefinition<Data, Input>,
    readonly useResult: (input: Input) => ViewResult<Data, Input>
  ) {
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Detail IDs are an authoring contract.
    invariant(!!definition.id.trim(), 'A detail view needs a nonempty ID.');
  }

  content(render: (source: ViewSource<Data, Input>) => ReactNode) {
    const content = new DetailContent(this, render);
    this.#content = content;
    return content;
  }

  static content<Data, Input>(target: DetailView<Data, Input>) {
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Destinations are registered at runtime.
    invariant(
      target.#content,
      'A detail destination needs content before it can be opened.'
    );
    return target.#content;
  }
}

/** Validate destination input before it enters either navigation or a lazy records query.
 * Undefined means the input is unusable: parseInput rejected it or it is not bounded JSON. */
export function parseDetailInput<Data, Input>(
  target: DetailView<Data, Input>,
  value: unknown
): { input: Input } | undefined {
  let input: Input;
  try {
    input = target.definition.parseInput(value);
  } catch {
    return undefined;
  }
  function serializable(value: unknown, depth = 0): boolean {
    if (depth > 20) return false;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    )
      return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every(item => serializable(item, depth + 1));
    return (
      !!value &&
      typeof value === 'object' &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null) &&
      Object.values(value).every(
        item => item === undefined || serializable(item, depth + 1)
      )
    );
  }
  return serializable(input) && JSON.stringify(input).length <= 16_384
    ? { input }
    : undefined;
}

/** A destination’s rendered body. Pass these to DataApp.details. */
export class DetailContent<Data, Input> {
  constructor(
    readonly target: DetailView<Data, Input>,
    readonly render: (source: ViewSource<Data, Input>) => ReactNode
  ) {}
}

type DetailEntry = {
  content: DetailContent<unknown, unknown>;
  input: unknown;
};

type RoutedDetail = { id: string; input: unknown };
const detailsParam = 'details';
const maxDetailRouteLength = 16_384;
const maxDetailRouteDepth = 20;

/** Undefined means the route is malformed or exceeds its bounds. */
function boundedRoute(
  value: unknown
): { route: RoutedDetail[]; serialized: string } | undefined {
  if (
    !Array.isArray(value) ||
    !value.every(
      item => item && typeof item === 'object' && typeof item.id === 'string'
    )
  )
    return undefined;
  const serialized = JSON.stringify(value);
  return value.length <= maxDetailRouteDepth &&
    serialized.length <= maxDetailRouteLength
    ? { route: value, serialized }
    : undefined;
}

function readRoute(
  details: readonly DetailContent<unknown, unknown>[]
): readonly DetailEntry[] | null {
  const raw = searchParams().get(detailsParam);
  if (!raw) return [];
  if (raw.length > maxDetailRouteLength) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const route = boundedRoute(value)?.route;
  if (!route) return null;
  const entries: DetailEntry[] = [];
  for (const item of route) {
    const content = details.find(
      candidate => candidate.target.definition.id === item.id
    );
    const parsed = content && parseDetailInput(content.target, item.input);
    if (!content || !parsed) return null;
    entries.push({ content, input: parsed.input });
  }
  return entries;
}

/** False leaves the route unchanged because the entries exceed its bounds. */
function writeRoute(
  entries: readonly DetailEntry[],
  mode: 'push' | 'replace' = 'push'
): boolean {
  const bounded = boundedRoute(
    entries.map(entry => ({
      id: entry.content.target.definition.id,
      input: entry.input,
    }))
  );
  if (!bounded) return false;
  const { serialized } = bounded;
  writeSearch(
    {
      [detailsParam]: entries.length ? serialized : null,
      ...(entries.length ? { about: null, tab: null } : {}),
    },
    mode
  );
  return true;
}

export type DetailNavigation = {
  open<Data, Input>(
    target: DetailView<Data, Input>,
    input: Input,
    trigger?: HTMLElement | SVGElement | null
  ): void;
};

const DetailNavigationContext = createContext<DetailNavigation | null>(null);

/** Resolve a detail target from an interaction. The destination validates input before fetching. */
export function useDetailNavigation(): DetailNavigation {
  const navigation = useContext(DetailNavigationContext);
  const inspection = useContext(InspectionOwner);
  return navigation
    ? {
        open(target, input, trigger) {
          const selection = inspection?.snapshot();
          const origin =
            trigger?.closest('dialog') && selection?.open
              ? (selection.inspection.trigger.current ?? trigger)
              : trigger;
          navigation.open(target, input, origin);
        },
      }
    : {
        open() {
          // oxlint-disable-next-line data-app/no-runtime-assertion -- React context is resolved at render.
          invariant(false, 'Detail navigation requires DataApp details.');
        },
      };
}

function DetailContentBody<Data, Input>({
  content,
  result,
}: {
  content: DetailContent<Data, Input>;
  result: ViewResult<Data, Input>;
}) {
  return (
    <InspectionContext
      value={{
        dataContext: result.dataContext,
        queries: result.queries,
        primaryView: result.view,
      }}
    >
      <DataSectionBoundary
        result={result}
        loadingFallback={content.render(
          ownedSource(content.target, { loading: true })
        )}
        emptyFallback={content.target.definition.emptyFallback}
        notice="none"
      >
        {(data, displayedInput) =>
          content.render(
            ownedSource(content.target, { data, input: displayedInput })
          )
        }
      </DataSectionBoundary>
    </InspectionContext>
  );
}
function DetailBody<Data, Input>({
  content,
  input,
}: {
  content: DetailContent<Data, Input>;
  input: Input;
}) {
  const result = content.target.useResult(input);
  return <DetailContentBody content={content} result={result} />;
}
function DetailSheet({
  entry,
  returnFocus,
  onClose,
}: {
  entry: DetailEntry;
  returnFocus: RefObject<HTMLElement | SVGElement | null>;
  onClose: () => void;
}) {
  const result = entry.content.target.useResult(entry.input);
  return (
    <Sheet
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title={entry.content.target.definition.title}
      description={entry.content.target.definition.describeInput(
        result.snapshot?.input ?? entry.input
      )}
      returnFocus={returnFocus}
    >
      <DetailContentBody content={entry.content} result={result} />
    </Sheet>
  );
}

function DetailProblem() {
  return (
    <StatusPanel
      status="error"
      title="This detail can't be opened"
      description="The selected item doesn't identify records this detail can show."
    />
  );
}

/** Mounts one replacement sheet for a stack of detail destinations. */
export function DetailRoutes({
  details,
  children,
}: {
  details: readonly DetailContent<any, any>[];
  children: ReactNode;
}) {
  const [stack, setStack] = useState<readonly DetailEntry[]>([]);
  // A destination whose input was unusable; it replaces the current sheet until closed.
  const [failed, setFailed] = useState<DetailContent<unknown, unknown> | null>(
    null
  );
  const stackRef = useRef(stack);
  const focusOrigin = useRef<HTMLElement | SVGElement | null>(null);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  const targets = useMemo(() => {
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Detail IDs are an authoring contract.
    invariant(
      new Set(details.map(content => content.target.definition.id)).size ===
        details.length,
      'Detail IDs must be unique.'
    );
    return new Map(details.map(content => [content.target, content]));
  }, [details]);
  const navigation = useMemo<DetailNavigation>(
    () => ({
      open(target, input, trigger) {
        const content = targets.get(target as DetailView<unknown, unknown>);
        // oxlint-disable-next-line data-app/no-runtime-assertion -- Destinations are registered at runtime.
        invariant(
          content,
          'This detail destination is not registered on DataApp.'
        );
        const parsed = parseDetailInput(content.target, input);
        if (!stackRef.current.length) focusOrigin.current = trigger ?? null;
        const next = parsed && [
          ...stackRef.current,
          { content, input: parsed.input },
        ];
        if (!next || !writeRoute(next)) {
          setFailed(content);
          return;
        }
        setFailed(null);
        setStack(next);
      },
    }),
    [targets]
  );
  useEffect(() => {
    function sync() {
      const route = readRoute(details);
      if (!route?.length && stackRef.current.length) {
        const trigger = focusOrigin.current;
        requestAnimationFrame(() => {
          if (trigger?.isConnected && trigger.getClientRects().length)
            trigger.focus({ preventScroll: true });
        });
      }
      setStack(route ?? []);
    }
    sync();
    return subscribeSearch(sync);
  }, [details]);
  const current = stack.at(-1);
  return (
    <DetailNavigationContext value={navigation}>
      <InspectionProvider>
        {children}
        {failed ? (
          <Sheet
            open
            onOpenChange={open => {
              if (!open) setFailed(null);
            }}
            title={failed.target.definition.title}
            returnFocus={focusOrigin}
          >
            <DetailProblem />
          </Sheet>
        ) : (
          current && (
            <DetailSheet
              key={current.content.target.definition.id}
              entry={current}
              returnFocus={focusOrigin}
              onClose={() => {
                const trigger = focusOrigin.current;
                writeRoute([], 'replace');
                setStack([]);
                requestAnimationFrame(() => {
                  if (trigger?.isConnected && trigger.getClientRects().length)
                    trigger.focus({ preventScroll: true });
                });
              }}
            />
          )
        )}
      </InspectionProvider>
    </DetailNavigationContext>
  );
}

/** Render a destination in an inspection tab. The query starts only when that tab mounts. */
export function DetailRecords({
  content,
  input,
  navigation,
}: {
  content: DetailContent<any, any>;
  input: any;
  navigation?: DetailNavigation;
}) {
  const parsed = parseDetailInput(content.target, input);
  return parsed ? (
    <DetailNavigationContext value={navigation ?? null}>
      <DetailBody content={content} input={parsed.input} />
    </DetailNavigationContext>
  ) : (
    <DetailProblem />
  );
}
