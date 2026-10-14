import {
  useExplorationActions,
  ExplorationActionControl,
  type BoundExplorationActions,
} from '@/src/react/action-controls';
import { invariant } from '@/src/core/invariant';
import { useDetailRecords } from '@/src/react/details';
import { BreakdownControl } from '@/src/react/breakdown-control';
import type { BreakdownTarget } from '@/src/react/actions';
import type { ExplorationActions } from '@/src/react/actions';
import {
  datasetTable,
  type Dataset,
  type Metric,
  type MetricRecords,
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
import { formatMetric } from '@/src/core/format';
import {
  DataValue as DisplayValue,
  type DataValueProps as DisplayValueProps,
} from '@/src/react/ui/DataValue';
import { Skeleton } from '@/src/react/ui/Skeleton';
import type { MetricValues } from '@/src/core/reading';
import type { MetricDefinition } from '@/src/react/ui/metric';
import type { ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';

export type MetricWidgetProps<Data = unknown, Input = unknown> = Omit<
  Extract<DisplayMetricProps, { metric: MetricDefinition }>,
  'metric' | 'reading' | 'records'
> & {
  metric: Metric<Data, Input>;
  source: ViewSource<Data, Input>;
  actions?: ExplorationActions<void, Input>;
  records?: MetricRecords<Input>;
};
export function MetricWidget<Data, Input>({
  metric,
  source,
  actions,
  action: authoredAction,
  records,
  ...presentation
}: MetricWidgetProps<Data, Input>) {
  const action = useExplorationActions(actions, source, metric);
  invariant(
    !records || records.binding === metric,
    'Records must belong to the widget metric.'
  );
  const recordContent = useDetailRecords(
    !source.loading && records ? records.request(source.input) : undefined
  );
  return (
    <DisplayMetric
      {...presentation}
      metric={metric.definition}
      reading={metric.read(source)}
      records={recordContent}
      action={
        <>
          {authoredAction}
          {action && (
            <ExplorationActionControl actions={action} row={undefined} />
          )}
        </>
      }
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
    actions?: ExplorationActions<Row, Input>;
  };
export function TableWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  actions,
  ...presentation
}: TableWidgetProps<Row, Data, Input>) {
  const { rowLabel, ...data } = datasetTable(dataset, source);
  const action = useExplorationActions(actions, source, dataset);
  return (
    <DisplayTable
      {...presentation}
      {...data}
      title={title ?? data.title}
      columns={
        action
          ? [
              ...data.columns,
              {
                id: 'exploration-actions',
                header: 'Explore',
                cell: row => (
                  <ExplorationActionControl
                    actions={action}
                    row={row}
                    label={rowLabel(row)}
                  />
                ),
              },
            ]
          : data.columns
      }
    />
  );
}
type BoundVisual<Row> = Extract<
  DisplayVisualProps<readonly Row[]>,
  { reading: DataReading<readonly Row[]> }
>;
export type VisualizationWidgetView<Row> = Omit<
  DisplayVisualizationView<readonly Row[]>,
  'render'
> & {
  render: (
    rows: readonly Row[],
    actions: BoundExplorationActions<Row> | undefined
  ) => ReactNode;
};
type VisualContent<Row> =
  | {
      children: (
        rows: readonly Row[],
        actions: BoundExplorationActions<Row> | undefined
      ) => ReactNode;
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
    actions?: ExplorationActions<Row, Input>;
    /** Chart-owned aggregation over a shared hierarchy scope. */
    breakdown?: BreakdownTarget<Input>;
  };
export function VisualizationWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  actions,
  breakdown,
  ...presentation
}: VisualizationWidgetProps<Row, Data, Input>) {
  const action = useExplorationActions(actions, source, dataset);
  const data = datasetTable(dataset, source);
  const { children, views, viewLabel, initialView, ...shell } = presentation;
  return (
    <DisplayVisual<readonly Row[]>
      {...shell}
      data-breakdown-target={breakdown?.navigationId}
      action={
        breakdown ? (
          <>
            <BreakdownControl target={breakdown} source={source} />
            {shell.action}
          </>
        ) : (
          shell.action
        )
      }
      title={title ?? data.title}
      reading={data.reading}
      evidence={data.evidence}
      emptyFallback={data.emptyFallback}
      isEmpty={rows => rows.length === 0}
      {...(views
        ? {
            views: views.map(view => ({
              ...view,
              render: rows => view.render(rows, action),
            })),
            viewLabel,
            initialView,
          }
        : { children: rows => children(rows, action) })}
    />
  );
}
type NarrativeBinding<Data, Input, Row> =
  | {
      metric: Metric<Data, Input>;
      dataset?: never;
      source: ViewSource<Data, Input>;
      children?: (values: MetricValues) => ReactNode;
    }
  | {
      metric?: never;
      dataset: Dataset<Data, Input, Row>;
      source: ViewSource<Data, Input>;
      children: (rows: readonly Row[]) => ReactNode;
    };
