import type { ComponentPropsWithRef } from 'react';
import type { SkeletonContent } from '@/src/react/ui/presentation';
import { classNames } from '@/src/react/ui/classNames';
import { Skeleton } from '@/src/react/ui/Skeleton';

export type ContentSkeletonProps = SkeletonContent &
  Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** A metric, panel, or ranking placeholder to compose in the same layout as live content. */
export function ContentSkeleton({
  variant,
  rows = 4,
  className,
  ...props
}: ContentSkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={classNames(
        `altertable-${variant === 'metric' ? 'metric-widget' : 'data-widget'}`,
        'altertable-content-skeleton',
        className
      )}
    >
      <Skeleton className="altertable-content-skeleton-label" />
      <ContentSkeletonBody variant={variant} rows={rows} />
      {variant === 'panel' && (
        <Skeleton className="altertable-content-skeleton-foot" />
      )}
    </div>
  );
}

/** Placeholder for a widget body; static headings stay outside it. */
export function ContentSkeletonBody({ variant, rows = 4 }: SkeletonContent) {
  const rowCount = Math.min(100, Math.max(0, Math.trunc(rows) || 0));
  return (
    <div className="altertable-content-skeleton-body" aria-hidden="true">
      <Skeleton
        className={
          variant === 'metric'
            ? 'altertable-content-skeleton-value'
            : variant === 'ranking'
              ? 'altertable-content-skeleton-subtitle'
              : 'altertable-content-skeleton-chart'
        }
      />
      {variant === 'ranking' && (
        <div className="altertable-content-skeleton-rows">
          {Array.from({ length: rowCount }, (_, row) => (
            <div className="altertable-content-skeleton-row" key={row}>
              <Skeleton className="altertable-content-skeleton-row-label" />
              <Skeleton className="altertable-content-skeleton-row-track" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
