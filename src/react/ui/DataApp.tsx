import { useState, type ComponentProps, type ReactNode } from 'react';
import { createThemeController } from '@/src/core/appearance';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataAppConfig } from '@/src/core/config';
import type { DataView } from '@/src/core/data-view';
import { AboutData, type AboutEmpty } from '@/src/react/ui/AboutData';
import { AppHeader } from '@/src/react/ui/AppHeader';
import { AppLayout } from '@/src/react/ui/AppLayout';
import { AppScope } from '@/src/react/ui/AppScope';
import { AppToolbar, type AppToolbarProps } from '@/src/react/ui/AppToolbar';
import type { DataContext } from '@/src/react/ui/data-context';
import type { PlayStoryProps } from '@/src/react/ui/PlayStory';
import { ThemeToggle } from '@/src/react/ui/ThemeSelector';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { DataViewToast } from '@/src/react/ui/DataViewToast';
import { InspectionContext } from '@/src/react/ui/InspectionContext';
import { DataSection } from '@/src/react/ui/DataSection';
import type { EmptyStateProps } from '@/src/react/ui/EmptyState';

type DataAppBaseProps = {
  config: DataAppConfig;
  dataContext: DataContext;
  aboutEmpty?: AboutEmpty;
  description?: ReactNode;
  /** Display names only; config.scope remains the connection identity. */
  scopeLabels?: { organization?: string; environment?: string };
  variables?: ReactNode;
  story?: Omit<PlayStoryProps, 'title' | 'dataContext' | 'empty'> &
    Partial<Pick<PlayStoryProps, 'title' | 'dataContext' | 'empty'>>;
  toolbarActions?: ReactNode;
  footerActions?: ReactNode;
  layoutProps?: Omit<
    ComponentProps<typeof AppLayout>,
    'children' | 'footerActions'
  >;
};

export type DataAppRequest<Data, Input> = {
  view: DataView<Data, Input>;
  refetch: () => unknown;
  queries?: DisclosedQuery[];
  refresh?: AppToolbarProps['refresh'];
  empty?: Pick<EmptyStateProps, 'title' | 'description'>;
  controls?: ReactNode;
};

export type DataAppProps<Data = unknown, Input = unknown> = DataAppBaseProps &
  (
    | ({
        request: DataAppRequest<Data, Input>;
        children: (data: Data, displayedInput: Input) => ReactNode;
        loading?: ReactNode;
        empty?: Pick<EmptyStateProps, 'title' | 'description'>;
        label?: string;
        queries?: never;
        refresh?: never;
      } & (
        | {
            request: DataAppRequest<Data, Input> & {
              empty: Pick<EmptyStateProps, 'title' | 'description'>;
            };
          }
        | { empty: Pick<EmptyStateProps, 'title' | 'description'> }
      ))
    | {
        request?: never;
        children: ReactNode;
        queries?: DisclosedQuery[];
        refresh?: AppToolbarProps['refresh'];
        loading?: never;
        empty?: never;
        label?: never;
      }
  );

/** The primary request owns the page's result, period, refresh status, and inspection context.
 * Without a request, the shell accepts authored children for setup or static views. */
export function DataApp<Data, Input>(props: DataAppProps<Data, Input>) {
  const {
    config,
    dataContext,
    aboutEmpty,
    description,
    scopeLabels,
    request,
    queries,
    refresh,
    variables,
    story,
    toolbarActions,
    footerActions,
    layoutProps,
  } = props;
  const [theme] = useState(() => createThemeController(config.appearance));
  const scope = (
    <AppScope
      organization={scopeLabels?.organization ?? config.scope.organization}
      environment={scopeLabels?.environment ?? config.scope.environment}
    />
  );

  return (
    <InspectionContext
      value={{
        dataContext,
        empty: aboutEmpty,
        queries: queries ?? request?.queries,
      }}
    >
      <AppLayout
        {...layoutProps}
        footerActions={footerActions ?? <ThemeToggle theme={theme} />}
      >
        <AppHeader
          scope={scope}
          title={config.title}
          description={description}
          toolbar={
            <AppToolbar
              requestState={request?.view.kind}
              refresh={refresh ?? request?.refresh}
              story={
                story && {
                  ...story,
                  title: story.title ?? config.title,
                  scope: story.scope ?? scope,
                  dataContext: story.dataContext ?? dataContext,
                  empty: story.empty ?? aboutEmpty,
                  theme: story.theme ?? theme,
                }
              }
              aboutData={
                <AboutData
                  id="data"
                  shortcut
                  dataContext={dataContext}
                  empty={aboutEmpty}
                  queries={queries ?? request?.queries}
                  iconOnly
                  variant="elevated"
                />
              }
            >
              {toolbarActions}
            </AppToolbar>
          }
        />
        {(variables ?? request?.controls) && (
          <VariableBar>{variables ?? request?.controls}</VariableBar>
        )}
        {request ? (
          <DataSection
            result={request}
            notice="none"
            loading={props.loading}
            empty={props.empty ?? request.empty!}
            label={props.label}
          >
            {(data, displayedInput) => props.children(data, displayedInput)}
          </DataSection>
        ) : (
          props.children
        )}
        {request && (
          <DataViewToast
            view={request.view}
            onRetry={() => void request.refetch()}
          />
        )}
      </AppLayout>
    </InspectionContext>
  );
}
