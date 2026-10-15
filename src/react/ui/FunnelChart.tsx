import { KEY_SEPARATOR } from '@/src/core/keys';
import { Fragment, useEffect, useRef, useState } from 'react';
import { invariant } from '@/src/core/invariant';
import { useSvgId } from '@/src/react/ui/useSvgId';
import { ChartLegend } from '@/src/react/ui/ChartLegend';
import { ComposedChart } from '@/src/react/ui/ComposedChart';
import { ChartTooltipContent } from '@/src/react/ui/chart-primitives';
import { classNames } from '@/src/react/ui/classNames';
import type { CountChartProps } from '@/src/react/ui/chart-data';
import { formatNumber, formatPercent } from '@/src/core/format';

/** Ordered step with a unique, nonblank ID. */
export type FunnelChartStep = { id: string; label: string };
export type FunnelChartSeries = {
  /** Unique, nonblank population ID. */
  id: string;
  label: string;
  /** Finite, nonnegative counts aligned with steps and nonincreasing. */
  values: readonly number[];
};
export type FunnelChartProps = CountChartProps & {
  steps: readonly FunnelChartStep[];
  series: readonly FunnelChartSeries[];
};

type FunnelPopulation = {
  id: string;
  label: string;
  color: string;
  hatchId: string;
};
type FunnelReading = {
  population: FunnelPopulation;
  current: number;
  previous: number;
  dropped: number;
  conversion: number | null;
  dropOff: number | null;
  conversionPercent: number;
  dropOffPercent: number;
};
type FunnelRow = {
  id: string;
  label: string;
  index: number;
  readings: ReadonlyMap<string, FunnelReading>;
};

function createFunnelModel(
  steps: readonly FunnelChartStep[],
  series: readonly FunnelChartSeries[],
  chartId: string
) {
  for (const [kind, items] of [
    ['funnel step', steps],
    ['funnel series', series],
  ] as const) {
    const ids = new Set<string>();
    for (const item of items) {
      invariant(
        item.id.trim().length > 0 && !ids.has(item.id),
        `${kind} chart IDs must be nonblank and unique.`
      );
      ids.add(item.id);
    }
  }
  for (const item of series) {
    invariant(
      item.values.length === steps.length,
      'funnel chart counts must align with steps.'
    );
    item.values.forEach((value, index) => {
      invariant(
        Number.isFinite(value) && value >= 0,
        'funnel chart counts must be finite and nonnegative.'
      );
      invariant(
        index === 0 || value <= item.values[index - 1]!,
        'funnel chart counts must be nonincreasing.'
      );
    });
  }
  const populations: FunnelPopulation[] = series.map((item, index) => ({
    id: item.id,
    label: item.label,
    color: `var(--atbl-chart-${(index % 8) + 1})`,
    hatchId: [chartId, 'hatch', index].join('-'),
  }));
  const rows: FunnelRow[] = steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    index,
    readings: new Map(
      series.map((item, seriesIndex) => {
        const first = item.values[0] ?? 0;
        const current = item.values[index]!;
        const previous = item.values[Math.max(0, index - 1)]!;
        const dropped = previous - current;
        const conversion = first > 0 ? current / first : null;
        const dropOff = first > 0 ? dropped / first : null;
        return [
          item.id,
          {
            population: populations[seriesIndex]!,
            current,
            previous,
            dropped,
            conversion,
            dropOff,
            conversionPercent: (conversion ?? 0) * 100,
            dropOffPercent: (dropOff ?? (index === 0 ? 1 : 0)) * 100,
          },
        ];
      })
    ),
  }));
  return { populations, rows };
}

/** Conversion columns with previous-step drop-off, normalized to each series' first step.
 * Owns series highlighting and portion-specific inspection; compose inside VisualizationWidget. */
