import { type ChartItem, type ValueChartProps } from './chart-data.ts';
import { TrendChart } from './TrendChart.tsx';

export type AreaChartItem = ChartItem;
export type AreaChartProps<Row extends AreaChartItem = AreaChartItem> =
  ValueChartProps<Row>;

/** Ordered finite samples filled to a zero baseline, including negative values.
 * Samples are equally spaced; supply missing periods explicitly.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function AreaChart<Row extends AreaChartItem>(
  props: AreaChartProps<Row>
) {
  return <TrendChart {...props} kind="area" />;
}
