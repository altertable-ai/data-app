import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';

export type ControlBarProps = {
  children: ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** User-controlled inputs below the page header. */
export function ControlBar({
  children,
  className,
  role = 'group',
  'aria-label': ariaLabel = 'View controls',
  ...props
}: ControlBarProps) {
  return (
    <div
      {...props}
      className={classNames('altertable-control-bar', className)}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
