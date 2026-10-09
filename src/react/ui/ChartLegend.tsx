import {
  Children,
  useId,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { chartBarFill } from '@/src/react/ui/chartColor';

export type ChartLegendProps = {
  children: ReactNode;
  layout?: 'horizontal' | 'vertical';
  align?: 'start' | 'center' | 'end';
  /** Maximum visible cells, including the expansion control; defaults to six. */
  maxVisibleItems?: number;
} & Omit<ComponentPropsWithRef<'ul'>, 'children'>;

/** Optional chart key, placed beside any chart with the app's layout components.
 * Items describe displayed series or categories; the caller owns series visibility and interactions. */
function ChartLegendRoot({
  children,
  layout = 'horizontal',
  align = 'start',
  maxVisibleItems = 6,
  className,
  'aria-label': ariaLabel = 'Chart legend',
  ...props
}: ChartLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const items = Children.toArray(children);
  const limit = Number.isFinite(maxVisibleItems)
    ? Math.max(1, Math.floor(maxVisibleItems))
    : 6;
  const visibleCount = items.length > limit ? limit - 1 : limit;
  const hiddenCount = Math.max(0, items.length - visibleCount);
  return (
    <div className="altertable-chart-legend-container">
      <ul
        id={listId}
        {...props}
        aria-label={ariaLabel}
        data-layout={layout}
        data-align={align}
        className={classNames('altertable-chart-legend', className)}
      >
        {expanded ? items : items.slice(0, visibleCount)}
        {hiddenCount > 0 && (
          <li className="altertable-chart-legend-overflow">
            <button
              type="button"
              data-atbl-control="action"
              data-atbl-focus="ring"
              className="altertable-chart-legend-action"
              aria-expanded={expanded}
              aria-controls={props.id ?? listId}
              onClick={() => setExpanded(value => !value)}
            >
              {expanded ? 'Show fewer' : `+${hiddenCount} more`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

export type ChartLegendItemProps = ComponentPropsWithRef<'li'> & {
  inactive?: boolean;
};

/** Descriptive by default; compose a button inside the item for an authored series toggle. */
function ChartLegendItem({
  inactive,
  className,
  ...props
}: ChartLegendItemProps) {
  return (
    <li
      {...props}
      data-inactive={inactive || undefined}
      className={classNames('altertable-chart-legend-item', className)}
    />
  );
}

export type ChartLegendMarkerKind =
  | 'square'
  | 'bar'
  | 'line'
  | 'area'
  | 'point'
  | 'slice';
export type ChartLegendMarkerProps = Omit<
  ComponentPropsWithRef<'svg'>,
  'children'
> & {
  kind?: ChartLegendMarkerKind;
};

/** Decorative mark; color accepts public palette tokens or any CSS color.
 * Defaults match the shared bar or accent-colored series primitives. */
function ChartLegendMarker({
  kind = 'square',
  color = kind === 'bar' ? chartBarFill : 'var(--atbl-accent)',
  className,
  style,
  ...props
}: ChartLegendMarkerProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      focusable="false"
      viewBox={kind === 'square' ? '0 0 8 8' : '0 0 20 12'}
      data-kind={kind}
      className={classNames('altertable-chart-legend-marker', className)}
      style={{ color, ...style }}
    >
      {kind === 'square' && <rect width="8" height="8" fill="currentColor" />}
      {kind === 'bar' && (
        <path d="M6 11V3Q6 1 8 1H12Q14 1 14 3V11Z" fill="currentColor" />
      )}
      {kind === 'slice' && (
        <rect x="5" y="1" width="10" height="10" rx="2" fill="currentColor" />
      )}
      {kind === 'point' && <circle cx="10" cy="6" r="3" fill="currentColor" />}
      {kind === 'line' && (
        <>
          <path
            d="M1 6H19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="10"
            cy="6"
            r="2.5"
            fill="var(--atbl-surface)"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      )}
      {kind === 'area' && (
        <>
          <path
            d="M1 10L7 5L13 7L19 2V11H1Z"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <path
            d="M1 10L7 5L13 7L19 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export type ChartLegendLabelProps = ComponentPropsWithRef<'span'>;
function ChartLegendLabel({
  className,
  children,
  title,
  ...props
}: ChartLegendLabelProps) {
  return (
    <span
      {...props}
      title={title ?? (typeof children === 'string' ? children : undefined)}
      className={classNames('altertable-chart-legend-label', className)}
    >
      {children}
    </span>
  );
}

export const ChartLegend = Object.assign(ChartLegendRoot, {
  Item: ChartLegendItem,
  Marker: ChartLegendMarker,
  Label: ChartLegendLabel,
});
