import { KEY_SEPARATOR } from '@/src/core/keys';
import { useState, type ComponentProps } from 'react';
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

// Series IDs survive sorting, renaming, and removal. Native series without IDs
// can use a unique data key. Ambiguous entries may remount when Recharts replaces
// their payload; object identity prevents them inheriting another series’ state.
function createLegendItemKeys() {
  const identities = new WeakMap<object, number>();
  let nextIdentity = 0;
  function identity(value: object) {
    let id = identities.get(value);
    if (id === undefined) {
      id = nextIdentity++;
      identities.set(value, id);
    }
    return id;
  }
  return (payload: readonly LegendPayload[]) => {
    const keys = payload.map(entry => {
      const source: unknown = entry.payload;
      const id =
        source && typeof source === 'object' && 'id' in source
          ? source.id
          : undefined;
      if (typeof id === 'string' || typeof id === 'number')
        return ['series', typeof id, id].join(KEY_SEPARATOR);
      const key = entry.dataKey;
      if (typeof key === 'string' || typeof key === 'number')
        return ['data', typeof key, key].join(KEY_SEPARATOR);
      return ['object', identity(typeof key === 'function' ? key : entry)].join(
        KEY_SEPARATOR
      );
    });
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return keys.map((key, index) => {
      if (counts.get(key) === 1) return key;
      const entry = payload[index]!;
      const source: unknown = entry.payload;
      return [
        key,
        'object',
        identity(source && typeof source === 'object' ? source : entry),
      ].join(KEY_SEPARATOR);
    });
  };
}

function LegendContent({
  payload = [],
  maxVisibleItems,
  formatter,
  layout,
  align,
  labelStyle,
  iconType,
  iconSize = 8,
  inactiveColor = 'var(--atbl-muted)',
  position,
  verticalAlign,
  onClick,
  onMouseEnter,
  onMouseLeave,
  'aria-label': ariaLabel,
}: LegendContentProps) {
  const [getItemKeys] = useState(createLegendItemKeys);
  const itemKeys = getItemKeys(payload);
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
        const kind = iconType
          ? (legendMarkerKinds[type ?? 'none'] ?? 'point')
          : 'square';
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
                  style={{
                    width: iconSize,
                    height: kind === 'square' ? iconSize : iconSize * 0.6,
                  }}
                />
              ))}
            <ChartLegend.Label style={labelStyle}>{label}</ChartLegend.Label>
          </>
        );
        return (
          <ChartLegend.Item
            key={itemKeys[index]}
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
 * Give native series unique IDs when they share a data key.
 * Native positioning, sorting, formatters, callbacks, and custom content remain available. */
export function ComposedChartLegend({
  maxVisibleItems,
  ...props
}: ComposedChartLegendProps) {
  return (
    <Legend
      iconSize={8}
      inactiveColor="var(--atbl-muted)"
      content={<LegendContent maxVisibleItems={maxVisibleItems} />}
      {...props}
    />
  );
}
