import {
  createContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

type Cursor = { source: string; time: number };
type CursorStore = {
  snapshot: () => Cursor | null;
  subscribe: (listener: () => void) => () => void;
  publish: (source: string, time: number) => void;
  clear: (source: string) => void;
};
const groupBrand: unique symbol = Symbol('ChartCursorGroup');
/** Opaque shared-cursor handle. Create with useChartCursorGroup and pass through chart cursorGroup props. */
export type ChartCursorGroup = { readonly [groupBrand]: true };
const stores = new WeakMap<ChartCursorGroup, CursorStore>();

function createGroup(): ChartCursorGroup {
  const group: ChartCursorGroup = { [groupBrand]: true };
  let cursor: Cursor | null = null;
  const listeners = new Set<() => void>();
  function notify() {
    for (const listener of listeners) listener();
  }
  stores.set(group, {
    snapshot: () => cursor,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (source, time) => {
      if (
        !Number.isFinite(time) ||
        (cursor?.source === source && cursor.time === time)
      )
        return;
      cursor = { source, time };
      notify();
    },
    clear: source => {
      if (cursor?.source !== source) return;
      cursor = null;
      notify();
    },
  });
  return group;
}

/** Creates a stable shared mouse-hover cursor handle. Pass it explicitly to each participating chart's cursorGroup prop.
 * Peers indicate exact timestamp matches while tooltips remain local. Mouse leave clears the cursor.
 * Each hook call creates an independent group; handles can be passed through component props.
 * @example
 * function Dashboard() {
 *   const operations = useChartCursorGroup();
 *   const samples = [{ id: 'noon', label: '12:00', time: 1767268800000, value: 42 }];
 *   return <>
 *     <BarChart cursorGroup={operations} items={samples} unit="requests" ariaLabel="Traffic" />
 *     <LineChart cursorGroup={operations} items={samples} unit="ms" ariaLabel="Latency" />
 *   </>;
 * }
 */
export function useChartCursorGroup(): ChartCursorGroup {
  const [group] = useState(createGroup);
  return group;
}

function emptySubscribe() {
  return () => {};
}

/** A chart's handle on its cursor group. Stable for the chart's lifetime, so
 * publishing never re-renders the chart; peers subscribe with useLinkedCursorValue. */
export type LinkedChartCursor = {
  setTime: (time: number | undefined) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  /** The timestamp another chart in the group is hovering. */
  peerTime: () => number | undefined;
};

export const noLinkedChartCursor: LinkedChartCursor = {
  setTime: () => {},
  reset: () => {},
  subscribe: emptySubscribe,
  peerTime: () => undefined,
};

export function useLinkedChartCursor(
  group?: ChartCursorGroup
): LinkedChartCursor {
  const store = group == null ? undefined : stores.get(group);
  const id = useId();
  const cursor = useMemo<LinkedChartCursor>(
    () =>
      store
        ? {
            setTime: time => {
              if (time != null) store.publish(id, time);
              else store.clear(id);
            },
            reset: () => store.clear(id),
            subscribe: store.subscribe,
            peerTime: () => {
              const current = store.snapshot();
              return current?.source !== id ? current?.time : undefined;
            },
          }
        : noLinkedChartCursor,
    [store, id]
  );
  useEffect(() => cursor.reset, [cursor]);
  return cursor;
}

/** Subscribes to a derived peer cursor value. Return a primitive so only the
 * marks whose value changes re-render while the pointer moves. */
export function useLinkedCursorValue<T>(
  cursor: LinkedChartCursor,
  select: (time: number | undefined) => T
): T {
  return useSyncExternalStore(
    cursor.subscribe,
    () => select(cursor.peerTime()),
    () => select(undefined)
  );
}

export const ChartCursorChartContext = createContext<{
  mouseHover: boolean;
  cursor: LinkedChartCursor;
} | null>(null);
