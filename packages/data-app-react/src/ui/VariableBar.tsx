import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { classNames } from './classNames.ts';

export type VariableBarProps = {
  children: ReactNode;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** User-controlled inputs below the page header. */
export function VariableBar({
  children,
  className,
  role = 'group',
  'aria-label': ariaLabel = 'View variables',
  ...props
}: VariableBarProps) {
  return (
    <div
      {...props}
      className={classNames('altertable-variable-bar', className)}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
