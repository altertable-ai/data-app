import { Tooltip } from '@/src/react/ui/Tooltip';
import { useLayoutEffect, useRef } from 'react';

import {
  validateChartItems,
  type ChartItem,
  type ValueChartProps,
} from '@/src/react/ui/chart-data';

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
        {items.map(item => (
          <Tooltip
            key={item.id}
            variant="chart"
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
              type="button"
              tabIndex={-1}
              className="altertable-selectable-bars-item"
              aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
            >
              <span className="altertable-selectable-bars-area">
                <span
                  className="altertable-selectable-bars-bar"
                  style={{
                    height: `${Math.max(item.value > 0 ? 3 : 0, (item.value / maximum) * 100)}%`,
                  }}
                />
              </span>
              <span className="altertable-selectable-bars-label">
                {item.label}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>
    </section>
  );
}
