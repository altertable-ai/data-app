import { type MetricReading } from '@altertable/data-app/internal';

import { useDateFormatting } from '../date-formatting.ts';
import { ContentSkeleton } from './ContentSkeleton.tsx';
import { AppIcon } from './icons.ts';
import {
  comparisonChange,
  type MetricComparison,
} from './metric-comparison.ts';
import { type MetricDefinition, metricComparison } from './metric.ts';

type UnboundComparisonProps = MetricComparison & {
  label: string;
  emphasis?: 'standard' | 'story';
};

export type ComparisonProps =
  | UnboundComparisonProps
  | {
      metric: MetricDefinition;
      reading: MetricReading;
      emphasis?: 'standard' | 'story';
    };

export function Comparison(props: ComparisonProps) {
  const dateFormatting = useDateFormatting();
  if ('metric' in props) {
    if (props.reading.loading) return <ContentSkeleton variant="panel" />;
    const comparison = metricComparison(
      props.metric,
      props.reading,
      dateFormatting
    );
    if (!comparison) return null;

    return (
      <ComparisonContent
        {...comparison}
        label={props.metric.label}
        emphasis={props.emphasis}
      />
    );
  }

  return <ComparisonContent {...props} />;
}

function ComparisonContent({
  label,
  current,
  previous,
  favorableDirection,
  emphasis = 'standard',
}: UnboundComparisonProps) {
  const max = Math.max(current.value, previous?.value ?? 0, 1);
  const { percent, tone, icon } = comparisonChange({
    current,
    previous,
    favorableDirection,
  });

  return (
    <figure
      className="altertable-comparison-visual"
      data-emphasis={emphasis}
      aria-label={`${label} comparison`}
    >
      <figcaption>{label}</figcaption>
      <div className="altertable-comparison-row" data-period="current">
        <div>
          <span>{current.periodLabel ?? 'Current period'}</span>
          <strong>{current.formattedValue}</strong>
        </div>
        <span className="altertable-comparison-track">
          <span style={{ width: `${(current.value / max) * 100}%` }} />
        </span>
      </div>
      {previous && (
        <div className="altertable-comparison-row" data-period="previous">
          <div>
            <span>{previous.periodLabel ?? 'Previous period'}</span>
            <strong>{previous.formattedValue}</strong>
          </div>
          <span className="altertable-comparison-track">
            <span
              style={{ width: `${((previous.value ?? 0) / max) * 100}%` }}
            />
          </span>
        </div>
      )}
      <p className="altertable-comparison-change" data-tone={tone}>
        {percent === null ? (
          'No comparable previous value'
        ) : (
          <>
            <AppIcon name={icon} size={17} />
            {Math.abs(percent).toFixed(1)}% vs{' '}
            {previous?.periodLabel?.toLowerCase() ?? 'previous period'}
          </>
        )}
      </p>
    </figure>
  );
}
