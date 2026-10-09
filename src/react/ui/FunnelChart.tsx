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
  function reading(item: FunnelChartSeries, index: number) {
    const first = item.values[0] ?? 0;
    const current = item.values[index]!;
    const previous = item.values[Math.max(0, index - 1)]!;
    return {
      current,
      previous,
      dropped: previous - current,
      conversion: first > 0 ? current / first : null,
      dropOff: first > 0 ? (previous - current) / first : null,
    };
  }
  const data = steps.map((step, index) => ({
    label: step.label,
    index,
    ...Object.fromEntries(
      series.flatMap((item, seriesIndex) => {
        const value = reading(item, index);
        return [
          [`conversion${seriesIndex}`, (value.conversion ?? 0) * 100],
          [
            `drop${seriesIndex}`,
            (value.dropOff ?? (index === 0 ? 1 : 0)) * 100,
          ],
        ];
      })
    ),
  }));
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
          <div className="altertable-funnel-summary">
            {series.map((item, index) => (
              <div key={item.id}>
                <span>
                  <ChartLegend.Marker
                    kind="square"
                    color={`var(--atbl-chart-${(index % 8) + 1})`}
                  />
                  {item.label}
                </span>
                <strong>
                  {formatPercent(reading(item, steps.length - 1).conversion)}
                </strong>
              </div>
            ))}
          </div>
          <p className="altertable-analytics-note">
            {steps[0]!.label} → {steps.at(-1)!.label}
          </p>
          <div className="altertable-funnel-scroll">
            <div
              style={{
                minWidth: steps.length * Math.max(96, series.length * 40),
              }}
            >
              <ComposedChart
                data={data}
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
                  tickFormatter={value => `${value}%`}
                />
                <defs>
                  {series.map((item, index) => (
                    <Fragment key={item.id}>
                      <linearGradient
                        id={`${chartId}-gradient-${index}`}
                        x1="0"
                        x2="0"
                        y1="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor={`var(--atbl-chart-${(index % 8) + 1})`}
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor={`var(--atbl-chart-${(index % 8) + 1})`}
                          stopOpacity={0.7}
                        />
                      </linearGradient>
                      <pattern
                        id={`${chartId}-hatch-${index}`}
                        patternUnits="userSpaceOnUse"
                        width="6"
                        height="6"
                        patternTransform="rotate(45)"
                      >
                        <rect
                          width="8"
                          height="8"
                          fill={`var(--atbl-chart-${(index % 8) + 1})`}
                          fillOpacity={0.16}
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke={`var(--atbl-chart-${(index % 8) + 1})`}
                          strokeOpacity={0.4}
                          strokeWidth="2"
                        />
                      </pattern>
                    </Fragment>
                  ))}
                </defs>
                {series.map((item, index) => (
                  <Fragment key={item.id}>
                    <ComposedChart.Bar
                      dataKey={`conversion${index}`}
                      name={item.label}
                      stackId={item.id}
                      fill={`url(#${chartId}-gradient-${index})`}
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
                      dataKey={`drop${index}`}
                      name={`${item.label} drop-off`}
                      stackId={item.id}
                      fill={`url(#${chartId}-hatch-${index})`}
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
                  content={({ active, payload }) => {
                    const index = payload?.[0]?.payload.index;
                    if (!active || typeof index !== 'number') return null;
                    const tooltipItems = series
                      .filter(
                        item =>
                          !highlighted ||
                          highlighted.step !== index ||
                          item.id === highlighted.id
                      )
                      .flatMap(item => {
                        const value = reading(item, index);
                        const selected = highlighted?.step === index;
                        const readings = selected
                          ? [highlighted.conversion]
                          : [true, false];
                        const seriesIndex = series.indexOf(item);
                        return readings.map(conversion => ({
                          name: item.label,
                          graphicalItemId: `${item.id}-${conversion ? 'conversion' : 'drop-off'}`,
                          dataKey: `${item.id}-${conversion ? 'conversion' : 'drop-off'}`,
                          color: `var(--atbl-chart-${(seriesIndex % 8) + 1})`,
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
                        }));
                      });
                    return (
                      <ChartTooltipContent
                        active
                        label={steps[index]!.label}
                        payload={tooltipItems}
                      />
                    );
                  }}
                />
              </ComposedChart>
            </div>
          </div>
          <ul className="altertable-sr-only">
            {steps.map((step, index) => (
              <li key={step.id}>
                {step.label}
                {series.map(item => {
                  const value = reading(item, index);
                  return (
                    <span key={item.id}>
                      {' '}
                      · {item.label}: {formatValue(value.current)} {unit},{' '}
                      {formatPercent(value.conversion)} conversion,{' '}
                      {formatValue(value.dropped)} dropped off
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
