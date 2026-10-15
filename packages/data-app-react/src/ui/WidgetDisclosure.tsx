import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { classNames } from './classNames.ts';
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
  return (
    <details
      {...props}
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
