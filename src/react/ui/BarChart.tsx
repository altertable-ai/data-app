import { chartBarFill } from '@/src/react/ui/chartColor';
import { Tooltip } from '@/src/react/ui/Tooltip';
import { useLayoutEffect, useRef, useState } from 'react';

import {
  validateChartItems,
  type ChartItem,
  type ValueChartProps,
} from '@/src/react/ui/chart-data';

import { BarChart as RechartsBarChart, Cell } from 'recharts';
import {
  ChartBar,
  ChartXAxis,
  ChartYAxis,
} from '@/src/react/ui/chart-primitives';

export type BarChartItem = ChartItem;

export type BarChartProps = ValueChartProps;

/** Nonnegative category values. Compose inside VisualizationWidget for a titled panel.
 * Owns hover/touch tooltips; no selection state or keyboard navigation. */
export function BarChart({
  items,
  unit,
  ariaLabel,
  formatValue = value => new Intl.NumberFormat().format(value),
}: BarChartProps) {
  validateChartItems('bar', items);
  const [activeId, setActiveId] = useState<string>();
  const scrollport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = scrollport.current;
    if (element) element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [items]);

  const maximum = items.reduce((max, item) => Math.max(max, item.value), 1);

  return (
    <section className="altertable-selectable-bars" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      <div className="altertable-selectable-bars-scroll" ref={scrollport}>
        <div
          className="altertable-selectable-bars-plot"
          style={{ minWidth: items.length * 45 }}
        >
          <div className="altertable-chart-canvas" aria-hidden="true">
            <RechartsBarChart
              data={items.map(item => ({
                ...item,
                plotValue: item.value / maximum,
              }))}
              title={ariaLabel}
              responsive
              width="100%"
              height={220}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              accessibilityLayer={false}
              tabIndex={-1}
              barCategoryGap="24%"
            >
              <ChartXAxis hide dataKey="id" scale="band" />
              <ChartYAxis hide domain={[0, 1]} allowDataOverflow />
              <ChartBar
                dataKey="plotValue"
                minPointSize={value => ((value ?? 0) > 0 ? 7 : 0)}
              >
                {items.map(item => (
                  <Cell
                    key={item.id}
                    fill={
                      activeId === item.id ? 'var(--atbl-accent)' : chartBarFill
                    }
                  />
                ))}
              </ChartBar>
            </RechartsBarChart>
          </div>
          <div className="altertable-selectable-bars-items">
            {items.map(item => (
              <Tooltip
                key={item.id}
                variant="chart"
                onOpenChange={open =>
                  setActiveId(current =>
                    open ? item.id : current === item.id ? undefined : current
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
                  className="altertable-selectable-bars-item"
                  aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                >
                  <span className="altertable-selectable-bars-area" />
                  <span className="altertable-selectable-bars-label">
                    {item.label}
                  </span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
