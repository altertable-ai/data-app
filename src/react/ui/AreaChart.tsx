import type { BarChartItem, BarChartProps } from '@/src/react/ui/BarChart';
import { TrendChart } from '@/src/react/ui/TrendChart';

export type AreaChartItem = BarChartItem;
export type AreaChartProps = BarChartProps;

/** Ordered, equally spaced samples with tooltips for individual values. */
export function AreaChart(props: AreaChartProps) {
  return <TrendChart {...props} area />;
}
