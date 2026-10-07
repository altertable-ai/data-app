import { Tooltip } from '@/src/react/ui/Tooltip';

import { validateChartItems } from '@/src/react/ui/chart-data';

import type { ScatterChartItem } from '@/src/react/ui/chart-data';
export type { ScatterChartItem } from '@/src/react/ui/chart-data';
export type ScatterChartProps = {
  items: readonly ScatterChartItem[];
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  ariaLabel: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    value
  );
}

function scale(values: readonly number[]) {
  const magnitude = values.reduce(
    (max, value) => Math.max(max, Math.abs(value)),
    1
  );
  const low = values.reduce(
    (min, value) => Math.min(min, value / magnitude),
    0
  );
  const high =
    values.reduce((max, value) => Math.max(max, value / magnitude), 0) ||
    (low === 0 ? 1 : 0);
  const span = high - low;
  return {
    position(value: number) {
      return ((value / magnitude - low) / span) * 100;
    },
    ticks: [low, low + span / 2, high].map(value => value * magnitude),
  };
}

/** Independent finite X/Y observations on linear axes that include zero.
 * Negative and constant coordinates are supported. Axis labels and units describe
 * tooltips as well as the plot; formatX/formatY format ticks and tooltip values.
 * Compose inside VisualizationWidget; hover/touch tooltips need no caller state. */
export function ScatterChart({
  items,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  ariaLabel,
  formatX = formatNumber,
  formatY = formatNumber,
}: ScatterChartProps) {
  validateChartItems('scatter', items);
  const xScale = scale(items.map(item => item.x));
  const yScale = scale(items.map(item => item.y));
  return (
    <section className="altertable-scatter-chart" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <p className="altertable-scatter-axis-title">
            {yLabel}
            {yUnit && ` (${yUnit})`}
          </p>
          <div className="altertable-scatter-axes">
            <div className="altertable-scatter-plot">
              {yScale.ticks.map((value, index) => (
                <div
                  key={index}
                  className="altertable-scatter-gridline"
                  style={{ bottom: `${index * 50}%` }}
                  aria-hidden="true"
                >
                  <span title={formatY(value)}>{formatY(value)}</span>
                </div>
              ))}
              {xScale.ticks.map((value, index) => (
                <span
                  key={index}
                  className="altertable-scatter-x-tick"
                  data-edge={index}
                  style={{ left: `${index * 50}%` }}
                  aria-hidden="true"
                  title={formatX(value)}
                >
                  {formatX(value)}
                </span>
              ))}
              {items.map(item => (
                <Tooltip
                  key={item.id}
                  variant="chart"
                  content={
                    <>
                      <strong>{item.label}</strong>
                      <span>
                        {xLabel}: {formatX(item.x)} {xUnit}
                      </span>
                      <span>
                        {yLabel}: {formatY(item.y)} {yUnit}
                      </span>
                    </>
                  }
                  className="altertable-scatter-tooltip"
                  style={{
                    left: `${xScale.position(item.x)}%`,
                    bottom: `${yScale.position(item.y)}%`,
                  }}
                >
                  <button
                    data-atbl-focus="ring"
                    data-atbl-control="action"
                    type="button"
                    tabIndex={-1}
                    className="altertable-scatter-point"
                    aria-label={`${item.label}: ${xLabel} ${formatX(item.x)} ${xUnit}, ${yLabel} ${formatY(item.y)} ${yUnit}`}
                  >
                    <span />
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
          <p className="altertable-scatter-axis-title altertable-scatter-x-title">
            {xLabel}
            {xUnit && ` (${xUnit})`}
          </p>
        </>
      )}
    </section>
  );
}
