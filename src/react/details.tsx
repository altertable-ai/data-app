import { invariant } from '@/src/core/invariant';
import { ownedSource } from '@/src/react/source-owner';
import { DataSectionBoundary } from '@/src/react/ui/DataSectionBoundary';
import { InspectionContext } from '@/src/react/ui/InspectionContext';
import { Sheet } from '@/src/react/ui/Sheet';
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
    invariant(!!definition.id.trim(), 'A detail view needs a nonempty ID.');
  }

  content(render: (source: ViewSource<Data, Input>) => ReactNode) {
    const content = new DetailContent(this, render);
    this.#content = content;
    return content;
  }

  static content<Data, Input>(target: DetailView<Data, Input>) {
    invariant(
      target.#content,
      'A detail destination needs content before it can be opened.'
    );
    return target.#content;
  }
}

/** Validate destination input before it enters either navigation or a lazy records query. */
export function parseDetailInput<Data, Input>(
  target: DetailView<Data, Input>,
  value: unknown
): Input {
  const input = target.definition.parseInput(value);
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
  invariant(
    serializable(input),
    'Detail inputs must contain JSON scope and IDs.'
  );
  invariant(
    JSON.stringify(input).length <= 16_384,
    'Detail input exceeds its bound.'
  );
  return input;
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
  trigger: RefObject<HTMLElement | SVGElement | null>;
};

type RoutedDetail = { id: string; input: unknown };
const detailsParam = 'details';

function readRoute(
  details: readonly DetailContent<unknown, unknown>[]
): readonly DetailEntry[] | null {
  const raw = searchParams().get(detailsParam);
  if (!raw) return [];
  if (raw.length > 16_384) return null;
  try {
    const route = JSON.parse(raw) as unknown;
    if (!Array.isArray(route) || route.length > 20) return null;
    return route.map(item => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as RoutedDetail).id !== 'string'
      )
        throw new Error('Invalid detail route.');
      const content = details.find(
        candidate =>
          candidate.target.definition.id === (item as RoutedDetail).id
      );
      if (!content) throw new Error('Unknown detail route.');
      return {
        content,
        input: parseDetailInput(content.target, (item as RoutedDetail).input),
        trigger: { current: null },
      };
    });
  } catch {
    return null;
  }
}

function writeRoute(
  entries: readonly DetailEntry[],
  mode: 'push' | 'replace' = 'push'
) {
  const route = entries.map(entry => ({
    id: entry.content.target.definition.id,
    input: entry.input,
  }));
  writeSearch(
    {
      [detailsParam]: route.length ? JSON.stringify(route) : null,
      ...(route.length ? { about: null, tab: null } : {}),
    },
    mode
  );
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
  return (
    navigation ?? {
      open() {
        invariant(false, 'Detail navigation requires DataApp details.');
      },
    }
  );
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
  returnFocus: DetailEntry['trigger'];
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

/** Mounts one replacement sheet for a stack of detail destinations. */
export function DetailRoutes({
  details,
  children,
}: {
  details: readonly DetailContent<any, any>[];
  children: ReactNode;
}) {
  const [stack, setStack] = useState<readonly DetailEntry[]>([]);
  const stackRef = useRef(stack);
  const focusOrigin = useRef<HTMLElement | SVGElement | null>(null);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  const targets = useMemo(() => {
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
        invariant(
          content,
          'This detail destination is not registered on DataApp.'
        );
        const parsed = parseDetailInput(content.target, input);
        if (!stackRef.current.length) focusOrigin.current = trigger ?? null;
        const next = [
          ...stackRef.current,
          {
            content,
            input: parsed,
            trigger: { current: trigger ?? null },
          },
        ];
        writeRoute(next);
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
      if (!route) return setStack([]);
      setStack(previous =>
        route.map((entry, index) => ({
          ...entry,
          trigger:
            previous[index]?.content.target === entry.content.target &&
            JSON.stringify(previous[index]?.input) ===
              JSON.stringify(entry.input)
              ? previous[index].trigger
              : entry.trigger,
        }))
      );
    }
    sync();
    return subscribeSearch(sync);
  }, [details]);
  const current = stack.at(-1);
  return (
    <DetailNavigationContext value={navigation}>
      {children}
      {current && (
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
      )}
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
  return (
    <DetailNavigationContext value={navigation ?? null}>
      <DetailBody content={content} input={parsed} />
    </DetailNavigationContext>
  );
}
