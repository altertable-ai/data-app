import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { TrendChart } from '@/src/react/ui/TrendChart';

export type LineChartItem = ChartItem;
export type LineChartProps<Item extends ChartItem = ChartItem> =
  ValueChartProps<Item>;

/** Equally spaced finite samples in supplied order; fill missing periods explicitly.
 * Supports negative values, single points, and horizontal scrolling for long series.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function LineChart<Item extends ChartItem>(props: LineChartProps<Item>) {
  return <TrendChart {...props} />;
}
