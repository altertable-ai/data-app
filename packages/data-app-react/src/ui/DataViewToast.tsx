import { type DataView } from '@altertable/data-app/internal';
import { useEffect, useState, type ReactNode } from 'react';

import { Toast } from './Toast.tsx';

export type DataViewToastProps<Data, Input> = {
  view: DataView<Data, Input>;
  message?: ReactNode;
  notice?: ReactNode;
  onRetry?: () => void;
};

/** Page-level failures and notices. Routine activity belongs to the toolbar. */
export function DataViewToast<Data, Input>({
  view,
  message,
  notice,
  onRetry,
}: DataViewToastProps<Data, Input>) {
  const [delay, setDelay] = useState({ kind: view.kind, elapsed: false });
  if (delay.kind !== view.kind) setDelay({ kind: view.kind, elapsed: false });

  useEffect(() => {
    if (view.kind !== 'stale-error') return;
    const kind = view.kind;
    const timer = window.setTimeout(
      () => setDelay({ kind, elapsed: true }),
      3_000
    );

    return () => window.clearTimeout(timer);
  }, [view.kind]);

  const showStaleError =
    view.kind === 'stale-error' &&
    delay.kind === 'stale-error' &&
    delay.elapsed;

  if (!showStaleError && !notice) return null;
  const failed = showStaleError;
  const detail = view.kind === 'stale-error' ? view.message : undefined;
  const state = failed ? 'error' : 'notice';

  return (
    <Toast state={state} onRetry={onRetry}>
      {failed ? (message ?? detail) : notice}
    </Toast>
  );
}
