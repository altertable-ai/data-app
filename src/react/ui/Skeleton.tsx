import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/src/react/ui/classNames';

export type SkeletonProps = Omit<
  ComponentPropsWithRef<'span'>,
  'children' | 'aria-hidden'
>;

/** Decorative loading placeholder that fades in only when loading takes a moment.
 * Put the accessible status on its container. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={classNames('altertable-skeleton', className)}
    />
  );
}
