import { useContext } from 'react';

import { classNames } from './classNames.ts';
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { type EmptyContent } from './presentation.ts';

export type EmptyStateProps = EmptyContent & {
  variant?: 'visual' | 'table';
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  variant = 'visual',
  className,
}: EmptyStateProps) {
  const focused = useContext(FocusedWidgetContext);
  return (
    <div
      className={classNames('altertable-empty-state', className)}
      data-variant={variant}
      aria-live="polite"
      aria-atomic="true"
    >
      {description ? (
        <>
          <strong>{title}</strong>
          <p>{description}</p>
        </>
      ) : (
        <p>{title}</p>
      )}
      {!focused && action && (
        <div className="altertable-empty-state-action">{action}</div>
      )}
    </div>
  );
}
