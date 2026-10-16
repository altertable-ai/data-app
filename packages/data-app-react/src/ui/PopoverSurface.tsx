import { createContext, useContext, type ComponentProps } from 'react';
import { Popover } from 'react-aria-components';
import { classNames } from './classNames.ts';

export const PopoverContainerContext = createContext<HTMLElement | undefined>(
  undefined
);

/** Shared popup paint; each control owns placement, dimensions, and contents. */
export function PopoverSurface({
  className,
  ...props
}: ComponentProps<typeof Popover>) {
  const container = useContext(PopoverContainerContext);
  return (
    <Popover
      {...props}
      UNSTABLE_portalContainer={props.UNSTABLE_portalContainer ?? container}
      className={values =>
        classNames(
          'altertable-popover-surface',
          typeof className === 'function' ? className(values) : className
        )
      }
    />
  );
}
