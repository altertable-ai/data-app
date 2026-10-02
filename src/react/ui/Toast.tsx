import type { ReactNode } from 'react';
import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';

/** Shared page-level feedback for requests and toolbar actions. */
export function Toast({
  state,
  children,
  onRetry,
  position = 'bottom',
}: {
  state: 'updating' | 'error' | 'notice';
  children: ReactNode;
  onRetry?: () => void;
  position?: 'top' | 'bottom';
}) {
  const failed = state === 'error';
  const updating = state === 'updating';
  return (
    <div className="altertable-data-view-toast-region" data-position={position}>
      <div
        className="altertable-data-view-toast"
        data-state={state}
        role={failed ? 'alert' : 'status'}
      >
        <AppIcon
          name={failed ? 'error' : updating ? 'loading' : 'live'}
          size={16}
          className={
            updating ? 'altertable-data-view-toast-spinner' : undefined
          }
        />
        <span>{children}</span>
        {failed && onRetry && <Button onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  );
}
