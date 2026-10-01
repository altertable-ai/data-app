import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Skeleton } from '@/src/react/ui/Skeleton';
import { classNames } from '@/src/react/ui/classNames';

export type DataAppSkeletonProps = Omit<
  ComponentPropsWithRef<'output'>,
  'children' | 'role' | 'aria-busy'
> & {
  header?: ReactNode;
  footer?: ReactNode;
};

const chartHeights = [40, 60, 50, 80, 60, 100, 80, 60];

/** Host-side placeholder while a data app starts. Header and footer slots remain host-owned; widget placeholders are decorative. */
export function DataAppSkeleton({
  header,
  footer,
  className,
  ...props
}: DataAppSkeletonProps) {
  return (
    <output
      aria-label="Loading data app"
      {...props}
      aria-busy="true"
      className={classNames('altertable-data-app-skeleton', className)}
    >
      <div className="altertable-data-app-skeleton-content">
        {header != null && header !== false && (
          <div className="altertable-data-app-skeleton-header">{header}</div>
        )}
        <div className="altertable-data-app-skeleton-body" aria-hidden="true">
          <div className="altertable-data-app-skeleton-metrics">
            {[0, 1, 2].map(item => (
              <div className="altertable-data-app-skeleton-metric" key={item}>
                <Skeleton className="altertable-data-app-skeleton-metric-label" />
                <Skeleton className="altertable-data-app-skeleton-metric-value" />
                <Skeleton className="altertable-data-app-skeleton-metric-foot" />
              </div>
            ))}
          </div>
          <div className="altertable-data-app-skeleton-widget">
            <Skeleton className="altertable-data-app-skeleton-widget-title" />
            <div className="altertable-data-app-skeleton-chart">
              {chartHeights.map((height, index) => (
                <Skeleton key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="altertable-data-app-skeleton-widget">
            <Skeleton className="altertable-data-app-skeleton-widget-title" />
            <div className="altertable-data-app-skeleton-rows">
              {[0, 1, 2].map(row => (
                <div className="altertable-data-app-skeleton-row" key={row}>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </div>
              ))}
            </div>
          </div>
        </div>
        {footer != null && footer !== false && (
          <div className="altertable-data-app-skeleton-footer">{footer}</div>
        )}
      </div>
    </output>
  );
}
