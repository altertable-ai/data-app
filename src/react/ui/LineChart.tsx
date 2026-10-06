import type { BarChartItem, BarChartProps } from '@/src/react/ui/BarChart';
import { TrendChart } from '@/src/react/ui/TrendChart';

export type LineChartItem = BarChartItem;
export type LineChartProps = BarChartProps;

/** Ordered, equally spaced samples with tooltips for individual values. */
export function LineChart(props: LineChartProps) {
  return <TrendChart {...props} />;
}
