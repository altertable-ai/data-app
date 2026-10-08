import type { ComponentProps } from 'react';
import { ComposedChartLegend as Legend } from '@/src/react/ui/ComposedChartLegend';
import {
  ComposedChart as RechartsComposedChart,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  Cell,
  Label,
  LabelList,
  ErrorBar,
} from 'recharts';

import {
  ChartBar as Bar,
  ChartDot as Dot,
  ChartLine as Line,
  ChartArea as Area,
  ChartScatter as Scatter,
  ChartXAxis as XAxis,
  ChartYAxis as YAxis,
  ChartGrid as CartesianGrid,
  ChartTooltip as Tooltip,
} from '@/src/react/ui/chart-primitives';

export type ComposedChartProps<Row = unknown> = Omit<
  ComponentProps<typeof RechartsComposedChart<Row>>,
  'data' | 'title'
> & {
  /** Displayed rows; series and axes select fields with Recharts dataKey props. */
  data: readonly Row[];
  /** Describes the measures and scope for assistive technology. */
  ariaLabel: string;
};

/** Compose Cartesian series inside VisualizationWidget. Defaults to responsive
 * full width and 300px height. Children retain native Recharts props and behavior,
 * including stacking, numeric/time axes, missing values, tooltips, and keyboard
 * navigation. Use public chart tokens for series colors. Dataset bindings own
 * loading, empty results, evidence, and CSV; this primitive owns only the plot. */
function ComposedChartRoot<Row>({
  data,
  ariaLabel,
  width = '100%',
  height = 300,
  responsive = true,
  className,
  ...props
}: ComposedChartProps<Row>) {
  return (
    <section
      className={['altertable-composed-chart', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
    >
      <RechartsComposedChart
        data-atbl-focus="inset"
        {...props}
        data={data}
        width={width}
        height={height}
        responsive={responsive}
        title={ariaLabel}
      />
    </section>
  );
}

/** Shared themed series and controls; other children retain native Recharts defaults. */
export const ComposedChart = Object.assign(ComposedChartRoot, {
  Dot,
  Area,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  Cell,
  Label,
  LabelList,
  ErrorBar,
});
