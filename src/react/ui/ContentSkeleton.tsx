import type { ComponentPropsWithRef } from 'react';
import type { SkeletonContent } from '@/src/react/ui/presentation';
import { invariant } from '@/src/core/invariant';
import { classNames } from '@/src/react/ui/classNames';
import { Skeleton } from '@/src/react/ui/Skeleton';

export type ContentSkeletonProps = SkeletonContent &
  Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** A metric, panel, or ranking placeholder to compose in the same layout as live content. */
export function ContentSkeleton({
  variant,
  rows,
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

/** The value area of a skeleton, for a widget frame that already shows its own title. */
export function ContentSkeletonBody({ variant, rows = 4 }: SkeletonContent) {
  invariant(
    Number.isInteger(rows) && rows >= 0 && rows <= 100,
    'Skeleton rows must be between 0 and 100.'
  );

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
          {Array.from({ length: rows }, (_, index) => index).map(row => (
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
