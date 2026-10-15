import { formatNumber } from '@altertable/data-app/format';
import { Tooltip } from './Tooltip.tsx';
import { useState } from 'react';
import { useChartScrollToEnd } from './use-chart-scroll-to-end.ts';
import {
  AreaChart as RechartsAreaChart,
  LineChart as RechartsLineChart,
  ReferenceLine,
} from 'recharts';
import {
  ChartArea,
  ChartLine,
  ChartDot,
  ChartXAxis,
  ChartYAxis,
} from './chart-primitives.tsx';
import type { ValueChartProps } from './chart-data.ts';
import { validateValueChartItems } from './chart-data.ts';

/** Ordered, equally spaced samples; negative values share an explicit zero baseline. */
export function TrendChart({
  items,
  unit,
  ariaLabel,
  formatValue = formatNumber,
  kind,
}: ValueChartProps & { kind: 'line' | 'area' }) {
  validateValueChartItems(kind, items);
  const Plot = kind === 'area' ? RechartsAreaChart : RechartsLineChart;
  const [activeIndex, setActiveIndex] = useState<number>();
  const scrollport = useChartScrollToEnd(items);
  const magnitude = items.reduce(
    (max, item) => Math.max(max, Math.abs(item.value)),
    1
  );
  const low = items.reduce(
    (min, item) => Math.min(min, item.value / magnitude),
    0
  );
  const high = items.reduce(
    (max, item) => Math.max(max, item.value / magnitude),
    0
  );
  return (
    <section className="altertable-trend-chart" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <div className="altertable-trend-scroll" ref={scrollport}>
            <div
              className="altertable-trend-plot"
              style={{ minWidth: items.length * 40 }}
            >
              <div className="altertable-chart-canvas" aria-hidden="true">
                <Plot
                  data={items.map(item => ({
                    ...item,
                    plotValue: item.value / magnitude,
                  }))}
                  responsive
                  width="100%"
                  height={220}
                  margin={{ top: 12, right: 0, bottom: 12, left: 0 }}
                  accessibilityLayer={false}
                  tabIndex={-1}
                >
                  <ChartXAxis hide dataKey="id" scale="band" />
                  <ChartYAxis
                    hide
                    domain={[low, high === low ? low + 1 : high]}
                  />
                  <ReferenceLine y={0} stroke="var(--atbl-border)" />
                  {kind === 'area' && (
                    <ChartArea
                      dataKey="plotValue"
                      stroke="none"
                      fill="var(--atbl-chart-1)"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                  <ChartLine
                    dataKey="plotValue"
                    dot={({ cx, cy, index }) =>
                      index === activeIndex ? (
                        <ChartDot
                          cx={cx}
                          cy={cy}
                          active={index === activeIndex}
                        />
                      ) : (
                        <g />
                      )
                    }
                    activeDot={false}
                  />
                </Plot>
              </div>
              <div className="altertable-trend-points">
                {items.map((item, index) => (
                  <Tooltip
                    key={item.id}
                    variant="chart"
                    onOpenChange={open =>
                      setActiveIndex(current =>
                        open ? index : current === index ? undefined : current
                      )
                    }
                    content={
                      <>
                        <strong>{item.label}</strong>
                        <span>
                          {formatValue(item.value)} {unit}
                        </span>
                      </>
                    }
                    className="altertable-chart-column"
                  >
                    <button
                      data-atbl-focus="ring"
                      data-atbl-control="default"
                      type="button"
                      tabIndex={-1}
                      className="altertable-trend-point"
                      aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                    >
                      <span className="altertable-trend-hit" />
                      <span className="altertable-trend-label">
                        {item.label}
                      </span>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
