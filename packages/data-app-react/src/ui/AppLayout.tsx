import { type ComponentPropsWithRef, type ReactNode } from 'react';

import { AppFooter } from './AppFooter.tsx';
import { classNames } from './classNames.ts';
import { TooltipProvider } from './Tooltip.tsx';

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
