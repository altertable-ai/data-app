import { useEffect, useState, type ReactNode } from 'react';
import type { DataView } from '@/src/core/data-view';
import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';
import '@/src/react/ui/DataViewToast.css';

export type DataViewToastProps<Data, Input> = {
  view: DataView<Data, Input>;
  message?: ReactNode;
  notice?: ReactNode;
  onRetry?: () => void;
};

/** One page-level refresh status. Updating waits briefly to avoid flashing on fast requests;
 * a failed update stays visible with its retry action until the view changes. */
export function DataViewToast<Data, Input>({
  view,
  message,
  notice,
  onRetry,
}: DataViewToastProps<Data, Input>) {
  const [delay, setDelay] = useState({ kind: view.kind, elapsed: false });
  if (delay.kind !== view.kind) setDelay({ kind: view.kind, elapsed: false });

  useEffect(() => {
    if (view.kind !== 'updating') return;
    const timer = window.setTimeout(
      () => setDelay({ kind: 'updating', elapsed: true }),
      450
    );

    return () => window.clearTimeout(timer);
  }, [view.kind]);

  const failed = view.kind === 'stale-error';
  const updating =
    view.kind === 'updating' && delay.kind === 'updating' && delay.elapsed;
  if (!failed && !updating && !notice) return null;

  const content = failed || updating ? (message ?? view.message) : notice;
  const icon = failed ? 'error' : updating ? 'loading' : 'live';
  const state = failed ? 'stale-error' : updating ? 'updating' : 'notice';

  return (
    <div className="altertable-data-view-toast-region">
      <div
        className="altertable-data-view-toast"
        data-state={state}
        role={failed ? 'alert' : 'status'}
      >
        <AppIcon
          name={icon}
          size={16}
          className={
            updating ? 'altertable-data-view-toast-spinner' : undefined
          }
        />
        <span>{content}</span>
        {failed && onRetry && <Button onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  );
}
