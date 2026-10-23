import { createContext } from 'react';

import { Button } from './Button.tsx';
import { AppIcon } from './icons.ts';
import { ShimmerText } from './ShimmerText.tsx';
import { Tooltip } from './Tooltip.tsx';

/** Idle keeps the same reserved space as refresh and failure. Initial loading belongs to skeletons. */
export type WidgetStatus =
  | { kind: 'idle' }
  | { kind: 'updating'; message?: string }
  | { kind: 'error'; message?: string; onRetry?: () => void };

/** Independent sections share their activity through the existing widget header slots. */
export const WidgetStatusContext = createContext<WidgetStatus | undefined>(
  undefined
);

/** Fixed-height feedback keeps data in place; the retry belongs beside its failure message. */
export function RequestHint({
  status,
  retryLabel = 'Retry',
}: {
  status?: WidgetStatus;
  retryLabel?: string;
}) {
  const active = status && status.kind !== 'idle';
  const message = active
    ? (status.message ??
      (status.kind === 'error' ? 'Couldn’t refresh' : 'Refreshing…'))
    : '';

  return (
    <div
      className="altertable-request-hint"
      data-state={status?.kind ?? 'idle'}
      role={status?.kind === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
    >
      {active && (
        <>
          <span className="altertable-request-hint-copy">
            <AppIcon
              name={status.kind === 'error' ? 'error' : 'loading'}
              size={14}
              className={
                status.kind === 'updating'
                  ? 'altertable-request-hint-spinner'
                  : undefined
              }
            />
            <span className="altertable-request-hint-message" title={message}>
              {message}
            </span>
          </span>
          {status.kind === 'error' && status.onRetry && (
            <Button variant="ghost" size="compact" onClick={status.onRetry}>
              {retryLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** Supplied status reserves a fixed footprint across request states; omission leaves space for the title. */
export function WidgetStatusControl({ status }: { status?: WidgetStatus }) {
  if (!status) return null;
  const kind = status.kind;
  const message =
    status?.kind === 'error'
      ? (status.message ?? 'Couldn’t refresh')
      : 'Refreshing';

  return (
    <div
      className="altertable-widget-status"
      data-state={kind}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
    >
      {kind === 'updating' && <ShimmerText>Refreshing</ShimmerText>}
      {status?.kind === 'error' && (
        <>
          <span className="altertable-widget-status-announcement">
            {message}
          </span>
          <Tooltip
            content={`${message}. ${status.onRetry ? 'Try again to refresh these results.' : 'Refresh this view to try again.'}`}
          >
            <Button
              variant="ghost"
              size="compact"
              onClick={status.onRetry}
              disabled={!status.onRetry}
            >
              <AppIcon name="error" size={14} />
              Retry
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
