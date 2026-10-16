import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { resolveActions, type ExplorationActions } from '@/src/react/actions';
import { RegisteredBinding } from '@/src/react/bindings';
import { useDetailNavigation } from '@/src/react/details';
import { breakdownState, type BreakdownTarget } from '@/src/react/exploration';
import { Select } from '@/src/react/ui/Select';
import {
  ExplorationActionControl,
  type ItemActions,
} from '@/src/react/ui/ExplorationActionControl';
import {
  datasetTable,
  type Dataset,
  type Metric,
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
import { MetricRecords } from '@/src/react/bindings';

export type MetricWidgetProps<Data = unknown, Input = unknown> = Omit<
  Extract<DisplayMetricProps, { metric: MetricDefinition }>,
  'metric' | 'reading' | 'records'
> & {
  metric: Metric<Data, Input>;
  source: ViewSource<NoInfer<Data>, NoInfer<Input>>;
  records?: MetricRecords<Data, Input, any, any>;
  actions?: ExplorationActions<void, NoInfer<Input>>;
};
export function MetricWidget<Data, Input>({
  metric,
  source,
  records,
  actions,
  action,
  ...presentation
}: MetricWidgetProps<Data, Input>) {
  const navigation = useDetailNavigation();
  const itemActions = resolveActions(
    actions,
    metric,
    RegisteredBinding.owner(metric),
    source,
    (target, input, trigger) => navigation.open(target, input, trigger)
  );
  const [widgetElement, setWidgetElement] =
    useState<ComponentRef<'div'> | null>(null);
  const availableActions = itemActions(undefined);
  return (
    <DisplayMetric
      {...presentation}
      ref={setWidgetElement}
      metric={metric.definition}
      reading={metric.read(source)}
      action={
        action || availableActions.length ? (
          <>
            {action}
            <ExplorationActionControl
              actions={availableActions}
              ariaLabel={metric.definition.label}
            />
          </>
        ) : undefined
      }
      records={
        records
          ? MetricRecords.render(records, metric, source, {
              open(target, input) {
                navigation.open(
                  target,
                  input,
                  widgetElement?.querySelector('header button')
                );
              },
            })
          : undefined
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
    source: ViewSource<NoInfer<Data>, NoInfer<Input>>;
    title?: ReactNode;
    actions?: ExplorationActions<NoInfer<Row>, NoInfer<Input>>;
  };
export function TableWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  actions,
  ...presentation
}: TableWidgetProps<Row, Data, Input>) {
  const data = datasetTable(dataset, source);
  const navigation = useDetailNavigation();
  const itemActions = resolveActions(
    actions,
    dataset,
    RegisteredBinding.owner(dataset),
    source,
    (target, input, trigger) => navigation.open(target, input, trigger)
  );
  const hasRowActions =
    actions &&
    (data.reading.loading ||
      data.reading.value.some(row => itemActions(row).length > 0));
  return (
    <DisplayTable
      {...presentation}
      {...data}
      title={title ?? data.title}
      columns={
        hasRowActions
          ? [
              ...data.columns,
              {
                id: '$exploration-actions',
                header: 'Actions',
                cell: row => (
                  <ExplorationActionControl
                    actions={itemActions(row)}
                    ariaLabel={`${data.title}: ${data.rowKey(row)}`}
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
  render: (rows: readonly Row[], actions: ItemActions<Row>) => ReactNode;
};
type VisualContent<Row> =
  | {
      children: (rows: readonly Row[], actions: ItemActions<Row>) => ReactNode;
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
    source: ViewSource<NoInfer<Data>, NoInfer<Input>>;
    title?: ReactNode;
    actions?: ExplorationActions<NoInfer<Row>, NoInfer<Input>>;
    breakdown?: BreakdownTarget<any>;
  };
export function VisualizationWidget<Row, Data, Input>({
  dataset,
  source,
  title,
  actions,
  breakdown,
  children,
  views,
  viewLabel,
  initialView,
  ...presentation
}: VisualizationWidgetProps<Row, Data, Input>) {
  const data = datasetTable(dataset, source);
  const navigation = useDetailNavigation();
  const itemActions = resolveActions(
    actions,
    dataset,
    RegisteredBinding.owner(dataset),
    source,
    (target, input, trigger) => navigation.open(target, input, trigger)
  );
  const state =
    breakdown && breakdownState(breakdown, RegisteredBinding.owner(dataset));
  const controlRef = useRef<ComponentRef<'div'>>(null);
  const recoverFocus = useRef(false);
  useEffect(() => {
    if (recoverFocus.current) {
      recoverFocus.current = false;
      controlRef.current?.querySelector('button')?.focus();
    }
  }, [state?.value]);
  function resolvedActions(row: Row) {
    return itemActions(row).map(action => ({
      ...action,
      onSelect(trigger?: HTMLElement | SVGElement) {
        recoverFocus.current = true;
        action.onSelect(trigger);
      },
    }));
  }
  const action = state ? (
    <div ref={controlRef}>
      <Select
        label={state.variable.label ?? 'Break down by'}
        labelPlacement="inline"
        icon="breakdown"
        size="compact"
        align="end"
        options={state.options.map(level => ({
          id: level.id,
          label: level.label,
        }))}
        value={state.value}
        onChange={id => state.set(id)}
      />
    </div>
  ) : (
    presentation.action
  );
  const common = {
    ...presentation,
    action,
    title: title ?? data.title,
    reading: data.reading,
    evidence: data.evidence,
    emptyFallback: data.emptyFallback,
    isEmpty: (rows: readonly Row[]) => rows.length === 0,
  };
  return children ? (
    <DisplayVisual<readonly Row[]> {...common}>
      {rows => children(rows, resolvedActions)}
    </DisplayVisual>
  ) : (
    <DisplayVisual<readonly Row[]>
      {...common}
      views={views!.map(view => ({
        ...view,
        render: rows => view.render(rows, resolvedActions),
      }))}
      viewLabel={viewLabel!}
      initialView={initialView}
    />
  );
}

type NarrativeBinding<Data, Input, Row> =
  | {
      metric: Metric<Data, Input>;
      dataset?: never;
      source: ViewSource<NoInfer<Data>, NoInfer<Input>>;
      children?: (values: MetricValues) => ReactNode;
    }
  | {
      metric?: never;
      dataset: Dataset<Data, Input, Row>;
      source: ViewSource<NoInfer<Data>, NoInfer<Input>>;
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
