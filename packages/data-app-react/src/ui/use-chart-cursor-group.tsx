import {
  createContext,
  useCallback,
  useEffect,
  useId,
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

function emptySnapshot() {
  return null;
}
function emptySubscribe() {
  return () => {};
}

export function useLinkedChartCursor(group?: ChartCursorGroup) {
  const store = group == null ? undefined : stores.get(group);
  const cursor = useSyncExternalStore(
    store?.subscribe ?? emptySubscribe,
    store?.snapshot ?? emptySnapshot,
    emptySnapshot
  );
  const id = useId();
  const setTime = useCallback(
    (time: number | undefined) => {
      if (time != null) store?.publish(id, time);
      else store?.clear(id);
    },
    [store, id]
  );
  const reset = useCallback(() => store?.clear(id), [store, id]);
  useEffect(() => reset, [reset]);
  return {
    time: cursor?.source !== id ? cursor?.time : undefined,
    setTime,
    reset,
  };
}

export const ChartCursorChartContext = createContext<{
  mouseHover: boolean;
  cursor: ReturnType<typeof useLinkedChartCursor>;
} | null>(null);
