import type { ComponentProps } from 'react';
import { Popover } from 'react-aria-components';
import { classNames } from '@/src/react/ui/classNames';

/** Shared popup paint; each control owns placement, dimensions, and contents. */
export function PopoverSurface({
  className,
  ...props
}: ComponentProps<typeof Popover>) {
  return (
    <Popover
      {...props}
      className={values =>
        classNames(
          'altertable-popover-surface',
          typeof className === 'function' ? className(values) : className
        )
      }
    />
  );
}
