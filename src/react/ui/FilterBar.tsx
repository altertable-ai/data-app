import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/src/react/ui/classNames';
export type FilterBarProps = ComponentPropsWithRef<'div'>;
export function FilterBar({
  className,
  role = 'group',
  'aria-label': label = 'Filters',
  ...props
}: FilterBarProps) {
  return (
    <div
      {...props}
      role={role}
      aria-label={label}
      className={classNames('altertable-filter-bar', className)}
    />
  );
}
