import { type DataView } from '@altertable/data-app/internal';
import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { AppIcon } from './icons.ts';
import { QueryProgressContext } from './LoadingProgress.tsx';
import { ProgressPercentage } from './ProgressPercentage.tsx';

export type DataBoundaryProps<T, Input = unknown> = {
  view: DataView<T, Input>;
  progress?: number;
  queryProgress?: Readonly<Record<string, number>>;
  loadingFallback: ReactNode;
  emptyFallback: ReactNode;
  error: (error: Error) => ReactNode;
  staleError?: (error: Error) => ReactNode;
  notice?: 'inline' | 'none';
  children: (data: T, displayedInput: Input) => ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** Render one request state at a time. Prior content remains readable during an update.
 * Feedback ownership is supplied by the containing section. */
export function DataBoundary<T, Input>({
  view,
  progress,
  queryProgress,
  loadingFallback,
  emptyFallback,
  error,
  staleError,
  notice = 'none',
  children,
  className,
  ...props
}: DataBoundaryProps<T, Input>) {
  if (view.kind === 'loading' || view.kind === 'empty' || view.kind === 'error')
    return (
      <div
        {...props}
        className={classNames('altertable-data-boundary', className)}
      >
        {view.kind === 'loading' ? (
          <QueryProgressContext value={queryProgress}>
            {loadingFallback}
          </QueryProgressContext>
        ) : view.kind === 'empty' ? (
          emptyFallback
        ) : (
          error(view.error)
        )}
      </div>
    );

  const updating = view.kind === 'updating';
  const hasStaleError = view.kind === 'stale-error';

  return (
    <div
      {...props}
      className={classNames('altertable-data-boundary', className)}
    >
      {notice === 'inline' && (updating || hasStaleError) && (
        <div
          className="altertable-data-boundary-notice"
          data-state={view.kind}
          role={hasStaleError ? 'alert' : 'status'}
        >
          {updating ? (
            <AppIcon
              name="loading"
              size={16}
              className="altertable-data-boundary-spinner"
            />
          ) : (
            <AppIcon name="error" size={16} />
          )}
          <span className="altertable-data-boundary-message">
            {view.message}
          </span>
          {updating && progress !== undefined && (
            <ProgressPercentage progress={progress} />
          )}
          {staleError && view.kind === 'stale-error' && (
            <span className="altertable-data-boundary-action">
              {staleError(view.error)}
            </span>
          )}
        </div>
      )}
      <div className="altertable-data-boundary-content" aria-busy={updating}>
        {children(
          view.data,
          view.kind === 'ready' ? view.input : view.displayedInput
        )}
      </div>
    </div>
  );
}
