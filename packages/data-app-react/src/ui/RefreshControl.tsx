import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { ShimmerText } from './ShimmerText.tsx';
import { useDelayedLoading } from './useDelayedLoading.ts';

export type RefreshControlProps = {
  refreshing: boolean;
  children: ReactNode;
  label?: string;
  status?: ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** Reserve status space and explain only long requests. */
export function RefreshControl({
  refreshing,
  children,
  label = 'Refreshing data',
  status,
  className,
  ...props
}: RefreshControlProps) {
  const showSpinner = useDelayedLoading(refreshing, 300);
  const showLabel = useDelayedLoading(refreshing);

  return (
    <div
      {...props}
      className={classNames('altertable-refresh-control', className)}
      data-refreshing={showSpinner ? '' : undefined}
    >
      <div
        className="altertable-refresh-status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          aria-hidden={!showLabel}
          style={{ visibility: showLabel ? 'visible' : 'hidden' }}
        >
          <ShimmerText>{label}</ShimmerText>
        </span>
        <span
          aria-hidden={refreshing}
          style={{ visibility: refreshing ? 'hidden' : 'visible' }}
        >
          {status}
        </span>
      </div>
      {children}
    </div>
  );
}
