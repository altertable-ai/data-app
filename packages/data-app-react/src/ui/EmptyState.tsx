import { type EmptyContent } from './presentation.ts';
import { classNames } from './classNames.ts';

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
      {action && <div className="altertable-empty-state-action">{action}</div>}
    </div>
  );
}
