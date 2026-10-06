import type { ComponentProps, ComponentPropsWithRef, ReactNode } from 'react';
import type { DataView } from '@/src/core/data-view';
import { ExportControl } from '@/src/react/ui/ExportControl';
import type { CsvExport } from '@/src/react/ui/csv-export';
import { LiveControl, type LiveControlProps } from '@/src/react/ui/LiveControl';
import { AppIcon } from '@/src/react/ui/icons';
import { IconButton } from '@/src/react/ui/IconButton';
import { PresentStory } from '@/src/react/ui/PresentStory';
import { RefreshControl } from '@/src/react/ui/RefreshControl';
import { classNames } from '@/src/react/ui/classNames';
import { shortcuts, useShortcut } from '@/src/react/ui/shortcuts';

export type AppToolbarProps = {
  children?: ReactNode;
  end?: ReactNode;
  controlsProps?: Omit<ComponentPropsWithRef<'div'>, 'children'>;
  updatedAt?: ReactNode;
  initialLoading?: boolean;
  requestState?: DataView<unknown, unknown>['kind'];
  refresh?: {
    refreshing: boolean;
    onRefresh: () => void;
    onCancel?: () => void;
    label?: string;
    tooltip?: ReactNode;
    buttonProps?: Omit<ComponentPropsWithRef<'button'>, 'children' | 'onClick'>;
    statusProps?: ComponentProps<typeof RefreshControl>['statusProps'];
  };
  live?: LiveControlProps;
  aboutData?: ReactNode;
  /** Null reserves a disabled story action while its findings are unavailable. */
  story?: ComponentProps<typeof PresentStory> | null;
  /** Null reserves a disabled export action while its data is unavailable. */
  csvExport?: CsvExport | null;
} & Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** Header actions only. Put reader-controlled inputs in DataApp.variables below the header.
 * Observation time, or an initial loading status, sits before Refresh. Children prepend app controls in the right
 * cluster; end follows the built-in actions. Live sits beside Refresh when supplied. Refresh also
 * answers Alt/Option+R and uses the button to cancel a running request when onCancel is provided;
 * refresh.tooltip overrides its static label. All built-in controls are optional. */
export function AppToolbar({
  children,
  updatedAt,
  initialLoading = false,
  requestState,
  refresh,
  live,
  aboutData,
  story,
  csvExport,
  end,
  controlsProps,
  className,
  role = 'group',
  'aria-label': ariaLabel = 'Page actions',
  ...props
}: AppToolbarProps) {
  const refreshLabel =
    refresh?.refreshing && refresh.onCancel
      ? 'Cancel refresh'
      : (refresh?.buttonProps?.['aria-label'] ?? 'Refresh data');

  function runRefresh() {
    if (refresh && !refresh.refreshing) refresh.onRefresh();
  }

  function activateRefresh() {
    if (!refresh) return;
    if (refresh.refreshing) refresh.onCancel?.();
    else refresh.onRefresh();
  }
  useShortcut(shortcuts.refresh, runRefresh, !!refresh);

  return (
    <div
      {...props}
      className={classNames('altertable-app-toolbar', className)}
      role={role}
      aria-label={ariaLabel}
    >
      <div
        {...controlsProps}
        className={classNames(
          'altertable-app-toolbar-actions',
          controlsProps?.className
        )}
      >
        {children}
        {(initialLoading || updatedAt) && (
          <span className="altertable-app-toolbar-updated">
            {initialLoading ? <output>Loading data</output> : updatedAt}
          </span>
        )}
        {refresh && (
          <RefreshControl
            refreshing={refresh.refreshing}
            label={
              requestState === 'loading'
                ? 'Loading data'
                : requestState === 'updating'
                  ? 'Updating data'
                  : refresh.label
            }
            statusProps={refresh.statusProps}
          >
            <IconButton
              {...refresh.buttonProps}
              icon="refresh"
              variant="elevated"
              label={refreshLabel}
              shortcut={shortcuts.refresh}
              tooltip={
                refresh.refreshing && refresh.onCancel
                  ? 'Cancel refresh'
                  : refresh.tooltip
              }
              onClick={activateRefresh}
            >
              <AppIcon
                name="refresh"
                className="altertable-refresh-idle"
                size={17}
              />
              <AppIcon
                name="loading"
                className="altertable-refresh-loading"
                size={17}
              />
              {refresh.onCancel && (
                <AppIcon
                  name="stop"
                  className="altertable-refresh-cancel"
                  size={17}
                  fill="currentColor"
                  strokeWidth={0}
                />
              )}
            </IconButton>
          </RefreshControl>
        )}
        {live && <LiveControl {...live} />}
        {aboutData}
        {csvExport !== undefined && (
          <ExportControl csv={csvExport ?? undefined} />
        )}
        {story !== undefined &&
          (story ? (
            <PresentStory {...story} />
          ) : (
            <IconButton
              icon="present"
              variant="elevated"
              label="Present story"
              disabled
            />
          ))}
        {end}
      </div>
    </div>
  );
}
