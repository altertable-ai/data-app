import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/src/react/ui/classNames';

export type TextContentProps = ComponentPropsWithRef<'div'>;

/** Prose typography for page introductions, widget bodies, and inspection content. */
export function TextContent({ className, ...props }: TextContentProps) {
  return (
    <div
      {...props}
      className={classNames('altertable-text-content', className)}
    />
  );
}
