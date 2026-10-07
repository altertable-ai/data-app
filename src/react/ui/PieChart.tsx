import { Tooltip } from '@/src/react/ui/Tooltip';
import { useState } from 'react';
import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { validateChartItems } from '@/src/react/ui/chart-data';

export type PieChartItem = ChartItem;
export type PieChartProps = ValueChartProps;

/** Nonnegative, mutually exclusive parts; shares use the sum of supplied items.
 * Include Other to represent the whole. Zero values remain in the legend; all-zero
 * data shows an empty circle. Colors follow item order. Compose inside VisualizationWidget;
 * hover/touch tooltips coordinate slice and legend emphasis without caller state. */
export function PieChart({
  items,
  unit,
  ariaLabel,
  formatValue = value => new Intl.NumberFormat().format(value),
}: PieChartProps) {
  validateChartItems('pie', items);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [plotOpen, setPlotOpen] = useState(false);
  const [legendId, setLegendId] = useState<string | null>(null);
  const maximum = items.reduce((max, item) => Math.max(max, item.value), 0);
  const total = maximum
    ? items.reduce((sum, item) => sum + item.value / maximum, 0)
    : 0;
  let cursor = -Math.PI / 2;
  const slices: (PieChartItem & {
    share: number;
    color: string;
    path: string;
  })[] = [];
  for (const [index, item] of items.entries()) {
    const share = total ? item.value / maximum / total : 0;
    const start = cursor;
    cursor += share * Math.PI * 2;
    const middle = (start + cursor) / 2;
    function point(angle: number) {
      return `${110 + Math.cos(angle) * 100},${110 + Math.sin(angle) * 100}`;
    }
    slices.push({
      ...item,
      share,
      color: `var(--at-chart-${(index % 8) + 1})`,
      path: `${share === 1 ? 'M' : 'M110,110 L'}${point(start)} A100,100 0 0 1 ${point(middle)} A100,100 0 0 1 ${point(cursor)} Z`,
    });
  }
  function percent(share: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(share);
  }
  function detail(item: (typeof slices)[number]) {
    return (
      <>
        <strong>{item.label}</strong>
        <span>
          {formatValue(item.value)} {unit} · {percent(item.share)}
        </span>
      </>
    );
  }
  const preview = slices.find(item => item.id === previewId);
  return (
    <section className="altertable-pie-chart" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <div className="altertable-pie-plot">
            <Tooltip
              variant="chart"
              className="altertable-pie-tooltip"
              onOpenChange={setPlotOpen}
              content={preview ? detail(preview) : null}
            >
              <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false">
                {total === 0 ? (
                  <circle
                    cx="110"
                    cy="110"
                    r="100"
                    className="altertable-pie-empty"
                  />
                ) : (
                  slices
                    .filter(item => item.share > 0)
                    .map(item => (
                      <path
                        key={item.id}
                        d={item.path}
                        fill={item.color}
                        className="altertable-pie-slice"
                        data-active={
                          item.id ===
                            (plotOpen && previewId ? previewId : legendId) ||
                          undefined
                        }
                        onPointerDown={event => {
                          if (plotOpen && previewId !== item.id)
                            event.preventDefault();
                          setPreviewId(item.id);
                        }}
                        onPointerEnter={event => {
                          if (event.pointerType === 'mouse')
                            setPreviewId(item.id);
                        }}
                        onPointerLeave={event => {
                          if (event.pointerType === 'mouse') setPreviewId(null);
                        }}
                      />
                    ))
                )}
              </svg>
            </Tooltip>
            {total === 0 && (
              <span className="altertable-pie-empty-label">
                No nonzero values
              </span>
            )}
          </div>
          <div className="altertable-pie-legend">
            {slices.map(item => (
              <Tooltip
                key={item.id}
                variant="chart"
                content={detail(item)}
                onOpenChange={open =>
                  setLegendId(current =>
                    open ? item.id : current === item.id ? null : current
                  )
                }
              >
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${item.label}: ${formatValue(item.value)} ${unit}, ${percent(item.share)}`}
                >
                  <span
                    className="altertable-pie-key"
                    style={{ background: item.color }}
                  />
                  <span className="altertable-pie-label">{item.label}</span>
                  <strong>{formatValue(item.value)}</strong>
                  <span>{percent(item.share)}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
