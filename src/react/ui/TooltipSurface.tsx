import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/src/react/ui/classNames';

/** Shared surface for floating hints and chart value inspection. */
export function TooltipSurface({
  className,
  ...props
}: ComponentPropsWithRef<'span'>) {
  return (
    <span
      {...props}
      className={classNames('altertable-tooltip-content', className)}
    />
  );
}
