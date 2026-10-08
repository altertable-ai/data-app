import {
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { classNames } from '@/src/react/ui/classNames';

export type RefreshControlProps = {
  refreshing: boolean;
  children: ReactNode;
  label?: string;
  status?: ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** Show refresh progress just before its action after a short delay. */
export function RefreshControl({
  refreshing,
  children,
  label = 'Refreshing data',
  status,
  className,
  ...props
}: RefreshControlProps) {
  const [refreshDelay, setRefreshDelay] = useState({
    refreshing,
    elapsed: false,
  });
  if (refreshDelay.refreshing !== refreshing)
    setRefreshDelay({ refreshing, elapsed: false });

  useEffect(() => {
    if (!refreshing) return;
    const timer = window.setTimeout(
      () => setRefreshDelay({ refreshing: true, elapsed: true }),
      300
    );

    return () => window.clearTimeout(timer);
  }, [refreshing]);

  const showProgress =
    refreshing && refreshDelay.refreshing && refreshDelay.elapsed;

  return (
    <div
      {...props}
      className={classNames('altertable-refresh-control', className)}
      data-refreshing={showProgress ? '' : undefined}
    >
      <div
        className="altertable-refresh-status"
        aria-live="polite"
        aria-atomic="true"
      >
        {showProgress ? (status ?? label) : null}
      </div>
      {children}
    </div>
  );
}