export function FunnelChart({
  steps,
  series,
  unit,
  ariaLabel,
  className,
  formatValue = formatNumber,
}: FunnelChartProps) {
  const chartId = useSvgId();
  const [highlighted, setHighlighted] = useState<{
    id: string;
    conversion: boolean;
    step: number;
  } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClear() {
    if (clearTimer.current !== null) clearTimeout(clearTimer.current);
    clearTimer.current = null;
  }
  useEffect(() => cancelClear, []);
  function highlight(id: string, conversion: boolean, step: number) {
    cancelClear();
    setHighlighted({ id, conversion, step });
  }
  function clearHighlight() {
    cancelClear();
    setHighlighted(null);
  }
  function scheduleClear() {
    cancelClear();
    clearTimer.current = setTimeout(() => setHighlighted(null), 100);
  }
  const { populations, rows } = createFunnelModel(steps, series, chartId);
  return (
    <section
      className={classNames('altertable-funnel-chart', className)}
      aria-label={ariaLabel}
      onKeyDownCapture={clearHighlight}
    >
      {steps.length === 0 || series.length === 0 ? (
        <span>No data</span>
      ) : (
        <>
          <div className="altertable-funnel-header">
            <ChartLegend aria-label="Funnel series" layout="single-row">
              {populations.map(item => (
                <ChartLegend.Item
                  key={item.id}
                  className="altertable-funnel-summary-item"
                >
                  <span className="altertable-funnel-series-label">
                    <ChartLegend.Marker kind="square" color={item.color} />
                    <ChartLegend.Label>{item.label}</ChartLegend.Label>
                  </span>
                  <strong className="altertable-funnel-series-value">
                    {formatPercent(
                      rows.at(-1)?.readings.get(item.id)?.conversion ?? null
                    )}
                  </strong>
                </ChartLegend.Item>
              ))}
            </ChartLegend>
            <p className="altertable-funnel-path">
              {steps[0]!.label} → {steps.at(-1)!.label}
            </p>
          </div>
          <div className="altertable-funnel-scroll">
            <div
              style={{
                minWidth: steps.length * Math.max(96, series.length * 40),
              }}
            >
              <ComposedChart
                data={rows}
                ariaLabel={`${ariaLabel} plot`}
                height={300}
                barCategoryGap="4%"
                barGap={1}
                onMouseLeave={clearHighlight}
              >
                <ComposedChart.CartesianGrid />
                <ComposedChart.XAxis dataKey="label" interval={0} height={48} />
                <ComposedChart.YAxis
                  domain={[0, 100]}
                  width={42}
                  tickFormatter={value => formatPercent(value / 100)}
                />
                <defs>
                  {populations.map(item => (
                    <pattern
                      key={item.id}
                      id={item.hatchId}
                      patternUnits="userSpaceOnUse"
                      width="6"
                      height="6"
                      patternTransform="rotate(45)"
                    >
                      <rect
                        width="8"
                        height="8"
                        fill={item.color}
                        fillOpacity={0.16}
                      />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="8"
                        stroke={item.color}
                        strokeOpacity={0.4}
                        strokeWidth="2"
                      />
                    </pattern>
                  ))}
                </defs>
                {populations.map(item => (
                  <Fragment key={item.id}>
                    <ComposedChart.Bar
                      dataKey={(row: FunnelRow) =>
                        row.readings.get(item.id)?.conversionPercent ?? 0
                      }
                      name={item.label}
                      stackId={item.id}
                      fill={item.color}
                      radius={0}
                      maxBarSize={undefined}
                      activeBar={false}
                      minPointSize={0}
                      opacity={
                        !highlighted || highlighted.id === item.id ? 1 : 0.2
                      }
                      onMouseEnter={bar =>
                        highlight(item.id, true, bar.payload.index)
                      }
                      onMouseLeave={scheduleClear}
                      onClick={bar =>
                        highlight(item.id, true, bar.payload.index)
                      }
                    />
                    <ComposedChart.Bar
                      dataKey={(row: FunnelRow) =>
                        row.readings.get(item.id)?.dropOffPercent ?? 0
                      }
                      name={`${item.label} drop-off`}
                      stackId={item.id}
                      fill={`url(#${item.hatchId})`}
                      opacity={
                        !highlighted || highlighted.id === item.id ? 1 : 0.2
                      }
                      onMouseEnter={bar =>
                        highlight(item.id, false, bar.payload.index)
                      }
                      onMouseLeave={scheduleClear}
                      onClick={bar =>
                        highlight(item.id, false, bar.payload.index)
                      }
                      radius={0}
                      maxBarSize={undefined}
                      activeBar={false}
                    />
                  </Fragment>
                ))}
                <ComposedChart.Tooltip
                  content={({ active, activeIndex }) => {
                    const row =
                      activeIndex == null
                        ? undefined
                        : rows[Number(activeIndex)];
                    if (!active || !row) return null;
                    const tooltipItems = [...row.readings.values()]
                      .filter(
                        value =>
                          !highlighted ||
                          highlighted.step !== row.index ||
                          value.population.id === highlighted.id
                      )
                      .flatMap(value => {
                        const item = value.population;
                        const selected = highlighted?.step === row.index;
                        const readings = selected
                          ? [highlighted.conversion]
                          : [true, false];
                        return readings.map(conversion => {
                          const key = [
                            item.id,
                            conversion ? 'conversion' : 'drop-off',
                          ].join(KEY_SEPARATOR);
                          return {
                            name: item.label,
                            graphicalItemId: key,
                            dataKey: key,
                            color: item.color,
                            value:
                              (conversion ? value.conversion : value.dropOff) ??
                              0,
                            formatter: () => (
                              <>
                                {formatPercent(
                                  conversion ? value.conversion : value.dropOff
                                )}{' '}
                                {conversion ? 'conversion' : 'drop-off'}
                                <span className="altertable-funnel-tooltip-detail">
                                  {formatValue(
                                    conversion ? value.current : value.dropped
                                  )}{' '}
                                  of {formatValue(value.previous)} {unit}
                                </span>
                              </>
                            ),
                          };
                        });
                      });
                    return (
                      <ChartTooltipContent
                        active
                        label={row.label}
                        payload={tooltipItems}
                      />
                    );
                  }}
                />
              </ComposedChart>
            </div>
          </div>
          <ul className="altertable-sr-only">
            {rows.map(row => (
              <li key={row.id}>
                {row.label}
                {[...row.readings.values()].map(value => (
                  <span key={value.population.id}>
                    {' '}
                    · {value.population.label}: {formatValue(value.current)}{' '}
                    {unit}, {formatPercent(value.conversion)} conversion,{' '}
                    {formatValue(value.dropped)} dropped off
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
