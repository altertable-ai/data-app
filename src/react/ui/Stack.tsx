import type { ComponentPropsWithRef, ReactNode } from 'react';
import { classNames } from '@/src/react/ui/classNames';

export type StackProps = {
  children: ReactNode;
  gap?: 'sm' | 'md' | 'lg';
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** Vertical layout for peer sections or request boundaries, with the page's section gap. */
export function Stack({
  children,
  gap = 'lg',
  className,
  ...props
}: StackProps) {
  return (
    <div
      {...props}
      className={classNames('altertable-stack', className)}
      data-gap={gap}
    >
      {children}
    </div>
  );
}
