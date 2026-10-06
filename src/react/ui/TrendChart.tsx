import { Tooltip } from '@/src/react/ui/Tooltip';
import { useLayoutEffect, useRef } from 'react';
import type { BarChartProps } from '@/src/react/ui/BarChart';
import { invariant } from '@/src/core/invariant';

/** Ordered, equally spaced samples; negative values share an explicit zero baseline. */
export function TrendChart({
  items,
  unit,
  ariaLabel,
  formatValue = value => new Intl.NumberFormat().format(value),
  area = false,
}: BarChartProps & { area?: boolean }) {
  invariant(
    items.every(item => item.id.trim() && Number.isFinite(item.value)) &&
      new Set(items.map(item => item.id)).size === items.length,
    'Chart items require unique, nonempty IDs and finite values.'
  );
  const scrollport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scrollport.current;
    if (element) element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [items]);
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
  const span = high - low || 1;
  function y(value: number) {
    return 208 - ((value / magnitude - low) / span) * 196;
  }
  const points = items.map((item, index) => ({
    x: ((index + 0.5) / items.length) * 1000,
    y: y(item.value),
  }));
  const path = points
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
    .join(' ');
  const first = points[0];
  const last = points.at(-1);
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
              <svg
                viewBox="0 0 1000 220"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <line
                  className="altertable-trend-baseline"
                  x1="0"
                  x2="1000"
                  y1={y(0)}
                  y2={y(0)}
                  vectorEffect="non-scaling-stroke"
                />
                {area && first && last && (
                  <path
                    className="altertable-trend-fill"
                    d={`${path} L${last.x},${y(0)} L${first.x},${y(0)} Z`}
                  />
                )}
                <path
                  className="altertable-trend-line"
                  d={path}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="altertable-trend-points">
                {items.map((item, index) => (
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
                      className="altertable-trend-point"
                      aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                    >
                      <span className="altertable-trend-hit">
                        <span
                          className="altertable-trend-dot"
                          style={{ top: `${(points[index]!.y / 220) * 100}%` }}
                        />
                      </span>
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
