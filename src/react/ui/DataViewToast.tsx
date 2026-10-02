import { useEffect, useState, type ReactNode } from 'react';
import type { DataView } from '@/src/core/data-view';
import { Toast } from '@/src/react/ui/Toast';

export type DataViewToastProps<Data, Input> = {
  view: DataView<Data, Input>;
  message?: ReactNode;
  notice?: ReactNode;
  onRetry?: () => void;
};

/** One page-level refresh status. Updating waits briefly; a failed refresh waits
 * long enough to avoid interrupting the displayed result before showing retry. */
export function DataViewToast<Data, Input>({
  view,
  message,
  notice,
  onRetry,
}: DataViewToastProps<Data, Input>) {
  const [delay, setDelay] = useState({ kind: view.kind, elapsed: false });
  if (delay.kind !== view.kind) setDelay({ kind: view.kind, elapsed: false });

  useEffect(() => {
    if (view.kind !== 'updating' && view.kind !== 'stale-error') return;
    const kind = view.kind;
    const timer = window.setTimeout(
      () => setDelay({ kind, elapsed: true }),
      kind === 'stale-error' ? 3_000 : 450
    );

    return () => window.clearTimeout(timer);
  }, [view.kind]);

  const showUpdating =
    view.kind === 'updating' && delay.kind === 'updating' && delay.elapsed;
  const showStaleError =
    view.kind === 'stale-error' &&
    delay.kind === 'stale-error' &&
    delay.elapsed;

  if (!showStaleError && !showUpdating && !notice) return null;
  const failed = showStaleError;
  const showingUpdate = view.kind === 'updating' && showUpdating;
  const detail =
    view.kind === 'stale-error' || view.kind === 'updating'
      ? view.message
      : undefined;
  const state = failed ? 'error' : showingUpdate ? 'updating' : 'notice';

  return (
    <Toast state={state} onRetry={onRetry}>
      {failed || showingUpdate ? (message ?? detail) : notice}
    </Toast>
  );
}
