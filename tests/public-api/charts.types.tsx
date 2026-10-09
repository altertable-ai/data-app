import {
  AreaChart,
  BarChart,
  ChartLegend,
  ComposedChart,
  LineChart,
  PieChart,
  type ComposedChartProps,
  type LineChartProps,
} from '@altertable/data-app/react/ui';

// Compile public declarations as an app would: existing item props and composable row props.
const items = [{ id: 'jan', label: 'Jan', value: 12 }] as const;
const existing: LineChartProps = {
  items,
  unit: 'ms',
  ariaLabel: 'Latency',
  formatValue: value => value.toFixed(1),
};
type Row = {
  month: string;
  timestamp: number;
  revenue: number;
  target: number | null;
};
const rows: readonly Row[] = [
  { month: 'Jan', timestamp: 0, revenue: 12, target: null },
];
const composed: ComposedChartProps<Row> = {
  data: rows,
  ariaLabel: 'Monthly revenue and target',
  className: 'app-revenue',
};
// @ts-expect-error Accessible chart names are required, as for standalone charts.
const missingName: ComposedChartProps<Row> = { data: rows };

const charts = (
  <>
    <BarChart {...existing} />
    <LineChart {...existing} />
    <AreaChart {...existing} />
    <PieChart {...existing} showLegend={false} />
    <ComposedChart {...composed}>
      <ComposedChart.XAxis<Row> dataKey="month" />
      <ComposedChart.XAxis<Row>
        dataKey="timestamp"
        type="number"
        xAxisId="time"
        hide
      />
      <ComposedChart.YAxis yAxisId="revenue" />
      <ComposedChart.Bar<Row> dataKey="revenue" yAxisId="revenue" />
      <ComposedChart.Bar<Row> dataKey="target" yAxisId="revenue" />
      <ComposedChart.Line<Row>
        dataKey="target"
        dot={true}
        activeDot={false}
        connectNulls={false}
        yAxisId="revenue"
      />
      <ComposedChart.Area<Row>
        dataKey="revenue"
        dot={false}
        yAxisId="revenue"
      />
      <ComposedChart.Tooltip />
      <ComposedChart.Legend maxVisibleItems={6} />
    </ComposedChart>
    <ChartLegend>
      <ChartLegend.Item>
        <ChartLegend.Marker kind="line" />
        <ChartLegend.Label>Target</ChartLegend.Label>
      </ChartLegend.Item>
    </ChartLegend>
  </>
);
void charts;
void missingName;

// @ts-expect-error Marker geometry must be deliberate when composing a legend.
const unspecifiedMarker = <ChartLegend.Marker color="var(--atbl-chart-1)" />;
void unspecifiedMarker;
