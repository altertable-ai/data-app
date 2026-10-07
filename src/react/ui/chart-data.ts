import { invariant } from '@/src/core/invariant';

/** Ordered category or time-series sample. IDs are unique and nonblank; values are finite. */
export type ChartItem = { id: string; label: string; value: number };
export type ValueChartProps = {
  /** Ordered samples; the chart validates IDs and values when rendering. */
  items: readonly ChartItem[];
  unit: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
};

/** Independent observation on two finite numeric axes. */
export type ScatterChartItem = {
  id: string;
  label: string;
  x: number;
  y: number;
};
type ChartKind = 'bar' | 'line' | 'area' | 'pie' | 'scatter';
type ItemFor<Kind extends ChartKind> = Kind extends 'scatter'
  ? ScatterChartItem
  : ChartItem;
/** Validate the data consumed by every chart. */
export function validateChartItems<Kind extends ChartKind>(
  kind: Kind,
  items: readonly ItemFor<Kind>[]
): void {
  const ids = new Set<string>();
  for (const item of items) {
    invariant(
      item.id.trim().length > 0,
      `${kind} chart IDs must be nonempty and unique: blank ID.`
    );
    invariant(
      !ids.has(item.id),
      `${kind} chart IDs must be nonempty and unique: duplicate "${item.id}".`
    );
    ids.add(item.id);
    if (kind === 'scatter') {
      const point = item as ScatterChartItem;
      invariant(
        Number.isFinite(point.x) && Number.isFinite(point.y),
        `scatter chart "${item.id}" requires finite values for x and y.`
      );
    } else {
      const point = item as ChartItem;
      invariant(
        Number.isFinite(point.value),
        `${kind} chart "${item.id}" requires finite values.`
      );
      invariant(
        (kind !== 'bar' && kind !== 'pie') || point.value >= 0,
        `${kind} chart "${item.id}" requires nonnegative values.`
      );
    }
  }
}
