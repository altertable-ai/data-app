import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { AppIcon } from './icons.ts';

export type NoticeProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
} & Omit<ComponentPropsWithRef<'aside'>, 'title' | 'children'>;

/** Quiet contextual feedback with an optional action. Content wraps before its action on narrow containers. */
export function Notice({
  title,
  description,
  action,
  className,
  ...props
}: NoticeProps) {
  return (
    <aside {...props} className={classNames('altertable-notice', className)}>
      <AppIcon name="info" size={16} className="altertable-notice-icon" />
      <div
        className="altertable-notice-content"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="altertable-notice-action">{action}</div>}
    </aside>
  );
}