export type TextWidgetProps<
  Data = unknown,
  Input = unknown,
  Row = never,
> = Omit<
  Extract<DisplayTextProps<unknown>, { reading: DataReading<unknown> }>,
  'reading' | 'evidence' | 'children' | 'title' | 'emptyFallback'
> &
  NarrativeBinding<Data, Input, Row> & { title?: ReactNode };
export function TextWidget<Data, Input, Row>(
  props: TextWidgetProps<Data, Input, Row>
) {
  if (props.metric) {
    const { metric, source, title, children, ...presentation } = props;
    return (
      <DisplayText
        {...presentation}
        title={title ?? metric.definition.label}
        evidence={metric.definition.evidence}
        reading={metric.read(source)}
      >
        {children ??
          (values => formatMetric(values.current, metric.definition.format))}
      </DisplayText>
    );
  }
  const { dataset, source, title, children, ...presentation } = props;
  return (
    <DisplayText
      {...presentation}
      title={title ?? dataset.name}
      evidence={dataset.evidence}
      reading={dataset.read(source)}
    >
      {children}
    </DisplayText>
  );
}

type InlinePresentation = Omit<
  DisplayValueProps<unknown>,
  'reading' | 'children' | 'loadingFallback'
> & { loadingFallback?: ReactNode };
export type DataValueProps<
  Data = unknown,
  Input = unknown,
  Row = never,
> = InlinePresentation &
  (
    | (NarrativeBinding<Data, Input, Row> & { scope?: never })
    | {
        metric?: never;
        dataset?: never;
        source?: never;
        scope: DataReading<string>;
        children?: (scope: string) => ReactNode;
      }
  );
export function DataValue<Data, Input, Row>(
  props: DataValueProps<Data, Input, Row>
) {
  if (props.metric) {
    const {
      metric,
      source,
      children,
      loadingFallback = <Skeleton inline />,
      ...presentation
    } = props;
    return (
      <DisplayValue
        {...presentation}
        reading={metric.read(source)}
        loadingFallback={loadingFallback}
      >
        {children ??
          (values => formatMetric(values.current, metric.definition.format))}
      </DisplayValue>
    );
  }
  if (props.dataset) {
    const {
      dataset,
      source,
      children,
      loadingFallback = <Skeleton inline />,
      ...presentation
    } = props;
    return (
      <DisplayValue
        {...presentation}
        reading={dataset.read(source)}
        loadingFallback={loadingFallback}
      >
        {children}
      </DisplayValue>
    );
  }
  const {
    scope,
    children,
    loadingFallback = <Skeleton inline />,
    ...presentation
  } = props;
  return (
    <DisplayValue
      {...presentation}
      reading={scope}
      loadingFallback={loadingFallback}
    >
      {children ?? (value => value)}
    </DisplayValue>
  );
}
