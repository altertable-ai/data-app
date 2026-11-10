import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export function chartLegendSeriesKey(id: unknown, dataKey: unknown) {
  if (typeof id === 'string' || typeof id === 'number')
    return ['series', typeof id, id].join(KEY_SEPARATOR);
  if (typeof dataKey === 'string' || typeof dataKey === 'number')
    return ['data', typeof dataKey, dataKey].join(KEY_SEPARATOR);
  return null;
}

export type ChartLegendInteraction = {
  hoveredKey: string | null;
  focusedKeys: ReadonlySet<string> | null;
  hover: (key: string | null) => void;
  toggle: (key: string, keys: readonly string[]) => void;
  isolate: (key: string) => void;
};

export function toggleLegendVisibility(
  visible: ReadonlySet<string> | null,
  key: string,
  keys: readonly string[]
) {
  const next = visible ? new Set(visible) : new Set(keys);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next.size === new Set(keys).size ? null : next;
}

export function isolateLegendVisibility(
  visible: ReadonlySet<string> | null,
  key: string
) {
  if (
    visible &&
    (!visible.has(key) || (visible.size === 1 && visible.has(key)))
  )
    return null;
  return new Set([key]);
}

/** Delay pointer clicks so a double-click performs one isolate action. */
export function useLegendClickActions(
  toggle: (key: string) => void,
  isolate: (key: string) => void
) {
  const pending = useRef<{
    key: string;
    timer: ReturnType<typeof setTimeout>;
    toggle: (key: string) => void;
  } | null>(null);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    []
  );
  return {
    click: (key: string, detail: number) => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        if (pending.current.key !== key)
          pending.current.toggle(pending.current.key);
        pending.current = null;
      }
      if (detail === 0) toggle(key);
      else {
        const timer = setTimeout(() => {
          pending.current = null;
          toggle(key);
        }, 500);
        pending.current = { key, timer, toggle };
      }
    },
    doubleClick: (key: string) => {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      isolate(key);
    },
  };
}

export const ChartLegendInteractionContext =
  createContext<ChartLegendInteraction | null>(null);

export function useChartLegendSeries(id: unknown, dataKey: unknown) {
  const interaction = useContext(ChartLegendInteractionContext);
  const key = chartLegendSeriesKey(id, dataKey);
  return {
    hidden: !!(
      key &&
      interaction?.focusedKeys &&
      !interaction.focusedKeys.has(key)
    ),
    dimmed: !!(
      key &&
      interaction?.hoveredKey &&
      (!interaction.focusedKeys ||
        interaction.focusedKeys.has(interaction.hoveredKey)) &&
      interaction.hoveredKey !== key
    ),
  };
}

export function useChartLegendFocus(ids: readonly string[]) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [storedFocusedIds, setStoredFocusedIds] =
    useState<ReadonlySet<string> | null>(null);
  const available = new Set(ids);
  const visibleIds =
    storedFocusedIds &&
    new Set([...storedFocusedIds].filter(id => available.has(id)));
  const focusedIds = visibleIds;
  function toggle(id: string) {
    setStoredFocusedIds(current => toggleLegendVisibility(current, id, ids));
  }
  function isolate(id: string) {
    setStoredFocusedIds(current => isolateLegendVisibility(current, id));
  }
  return {
    hoveredId,
    setHoveredId,
    focusedIds,
    toggle,
    isolate,
    visible: (id: string) => !focusedIds || focusedIds.has(id),
    opacity: (id: string) =>
      focusedIds && !focusedIds.has(id)
        ? 0
        : hoveredId &&
            (!focusedIds || focusedIds.has(hoveredId)) &&
            hoveredId !== id
          ? 0.2
          : 1,
  };
}
