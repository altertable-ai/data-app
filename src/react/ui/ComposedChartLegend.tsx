import type { ComponentProps } from 'react';
import { Legend, type LegendPayload } from 'recharts';
import {
  ChartLegend,
  type ChartLegendMarkerKind,
} from '@/src/react/ui/ChartLegend';

export type ComposedChartLegendProps = ComponentProps<typeof Legend> & {
  maxVisibleItems?: number;
};
type LegendContentProps = ComposedChartLegendProps & {
  payload?: readonly LegendPayload[];
};

const legendMarkerKinds: Partial<
  Record<NonNullable<LegendPayload['type']>, ChartLegendMarkerKind>
> = {
  square: 'area',
  rect: 'bar',
  line: 'line',
  plainline: 'line',
};

function LegendContent({
  payload = [],
  maxVisibleItems,
  formatter,
  layout,
  align,
  labelStyle,
  iconType,
  iconSize = 20,
  inactiveColor = 'var(--atbl-muted)',
  position,
  verticalAlign,
  onClick,
  onMouseEnter,
  onMouseLeave,
  'aria-label': ariaLabel,
}: LegendContentProps) {
  if (!payload.some(entry => entry.type !== 'none')) return null;
  const vertical =
    layout === 'vertical' ||
    (layout === 'auto' && (position === 'left' || position === 'right'));
  return (
    <ChartLegend
      aria-label={ariaLabel}
      className={
        position === 'top' || (position == null && verticalAlign === 'top')
          ? 'altertable-composed-chart-legend-above'
          : position === 'bottom' ||
              (position == null && verticalAlign !== 'middle' && !vertical)
            ? 'altertable-composed-chart-legend-below'
            : undefined
      }
      maxVisibleItems={maxVisibleItems}
      layout={vertical ? 'vertical' : 'horizontal'}
      align={align === 'right' ? 'end' : align === 'left' ? 'start' : 'center'}
    >
      {payload.map((entry, index) => {
        if (entry.type === 'none') return null;
        const type = iconType ?? entry.type;
        const kind = legendMarkerKinds[type ?? 'none'] ?? 'point';
        const formatLabel = entry.formatter ?? formatter;
        const label = formatLabel
          ? formatLabel(entry.value, entry, index)
          : entry.value;
        const content = (
          <>
            {type !== 'none' &&
              (entry.legendIcon ?? (
                <ChartLegend.Marker
                  kind={kind}
                  color={entry.inactive ? inactiveColor : entry.color}
                  style={{ width: iconSize, height: iconSize * 0.6 }}
                />
              ))}
            <ChartLegend.Label style={labelStyle}>{label}</ChartLegend.Label>
          </>
        );
        return (
          <ChartLegend.Item
            key={index}
            inactive={entry.inactive}
            onMouseEnter={
              onMouseEnter
                ? event => onMouseEnter(entry, index, event)
                : undefined
            }
            onMouseLeave={
              onMouseLeave
                ? event => onMouseLeave(entry, index, event)
                : undefined
            }
          >
            {onClick ? (
              <button
                type="button"
                data-atbl-control="action"
                data-atbl-focus="ring"
                className="altertable-chart-legend-action"
                onClick={event => onClick(entry, index, event)}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </ChartLegend.Item>
        );
      })}
    </ChartLegend>
  );
}

/** Opt in inside ComposedChart to derive the shared legend from its displayed series.
 * Native positioning, sorting, formatters, callbacks, and custom content remain available. */
export function ComposedChartLegend({
  maxVisibleItems,
  ...props
}: ComposedChartLegendProps) {
  return (
    <Legend
      iconSize={20}
      inactiveColor="var(--atbl-muted)"
      content={<LegendContent maxVisibleItems={maxVisibleItems} />}
      {...props}
    />
  );
}
