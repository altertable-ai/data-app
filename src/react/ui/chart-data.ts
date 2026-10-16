import type { ItemActions } from '@/src/react/ui/ExplorationActionControl';

/** Ordered category or time-series sample. IDs are unique and nonblank; values are finite. */
export type ChartItem = { id: string; label: string; value: number };
export type ValueChartProps<Row extends ChartItem = ChartItem> = {
  /** Ordered samples; the chart validates IDs and values when rendering. */
  items: readonly Row[];
  /** Actions available for each displayed item. Domain fields remain available to this callback. */
  itemActions?: ItemActions<Row>;
  unit: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
};

export type CountChartProps = {
  /** Accessible measure and scope description. */
  ariaLabel: string;
  /** Population unit, such as users or sessions. */
  unit: string;
  /** Formats counts; rates use percentage formatting. */
  formatValue?: (value: number) => string;
  className?: string;
};

/** Independent observation on two finite numeric axes. */
export type ScatterChartItem = {
  id: string;
  label: string;
  x: number;
  y: number;
};
type ValueChartKind = 'bar' | 'line' | 'area' | 'pie';

/** Describe the first blank or duplicate item ID; IDs key rows, legends, and actions. */
export function chartIdProblem(
  kind: string,
  items: readonly { id: string }[]
): string | undefined {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id.trim())
      return `${kind} chart IDs must be nonempty and unique: blank ID.`;
    if (ids.has(item.id))
      return `${kind} chart IDs must be nonempty and unique: duplicate "${item.id}".`;
    ids.add(item.id);
  }
  return undefined;
}

/** Describe the first displayed value a chart cannot plot. */
export function valueChartProblem(
  kind: ValueChartKind,
  items: readonly ChartItem[]
): string | undefined {
  for (const item of items) {
    if (!Number.isFinite(item.value))
      return `${kind} chart "${item.id}" requires finite values.`;
    if ((kind === 'bar' || kind === 'pie') && item.value < 0)
      return `${kind} chart "${item.id}" requires nonnegative values.`;
  }
  return undefined;
}

export function scatterChartProblem(
  items: readonly ScatterChartItem[]
): string | undefined {
  const item = items.find(
    item => !Number.isFinite(item.x) || !Number.isFinite(item.y)
  );
  return (
    item && `scatter chart "${item.id}" requires finite values for x and y.`
  );
}
