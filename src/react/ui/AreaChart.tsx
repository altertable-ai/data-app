import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { TrendChart } from '@/src/react/ui/TrendChart';

export type AreaChartItem = ChartItem;
export type AreaChartProps = ValueChartProps;

/** Ordered finite samples filled to a zero baseline, including negative values.
 * Samples are equally spaced; supply missing periods explicitly.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function AreaChart(props: AreaChartProps) {
  return <TrendChart {...props} area />;
}
