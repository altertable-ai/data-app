import {
  invariant,
  resolveFilterInput,
  type FilterCollection,
} from '@altertable/data-app/internal';
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

import type { ViewSource } from './bindings.ts';
import { ownedSource } from './source-owner.ts';
import { DataSectionBoundary } from './ui/DataSectionBoundary.tsx';
import { InspectionContext } from './ui/InspectionContext.tsx';
import {
  InspectionOwner,
  InspectionProvider,
} from './ui/InspectionProvider.tsx';
import { searchParams, subscribeSearch, writeSearch } from './ui/search.ts';
import { Sheet } from './ui/Sheet.tsx';
import type { ViewResult } from './view-runtime.tsx';
import type { ViewEmptiness } from './view.ts';

export type DetailViewDefinition<Data, Input> = {
  id: string;
  title: ReactNode;
  /** Validates untrusted navigation input before a detail operation can run. */
  parseInput: (input: unknown) => Input;
  describeInput: (input: Input) => string;
} & ViewEmptiness<Data>;

/** A typed, query-backed destination. Interactions supply its own fields (`Own`);
 * the filters its operation reads carry over from the displayed scope. */
export class DetailView<Data, Input, Own = Input> {
  declare readonly ownInput?: Own;
  #content?: DetailContent<Data, Input>;
  #filters: FilterCollection;
  constructor(
    readonly definition: DetailViewDefinition<Data, Input> &
      Required<ViewEmptiness<Data>>,
    readonly useResult: (input: Input) => ViewResult<Data, Input>,
    filters: FilterCollection = {}
  ) {
    invariant(!!definition.id.trim(), 'A detail view needs a nonempty ID.');
    this.#filters = filters;
  }

  /** The destination input: each filter it reads as displayed (or as currently
   * selected when the source does not read it), then the interaction's own fields
   * and narrowed filters. */
  static inputFrom(
    target: DetailView<any, any, any>,
    own: object,
    displayedInput: unknown
  ): unknown {
    const filters = target.#filters;
    const shown = (displayedInput ?? {}) as Record<string, unknown>;
    const params = searchParams();
    const selected = resolveFilterInput(
      filters,
      Object.fromEntries(
        Object.entries(filters).map(([name, filter]) => [
          name,
          filter.read(params),
        ])
      ) as never
    ) as Record<string, unknown>;
    const scope = Object.fromEntries(
      Object.keys(filters).map(name => [
        name,
        Object.hasOwn(shown, name) ? shown[name] : selected[name],
      ])
    );
    return { ...scope, ...(own as object) };
  }

  content(render: (source: ViewSource<Data, Input>) => ReactNode) {
    const content = new DetailContent(this, render);
    this.#content = content;
    return content;
  }

  static content<Data, Input>(target: DetailView<Data, Input, any>) {
    invariant(
      target.#content,
      'A detail destination needs content before it can be opened.'
    );
    return target.#content;
  }
}

/** Validate destination input before it enters either navigation or a lazy records query. */
export function parseDetailInput<Data, Input>(
  target: DetailView<Data, Input, any>,
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
    readonly target: DetailView<Data, Input, any>,
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

function validateRoute(value: unknown) {
  invariant(
    Array.isArray(value) &&
      value.every(
        item => item && typeof item === 'object' && typeof item.id === 'string'
      ),
    'Invalid detail route.'
  );
  const serialized = JSON.stringify(value);
  invariant(
    value.length <= maxDetailRouteDepth &&
      serialized.length <= maxDetailRouteLength,
    'Detail route exceeds its bound.'
  );
  return { route: value as RoutedDetail[], serialized };
}

function readRoute(
  details: readonly DetailContent<unknown, unknown>[]
): readonly DetailEntry[] | null {
  const raw = searchParams().get(detailsParam);
  if (!raw) return [];
  if (raw.length > maxDetailRouteLength) return null;
  try {
    const { route } = validateRoute(JSON.parse(raw));
    return route.map(item => {
      const content = details.find(
        candidate => candidate.target.definition.id === item.id
      );
      if (!content) throw new Error('Unknown detail route.');
      return {
        content,
        input: parseDetailInput(content.target, item.input),
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
  const { serialized } = validateRoute(
    entries.map(entry => ({
      id: entry.content.target.definition.id,
      input: entry.input,
    }))
  );
  writeSearch(
    {
      [detailsParam]: entries.length ? serialized : null,
      ...(entries.length ? { about: null, tab: null } : {}),
    },
    mode
  );
}

export type DetailNavigation = {
  open<Data, Input>(
    target: DetailView<Data, Input, any>,
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
        const content = targets.get(
          target as DetailView<unknown, unknown, any>
        );
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
  return (
    <DetailNavigationContext value={navigation ?? null}>
      <DetailBody content={content} input={parsed} />
    </DetailNavigationContext>
  );
}
