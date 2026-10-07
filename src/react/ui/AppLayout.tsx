import type { ComponentPropsWithRef, ReactNode } from 'react';
import { classNames } from '@/src/react/ui/classNames';
import { AppFooter } from '@/src/react/ui/AppFooter';
import { TooltipProvider } from '@/src/react/ui/Tooltip';

export type AppLayoutProps = {
  children: ReactNode;
  footerActions?: ReactNode;
  footer?: ReactNode;
} & Omit<ComponentPropsWithRef<'main'>, 'children'>;

/**
 * Native props target `<main>`. The shell owns its wrapper and tooltip defaults.
 */
export function AppLayout({
  children,
  footerActions,
  footer,
  className,
  ...props
}: AppLayoutProps) {
  return (
    <TooltipProvider>
      <div className="altertable-app-layout">
        <main
          {...props}
          className={classNames('altertable-app-main', className)}
        >
          {children}
        </main>
        {footer === undefined ? <AppFooter>{footerActions}</AppFooter> : footer}
      </div>
    </TooltipProvider>
  );
}
