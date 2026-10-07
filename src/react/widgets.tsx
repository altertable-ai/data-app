import {
  datasetTable,
  type Dataset,
  type ViewSource,
} from '@/src/react/bindings';
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
  type VisualizationWidgetView as DisplayVisualizationView,
} from '@/src/react/ui/VisualizationWidget';
import {
  TextWidget as DisplayText,
  type TextWidgetProps as DisplayTextProps,
} from '@/src/react/ui/TextWidget';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { ReactNode } from 'react';
import type { MetricReading } from '@/src/core/reading';
import type { DataReading } from '@/src/core/reading';

export type MetricWidgetProps<Source = unknown> = Omit<
  Extract<DisplayMetricProps, { metric: MetricDefinition }>,
  'metric' | 'reading'
> & {
  metric: {
    definition: MetricDefinition;
    read: (source: Source) => MetricReading;
  };
  source: Source;
};
export function MetricWidget<Source>({
  metric,
  source,
  ...presentation
}: MetricWidgetProps<Source>) {
  return (
    <DisplayMetric
      {...presentation}
      metric={metric.definition}
      reading={metric.read(source)}
    />
  );
}

type BoundTableProps<Row> = Extract<
  DisplayTableProps<Row>,
  { reading: DataReading<readonly Row[]> }
>;
type TablePresentation<Row> = Pick<
  BoundTableProps<Row>,
  'title' | 'columns' | 'rowKey' | 'reading' | 'evidence' | 'emptyFallback'
>;
export type TableWidgetProps<Row, Data = unknown, Input = unknown> = Omit<
  BoundTableProps<Row>,
  keyof TablePresentation<Row> | 'limit' | 'pagination'
> &
  TableDisplayMode & {
    dataset: Dataset<Data, Input, Row>;
    source: ViewSource<Data, Input>;
    title?: ReactNode;
  };
export function TableWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  ...presentation
}: TableWidgetProps<Row, Data, Input>) {
  const data = datasetTable(dataset, source);
  return (
    <DisplayTable {...presentation} {...data} title={title ?? data.title} />
  );
}
type BoundVisual<Row> = Extract<
  DisplayVisualProps<readonly Row[]>,
  { reading: DataReading<readonly Row[]> }
>;
export type VisualizationWidgetView<Row> = DisplayVisualizationView<
  readonly Row[]
>;
type VisualContent<Row> =
  | {
      children: (rows: readonly Row[]) => ReactNode;
      views?: never;
      viewLabel?: never;
      initialView?: never;
    }
  | {
      children?: never;
      views: readonly VisualizationWidgetView<Row>[];
      viewLabel: string;
      initialView?: string;
    };
export type VisualizationWidgetProps<
  Row,
  Data = unknown,
  Input = unknown,
> = Omit<
  BoundVisual<Row>,
  | 'reading'
  | 'isEmpty'
  | 'emptyFallback'
  | 'evidence'
  | 'title'
  | 'children'
  | 'views'
  | 'viewLabel'
  | 'initialView'
> &
  VisualContent<Row> & {
    dataset: Dataset<Data, Input, Row>;
    source: ViewSource<Data, Input>;
    title?: ReactNode;
  };
export function VisualizationWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  ...presentation
}: VisualizationWidgetProps<Row, Data, Input>) {
  const data = datasetTable(dataset, source);
  return (
    <DisplayVisual
      {...presentation}
      title={title ?? data.title}
      reading={data.reading}
      evidence={data.evidence}
      emptyFallback={data.emptyFallback}
      isEmpty={rows => rows.length === 0}
    />
  );
}
export type TextWidgetProps<Data = unknown> = Extract<
  DisplayTextProps<Data>,
  { reading: DataReading<Data> }
>;
export function TextWidget<Data>(props: TextWidgetProps<Data>) {
  return <DisplayText {...props} />;
}
