import { Fragment } from 'react';
import { ComposedChart } from '@/src/react/ui/ComposedChart';
import { ChartLegend } from '@/src/react/ui/ChartLegend';
import { TooltipSurface } from '@/src/react/ui/TooltipSurface';
import { classNames } from '@/src/react/ui/classNames';
import {
  chartIdProblem,
  type CountChartProps,
} from '@/src/react/ui/chart-data';
import { DataProblem } from '@/src/react/ui/DataProblem';
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
export type RetentionChartProps = CountChartProps & {
  series: readonly RetentionChartSeries[];
};

type RetentionReading = {
  point: RetentionChartPoint;
  completePercent: number | null;
  incompletePercent: number | null;
  description: string;
};
type RetentionRow = {
  offset: number;
  label: string;
  readings: Map<string, RetentionReading>;
};

/** Describe the first displayed point a retention chart cannot plot. */
function retentionProblem(
  series: readonly RetentionChartSeries[]
): string | undefined {
  const labels = new Map<number, string>();
  for (const item of series) {
    if (!Number.isFinite(item.cohortSize) || item.cohortSize < 0)
      return 'retention chart counts must be finite and nonnegative.';
    const offsets = new Set<number>();
    for (const point of item.points) {
      if (
        !Number.isSafeInteger(point.offset) ||
        point.offset < 0 ||
        offsets.has(point.offset)
      )
        return 'retention chart offsets must be unique nonnegative integers within each series.';
      offsets.add(point.offset);
      if (
        point.rate !== null &&
        !(Number.isFinite(point.rate) && point.rate >= 0 && point.rate <= 1)
      )
        return 'retention chart rates must be finite fractions between 0 and 1, or null.';
      if ((point.rate === null) !== (point.retainedCount === null))
        return 'retention chart unobserved rates and counts must both be null.';
      if (
        point.retainedCount !== null &&
        !(
          Number.isFinite(point.retainedCount) &&
          point.retainedCount >= 0 &&
          point.retainedCount <= item.cohortSize
        )
      )
        return 'retention chart retained counts must be finite, nonnegative, and within the cohort size.';
      const label = labels.get(point.offset);
      if (label !== undefined && label !== point.label)
        return 'retention chart labels must agree for the same offset.';
      labels.set(point.offset, point.label);
    }
  }
  return undefined;
}

function createRetentionModel(
  series: readonly RetentionChartSeries[],
  unit: string,
  formatValue: (value: number) => string
) {
  const rowsByOffset = new Map<number, RetentionRow>();
  const cohorts = series.map((item, index) => {
    let previous: RetentionReading | undefined;
    const readings = [...item.points]
      .sort((a, b) => a.offset - b.offset)
      .map(point => {
        let row = rowsByOffset.get(point.offset);
        if (!row) {
          row = {
            offset: point.offset,
            label: point.label,
            readings: new Map(),
          };
          rowsByOffset.set(point.offset, row);
        }
        const percent = point.rate === null ? null : point.rate * 100;
        const reading: RetentionReading = {
          point,
          completePercent: point.incomplete ? null : percent,
          incompletePercent: point.incomplete ? percent : null,
          description:
            point.rate === null || point.retainedCount === null
              ? 'Not observed'
              : `${formatPercent(point.rate)} · ${formatValue(point.retainedCount)} / ${formatValue(item.cohortSize)} ${unit}${point.incomplete ? ' · Incomplete period' : ''}`,
        };
        // The dotted tail starts at the preceding supplied observation.
        if (point.incomplete && previous) {
          previous.incompletePercent =
            previous.completePercent ?? previous.incompletePercent;
        }
        row.readings.set(item.id, reading);
        previous = reading;
        return reading;
      });
    return {
      id: item.id,
      label: item.label,
      color: `var(--atbl-chart-${(index % 8) + 1})`,
      readings,
    };
  });
  const rows = [...rowsByOffset.values()].sort((a, b) => a.offset - b.offset);
  return { rows, rowsByOffset, cohorts };
}

/** Query-defined retention curves with count inspection and dotted incomplete periods.
 * Rates are not recomputed from counts. Compose inside VisualizationWidget. */
export function RetentionChart({
  series,
  unit,
  ariaLabel,
  className,
  formatValue = formatNumber,
}: RetentionChartProps) {
  const problem =
    chartIdProblem('retention series', series) ?? retentionProblem(series);
  if (problem)
    return (
      <section className={className} aria-label={ariaLabel}>
        <DataProblem problem={problem} />
      </section>
    );
  const { rows, rowsByOffset, cohorts } = createRetentionModel(
    series,
    unit,
    formatValue
  );
  return (
    <section
      className={classNames('altertable-retention-chart', className)}
      aria-label={ariaLabel}
    >
      {rows.length === 0 ? (
        <span>No data</span>
      ) : (
        <>
          <ComposedChart data={rows} ariaLabel={`${ariaLabel} plot`}>
            <ComposedChart.CartesianGrid />
            <ComposedChart.XAxis
              dataKey="offset"
              type="number"
              domain={[0, Math.max(1, rows.at(-1)?.offset ?? 0)]}
              ticks={rows.map(row => row.offset)}
              tickFormatter={value =>
                rowsByOffset.get(Number(value))?.label ?? ''
              }
            />
            <ComposedChart.YAxis
              domain={[0, 100]}
              width={42}
              tickFormatter={value => `${value}%`}
            />
            {cohorts.map(item => (
              <Fragment key={item.id}>
                <ComposedChart.Line
                  dataKey={(row: RetentionRow) =>
                    row.readings.get(item.id)?.completePercent ?? null
                  }
                  name={item.label}
                  stroke={item.color}
                  connectNulls={false}
                />
                <ComposedChart.Line
                  dataKey={(row: RetentionRow) =>
                    row.readings.get(item.id)?.incompletePercent ?? null
                  }
                  name={item.label}
                  stroke={item.color}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
              </Fragment>
            ))}
            <ComposedChart.Tooltip
              filterNull={false}
              content={({ active, label }) => {
                const row =
                  typeof label === 'number'
                    ? rowsByOffset.get(label)
                    : undefined;
                if (!active || !row) return null;
                return (
                  <TooltipSurface data-variant="chart" role="tooltip">
                    <strong>{row.label}</strong>
                    {cohorts.map(item => {
                      const reading = row.readings.get(item.id);
                      if (!reading) return null;
                      return (
                        <span key={item.id}>
                          {item.label}: {reading.description}
                        </span>
                      );
                    })}
                  </TooltipSurface>
                );
              }}
            />
          </ComposedChart>
          <ChartLegend aria-label={`${ariaLabel} cohorts`}>
            {cohorts.map(item => (
              <ChartLegend.Item key={item.id}>
                <ChartLegend.Marker kind="square" color={item.color} />
                <ChartLegend.Label>{item.label}</ChartLegend.Label>
              </ChartLegend.Item>
            ))}
          </ChartLegend>
          <ul
            className="altertable-sr-only"
            aria-label={`${ariaLabel} readings`}
          >
            {cohorts.map(item => (
              <li key={item.id}>
                {item.label}
                {item.readings.map(reading => (
                  <span key={reading.point.offset}>
                    {' '}
                    · {reading.point.label}: {reading.description}
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
