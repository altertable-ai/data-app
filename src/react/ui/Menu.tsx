import type { ComponentPropsWithRef } from 'react';
import {
  MenuTrigger,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection,
  Popover,
  Separator,
  type MenuProps,
  type MenuItemProps,
  type MenuTriggerProps,
} from 'react-aria-components';
import { SelectionMark } from '@/src/react/ui/SelectionMark';
import { classNames } from '@/src/react/ui/classNames';

export { MenuTrigger, MenuSection };
export { PressButton as MenuButton } from '@/src/react/ui/Button';
export type { MenuProps, MenuItemProps, MenuTriggerProps };

export type MenuPopoverProps = ComponentPropsWithRef<typeof Popover>;

/** Anchored popup for a Menu; the surrounding MenuTrigger owns focus and dismissal. */
export function MenuPopover({
  className,
  placement = 'bottom start',
  ...props
}: MenuPopoverProps) {
  return (
    <Popover
      {...props}
      placement={placement}
      className={state =>
        classNames(
          'altertable-menu-popover',
          typeof className === 'function' ? className(state) : className
        )
      }
    />
  );
}

/** Actions by default; single selection creates radio items, multiple creates checkbox items. */
export function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <AriaMenu
      {...props}
      className={state =>
        classNames(
          'altertable-menu',
          typeof className === 'function' ? className(state) : className
        )
      }
    />
  );
}

export function MenuItem<T extends object>({
  className,
  children,
  ...props
}: MenuItemProps<T>) {
  return (
    <AriaMenuItem
      data-atbl-internal-surface="option"
      data-atbl-focus="inset"
      data-atbl-control="action"
      {...props}
      className={state =>
        classNames(
          'altertable-menu-item',
          typeof className === 'function' ? className(state) : className
        )
      }
    >
      {state => (
        <>
          {state.selectionMode !== 'none' && (
            <SelectionMark
              selected={state.isSelected}
              multiple={state.selectionMode === 'multiple'}
            />
          )}
          {typeof children === 'function' ? children(state) : children}
        </>
      )}
    </AriaMenuItem>
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentPropsWithRef<typeof Separator>) {
  return (
    <Separator
      {...props}
      className={classNames('altertable-menu-separator', className)}
    />
  );
}
