import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { WidgetStatus } from '@/src/react/ui/RequestHint';
import { VisualizationWidget } from '@/src/react/ui/VisualizationWidget';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import { AppIcon } from '@/src/react/ui/icons';
import {
  comparisonChange,
  type MetricComparison,
} from '@/src/react/ui/metric-comparison';
import { classNames } from '@/src/react/ui/classNames';
import { formatMetric, type MetricFormat } from '@/src/core/format';
import { Skeleton } from '@/src/react/ui/Skeleton';
import type { MetricReading } from '@/src/core/reading';
import { metricComparison, type MetricDefinition } from '@/src/react/ui/metric';

type MetricWidgetBaseProps = {
  label: string;
  description?: ReactNode;
  comparison?: MetricComparison;
  evidence?: WidgetEvidence;
  action?: ReactNode;
  insight?: ReactNode;
  status?: WidgetStatus;
  visual?: ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'about' | 'children'>;

type UnboundMetricWidgetProps = MetricWidgetBaseProps &
  (
    | { loading: true; value?: never; format?: never; content?: never }
    | ({ loading?: false } & (
        | { value: number; format: MetricFormat; content?: never }
        | { content: ReactNode; value?: never; format?: never }
      ))
  );

export type MetricWidgetProps =
  | UnboundMetricWidgetProps
  | (Omit<MetricWidgetBaseProps, 'label' | 'comparison' | 'evidence'> & {
      metric: MetricDefinition;
      reading: MetricReading;
      label?: never;
      value?: never;
      format?: never;
      content?: never;
      comparison?: never;
      evidence?: never;
      loading?: never;
    });

export function MetricWidget(props: MetricWidgetProps) {
  if ('metric' in props) {
    const { metric, reading, ...rest } = props;
    if (reading.loading)
      return <MetricWidgetContent {...rest} label={metric.label} loading />;

    return (
      <MetricWidgetContent
        {...rest}
        label={metric.label}
        value={reading.value.current}
        format={metric.format}
        evidence={metric.evidence}
        comparison={metricComparison(metric, reading)}
      />
    );
  }

  return <MetricWidgetContent {...props} />;
}

function MetricWidgetContent({
  label,
  value,
  content,
  format,
  loading = false,
  description,
  comparison,
  evidence,
  action,
  insight,
  status,
  visual,
  className,
  ...props
}: UnboundMetricWidgetProps) {
  return (
    <VisualizationWidget
      {...props}
      className={classNames('altertable-metric-widget', className)}
      title={label}
      evidence={loading ? undefined : evidence}
      aria-busy={loading || props['aria-busy']}
      action={action}
      status={status}
      insight={
        insight != null && (
          <div className="altertable-metric-insight">{insight}</div>
        )
      }
      visual={
        <MetricVisual
          loading={loading}
          value={value}
          content={content}
          format={format}
          comparison={comparison}
          description={description}
          visual={visual}
        />
      }
    />
  );
}

function MetricVisual({
  loading,
  value,
  content,
  format,
  comparison,
  description,
  visual,
}: {
  loading: boolean;
  value?: number;
  content?: ReactNode;
  format?: MetricFormat;
  comparison?: MetricComparison;
  description?: ReactNode;
  visual?: ReactNode;
}) {
  const shownValue = format ? formatMetric(value as number, format) : content;
  const change = comparison ? comparisonChange(comparison) : null;
  const shownTrend =
    change?.percent != null ? (
      <span className="altertable-metric-change" data-tone={change.tone}>
        <AppIcon name={change.icon} size={14} />
        {Math.abs(change.percent).toFixed(1)}% vs{' '}
        {comparison?.previous?.periodLabel?.toLowerCase() ?? 'previous period'}
      </span>
    ) : comparison?.previous?.value === null ? (
      <span className="altertable-metric-change" data-tone="neutral">
        Previous period unavailable
      </span>
    ) : null;
  const reading = (
    <div className="altertable-metric-reading">
      <strong
        className="altertable-metric-value"
        data-unavailable={shownValue === '—' || undefined}
      >
        {loading ? (
          <Skeleton className="altertable-metric-loading-value" />
        ) : (
          shownValue
        )}
      </strong>
      {shownTrend && (
        <span className="altertable-metric-trend">{shownTrend}</span>
      )}
    </div>
  );
  const visualization = visual && (
    <div className="altertable-metric-visual">{visual}</div>
  );
  return (
    <>
      {reading}
      {description && (
        <small className="altertable-metric-description">{description}</small>
      )}
      {visualization}
    </>
  );
}
