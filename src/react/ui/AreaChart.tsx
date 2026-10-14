import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { TrendChart } from '@/src/react/ui/TrendChart';

export type AreaChartItem = ChartItem;
export type AreaChartProps<Item extends ChartItem = ChartItem> =
  ValueChartProps<Item>;

/** Ordered finite samples filled to a zero baseline, including negative values.
 * Samples are equally spaced; supply missing periods explicitly.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function AreaChart<Item extends ChartItem>(props: AreaChartProps<Item>) {
  return <TrendChart {...props} area />;
}
