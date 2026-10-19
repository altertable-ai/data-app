import { type ChartItem, type ValueChartProps } from './chart-data.ts';
import { TrendChart } from './TrendChart.tsx';

export type LineChartItem = ChartItem;
export type LineChartProps<Row extends LineChartItem = LineChartItem> =
  ValueChartProps<Row>;

/** Equally spaced finite samples in supplied order; fill missing periods explicitly.
 * Supports negative values, single points, and horizontal scrolling for long series.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function LineChart<Row extends LineChartItem>(
  props: LineChartProps<Row>
) {
  return <TrendChart {...props} kind="line" />;
}
