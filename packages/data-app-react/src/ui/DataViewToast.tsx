import { type DataView } from '@altertable/data-app/internal';
import { type ReactNode } from 'react';

import { Toast } from './Toast.tsx';
import { useDelayedLoading } from './useDelayedLoading.ts';

export type DataViewToastProps<Data, Input> = {
  view: DataView<Data, Input>;
  refreshing?: boolean;
  message?: ReactNode;
  notice?: ReactNode;
  onRetry?: () => void;
};

/** Page-level failures and notices. Routine activity belongs to the toolbar. */
export function DataViewToast<Data, Input>({
  view,
  refreshing,
  message,
  notice,
  onRetry,
}: DataViewToastProps<Data, Input>) {
  const showStaleError = useDelayedLoading(
    view.kind === 'stale-error' && !refreshing,
    3000
  );

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
