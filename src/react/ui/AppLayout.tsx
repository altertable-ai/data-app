import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { AppFooter } from '@/src/react/ui/AppFooter';
import {
  TooltipProvider,
  type TooltipProviderProps,
} from '@/src/react/ui/Tooltip';
import '@/src/react/ui/AppLayout.css';

export type AppLayoutProps = {
  children: ReactNode;
  footerActions?: ReactNode;
  footer?: ReactNode;
  footerProps?: Omit<ComponentProps<typeof AppFooter>, 'children'>;
  layoutProps?: Omit<ComponentPropsWithRef<'div'>, 'children'>;
  tooltipProviderProps?: Omit<TooltipProviderProps, 'children'>;
} & Omit<ComponentPropsWithRef<'main'>, 'children'>;

/**
 * Native props target `<main>`. `layoutProps` targets the outer wrapper; `footer` replaces the
 * default footer, while `footerActions` fills it.
 */
export function AppLayout({
  children,
  footerActions,
  footer,
  footerProps,
  layoutProps,
  tooltipProviderProps,
  className,
  ...props
}: AppLayoutProps) {
  return (
    <TooltipProvider {...tooltipProviderProps}>
      <div
        {...layoutProps}
        className={classNames('altertable-app-layout', layoutProps?.className)}
      >
        <main
          {...props}
          className={classNames('altertable-app-main', className)}
        >
          {children}
        </main>
        {footer === undefined ? (
          <AppFooter {...footerProps}>{footerActions}</AppFooter>
        ) : (
          footer
        )}
      </div>
    </TooltipProvider>
  );
}
