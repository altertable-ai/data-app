import type { MetricFormat } from '@/src/core/format';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import type { MetricReading } from '@/src/core/reading';
import { calendarMetricComparison } from '@/src/react/ui/comparison';

export type MetricDefinition = {
  id: string;
  label: string;
  format: MetricFormat;
  favorableDirection?: 'up' | 'down';
  evidence: WidgetEvidence;
};

export function metricComparison(
  metric: MetricDefinition,
  reading: MetricReading
) {
  if (reading.loading || !reading.value.period) return undefined;

  return calendarMetricComparison(reading.value.period, {
    current: reading.value.current,
    previous: reading.value.previous ?? null,
    format: metric.format,
    favorableDirection: metric.favorableDirection,
  });
}
