import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';

import { classNames } from './classNames.ts';
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { AppIcon } from './icons.ts';

export type WidgetDisclosureProps = {
  label: ReactNode;
  children: ReactNode;
} & Omit<ComponentPropsWithRef<'details'>, 'children'>;

export function WidgetDisclosure({
  label,
  children,
  className,
  ...props
}: WidgetDisclosureProps) {
  const focused = useContext(FocusedWidgetContext);
  return (
    <details
      {...props}
      // A capture shows the disclosed content; the focused surface blocks toggling.
      {...(focused ? { open: true } : {})}
      className={classNames('altertable-widget-disclosure', className)}
    >
      <summary data-atbl-focus="ring" data-atbl-control="action">
        {label}
        <AppIcon name="disclosure" size={16} />
      </summary>
      <div className="altertable-widget-disclosure-content">{children}</div>
    </details>
  );
}
