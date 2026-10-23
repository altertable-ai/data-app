import { type DataView } from '@altertable/data-app/internal';
import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { AppIcon } from './icons.ts';
import { WidgetStatusContext } from './RequestHint.tsx';
import { useDelayedLoading } from './useDelayedLoading.ts';

export type DataBoundaryProps<T, Input = unknown> = {
  view: DataView<T, Input>;
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
  loadingFallback,
  emptyFallback,
  error,
  staleError,
  notice = 'none',
  children,
  className,
  ...props
}: DataBoundaryProps<T, Input>) {
  const updating = view.kind === 'updating';
  const showUpdating = useDelayedLoading(updating);
  const hasStaleError = view.kind === 'stale-error';

  return (
    <div
      {...props}
      className={classNames('altertable-data-boundary', className)}
    >
      {notice === 'inline' && hasStaleError && (
        <div
          className="altertable-data-boundary-notice"
          data-state={view.kind}
          role="alert"
        >
          <AppIcon name="error" size={16} />
          <span className="altertable-data-boundary-message">
            {view.message}
          </span>
          {staleError && (
            <span className="altertable-data-boundary-action">
              {staleError(view.error)}
            </span>
          )}
        </div>
      )}
      <WidgetStatusContext
        value={
          notice === 'inline'
            ? { kind: showUpdating ? 'updating' : 'idle' }
            : undefined
        }
      >
        <div className="altertable-data-boundary-content" aria-busy={updating}>
          {view.kind === 'loading'
            ? loadingFallback
            : view.kind === 'empty'
              ? emptyFallback
              : view.kind === 'error'
                ? error(view.error)
                : children(
                    view.data,
                    view.kind === 'ready' ? view.input : view.displayedInput
                  )}
        </div>
      </WidgetStatusContext>
    </div>
  );
}
