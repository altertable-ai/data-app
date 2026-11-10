import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { createContext, useContext, useState } from 'react';

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
  toggle: (key: string) => void;
  showAll: () => void;
};

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
  const focusedIds = visibleIds?.size ? visibleIds : null;
  function toggle(id: string) {
    setStoredFocusedIds(() => {
      if (!focusedIds) return new Set([id]);
      const next = new Set(focusedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next.size ? next : null;
    });
  }
  return {
    hoveredId,
    setHoveredId,
    focusedIds,
    toggle,
    showAll: () => setStoredFocusedIds(null),
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
