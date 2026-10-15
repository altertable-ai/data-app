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

function validateChartIds(kind: string, items: readonly { id: string }[]) {
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
  }
}

export function validateValueChartItems(
  kind: ValueChartKind,
  items: readonly ChartItem[]
): void {
  validateChartIds(kind, items);
  for (const item of items) {
    invariant(
      Number.isFinite(item.value),
      `${kind} chart "${item.id}" requires finite values.`
    );
    invariant(
      (kind !== 'bar' && kind !== 'pie') || item.value >= 0,
      `${kind} chart "${item.id}" requires nonnegative values.`
    );
  }
}

export function validateScatterChartItems(
  items: readonly ScatterChartItem[]
): void {
  validateChartIds('scatter', items);
  for (const item of items) {
    invariant(
      Number.isFinite(item.x) && Number.isFinite(item.y),
      `scatter chart "${item.id}" requires finite values for x and y.`
    );
  }
}
