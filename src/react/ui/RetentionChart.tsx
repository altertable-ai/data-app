import { Fragment } from 'react';
import { invariant } from '@/src/core/invariant';
import { ComposedChart } from '@/src/react/ui/ComposedChart';
import { ChartLegend } from '@/src/react/ui/ChartLegend';
import { TooltipSurface } from '@/src/react/ui/TooltipSurface';
import { classNames } from '@/src/react/ui/classNames';
import type { PopulationChartProps } from '@/src/react/ui/chart-data';
import { formatNumber, formatPercent } from '@/src/core/format';

export type RetentionChartPoint = {
  /** Nonnegative integer, unique per series; uneven offsets retain their distance. */
  offset: number;
  /** Must agree across series for the same offset. */
  label: string;
  /** Observed retention fraction in [0, 1], or null for an unobserved period. */
  rate: number | null;
  /** Finite count in [0, cohortSize]; null exactly when rate is null. */
  retainedCount: number | null;
  /** Observed but still accumulating; drawn as a dotted tail. */
  incomplete?: boolean;
};
export type RetentionChartSeries = {
  /** Unique, nonblank cohort or segment ID. */
  id: string;
  label: string;
  /** Finite, nonnegative starting population. */
  cohortSize: number;
  points: readonly RetentionChartPoint[];
};
export type RetentionChartProps = PopulationChartProps & {
  series: readonly RetentionChartSeries[];
};

/** Query-defined retention curves with count inspection and dotted incomplete periods.
 * Rates are not recomputed from counts. Compose inside VisualizationWidget. */
export function RetentionChart({
  series,
  unit,
  ariaLabel,
  className,
  formatValue = formatNumber,
}: RetentionChartProps) {
  const ids = new Set<string>();
  const offsets = new Map<number, string>();
  for (const item of series) {
    invariant(
      item.id.trim().length > 0 && !ids.has(item.id),
      'retention series chart IDs must be nonblank and unique.'
    );
    ids.add(item.id);
    invariant(
      Number.isFinite(item.cohortSize) && item.cohortSize >= 0,
      'retention chart counts must be finite and nonnegative.'
    );
    const seen = new Set<number>();
    for (const point of item.points) {
      invariant(
        Number.isSafeInteger(point.offset) &&
          point.offset >= 0 &&
          !seen.has(point.offset),
        'retention chart offsets must be unique nonnegative integers within each series.'
      );
      seen.add(point.offset);
      invariant(
        point.rate === null ||
          (Number.isFinite(point.rate) && point.rate >= 0 && point.rate <= 1),
        'retention chart rates must be finite fractions between 0 and 1, or null.'
      );
      invariant(
        (point.rate === null) === (point.retainedCount === null),
        'retention chart unobserved rates and counts must both be null.'
      );
      if (point.retainedCount !== null) {
        invariant(
          Number.isFinite(point.retainedCount) && point.retainedCount >= 0,
          'retention chart counts must be finite and nonnegative.'
        );
        invariant(
          point.retainedCount <= item.cohortSize,
          'retention chart retained counts cannot exceed cohort size.'
        );
      }
      invariant(
        !offsets.has(point.offset) || offsets.get(point.offset) === point.label,
        'retention chart labels must agree for the same offset.'
      );
      offsets.set(point.offset, point.label);
    }
  }
  const data: ({ offset: number; label: string } & Record<
    string,
    number | string | null
  >)[] = [...offsets]
    .sort(([a], [b]) => a - b)
    .map(([offset, label]) => ({
      offset,
      label,
      ...Object.fromEntries(
        series.flatMap((_, index) => [
          [`rate${index}`, null],
          [`tail${index}`, null],
        ])
      ),
    }));
  series.forEach((item, index) => {
    const points = [...item.points].sort((a, b) => a.offset - b.offset);
    points.forEach((point, pointIndex) => {
      const row = data.find(row => row.offset === point.offset)!;
      row[point.incomplete ? `tail${index}` : `rate${index}`] =
        point.rate === null ? null : point.rate * 100;
      if (point.incomplete && pointIndex > 0) {
        const previous = points[pointIndex - 1]!;
        data.find(row => row.offset === previous.offset)![`tail${index}`] =
          previous.rate === null ? null : previous.rate * 100;
      }
    });
  });
  return (
    <section
      className={classNames('altertable-retention-chart', className)}
      aria-label={ariaLabel}
    >
      {data.length === 0 ? (
        <span>No data</span>
      ) : (
        <>
          <ComposedChart data={data} ariaLabel={`${ariaLabel} plot`}>
            <ComposedChart.CartesianGrid />
            <ComposedChart.XAxis
              dataKey="offset"
              type="number"
              domain={[0, Math.max(1, ...offsets.keys())]}
              tickFormatter={value =>
                offsets.get(Number(value)) ??
                (data[0]?.label.replace(/\d+(?:\.\d+)?/, String(value)) ||
                  String(value))
              }
            />
            <ComposedChart.YAxis
              domain={[0, 100]}
              width={42}
              tickFormatter={value => `${value}%`}
            />
            {series.map((item, index) => (
              <Fragment key={item.id}>
                <ComposedChart.Line
                  dataKey={`rate${index}`}
                  name={item.label}
                  stroke={`var(--atbl-chart-${(index % 8) + 1})`}
                  connectNulls={false}
                />
                <ComposedChart.Line
                  dataKey={`tail${index}`}
                  name={item.label}
                  stroke={`var(--atbl-chart-${(index % 8) + 1})`}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
              </Fragment>
            ))}
            <ComposedChart.Tooltip
              filterNull={false}
              content={({ active, payload }) => {
                const offset = payload?.[0]?.payload.offset;
                if (!active || typeof offset !== 'number') return null;
                return (
                  <TooltipSurface data-variant="chart" role="tooltip">
                    <strong>{offsets.get(offset)}</strong>
                    {series.map(item => {
                      const point = item.points.find(
                        point => point.offset === offset
                      );
                      if (!point) return null;
                      return (
                        <span key={item.id}>
                          {item.label}:{' '}
                          {point.rate === null
                            ? 'Not observed'
                            : `${formatPercent(point.rate)} · ${formatValue(point.retainedCount!)} / ${formatValue(item.cohortSize)} ${unit}${point.incomplete ? ' · Incomplete period' : ''}`}
                        </span>
                      );
                    })}
                  </TooltipSurface>
                );
              }}
            />
          </ComposedChart>
          <ChartLegend aria-label={`${ariaLabel} cohorts`}>
            {series.map((item, index) => (
              <ChartLegend.Item key={item.id}>
                <ChartLegend.Marker
                  kind="square"
                  color={`var(--atbl-chart-${(index % 8) + 1})`}
                />
                <ChartLegend.Label>{item.label}</ChartLegend.Label>
              </ChartLegend.Item>
            ))}
          </ChartLegend>
          <ul className="altertable-sr-only">
            {series.map(item => (
              <li key={item.id}>
                {item.label}
                {item.points.map(point => (
                  <span key={point.offset}>
                    {' '}
                    · {point.label}:{' '}
                    {point.rate === null
                      ? 'Not observed'
                      : `${formatPercent(point.rate)} · ${formatValue(point.retainedCount!)} / ${formatValue(item.cohortSize)} ${unit}${point.incomplete ? ' · Incomplete period' : ''}`}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
