import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { shortcutLabel, type Shortcut } from '@/src/react/ui/shortcuts';

export type KbdProps = ComponentPropsWithRef<'kbd'> & { shortcut?: Shortcut };

/** A visible key or shortcut. Keep aria-keyshortcuts on the associated control. */
export function Kbd({ shortcut, children, className, ...props }: KbdProps) {
  return (
    <kbd {...props} className={classNames('altertable-kbd', className)}>
      {shortcut ? shortcutLabel(shortcut) : children}
    </kbd>
  );
}
