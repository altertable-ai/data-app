import {
  MetricWidget as DisplayMetric,
  type MetricWidgetProps as DisplayMetricProps,
} from '@/src/react/ui/MetricWidget';
import {
  TableWidget as DisplayTable,
  type TableWidgetProps as DisplayTableProps,
  type TableDisplayMode,
} from '@/src/react/ui/TableWidget';
import {
  VisualizationWidget as DisplayVisual,
  type VisualizationWidgetProps as DisplayVisualProps,
} from '@/src/react/ui/VisualizationWidget';
import {
  DataWidget as DisplayData,
  type DataWidgetProps as DisplayDataProps,
} from '@/src/react/ui/DataWidget';
import {
  TextWidget as DisplayText,
  type TextWidgetProps as DisplayTextProps,
} from '@/src/react/ui/TextWidget';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { ReactNode } from 'react';
import type { MetricReading } from '@/src/core/reading';
import type { DataReading } from '@/src/core/reading';

type MetricPresentation = { metric: MetricDefinition; reading: MetricReading };
export type MetricWidgetProps<Source = unknown> = Omit<
  Extract<DisplayMetricProps, { metric: MetricDefinition }>,
  'metric' | 'reading'
> & {
  metric: { props: (source: Source) => MetricPresentation };
  source: Source;
};
export function MetricWidget<Source>({
  metric,
  source,
  ...presentation
}: MetricWidgetProps<Source>) {
  return <DisplayMetric {...presentation} {...metric.props(source)} />;
}

type BoundTableProps<Row> = Extract<
  DisplayTableProps<Row>,
  { reading: DataReading<readonly Row[]> }
>;
type TablePresentation<Row> = Pick<
  BoundTableProps<Row>,
  'title' | 'columns' | 'rowKey' | 'reading' | 'evidence' | 'emptyFallback'
>;
export type TableWidgetProps<Row, Source = unknown> = Omit<
  BoundTableProps<Row>,
  keyof TablePresentation<Row> | 'limit' | 'pagination'
> &
  TableDisplayMode & {
    dataset: { props: (source: Source) => TablePresentation<Row> };
    source: Source;
    title?: ReactNode;
  };
export function TableWidget<Row, Source>({
  dataset,
  source,
  title,
  ...presentation
}: TableWidgetProps<Row, Source>) {
  const data = dataset.props(source);
  return (
    <DisplayTable {...presentation} {...data} title={title ?? data.title} />
  );
}
export type VisualizationWidgetProps<Data = unknown> = Extract<
  DisplayVisualProps<Data>,
  { reading: DataReading<Data> }
>;
export function VisualizationWidget<Data>(
  props: VisualizationWidgetProps<Data>
) {
  return <DisplayVisual {...props} />;
}
export type DataWidgetProps<Data = unknown> = Extract<
  DisplayDataProps<Data>,
  { reading: DataReading<Data> }
>;
export function DataWidget<Data>(props: DataWidgetProps<Data>) {
  return <DisplayData {...props} />;
}
export type TextWidgetProps<Data = unknown> = Extract<
  DisplayTextProps<Data>,
  { reading: DataReading<Data> }
>;
export function TextWidget<Data>(props: TextWidgetProps<Data>) {
  return <DisplayText {...props} />;
}
