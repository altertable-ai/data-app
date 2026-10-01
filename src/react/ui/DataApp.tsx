import { useDataAppPresentation } from '@/src/react/ui/useDataAppPresentation';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { useAppAppearance } from '@/src/react/ui/useAppAppearance';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataAppConfig } from '@/src/core/config';
import { displayedSnapshot } from '@/src/core/data-view';
import { AboutData, type AboutEmpty } from '@/src/react/ui/AboutData';
import { AppHeader } from '@/src/react/ui/AppHeader';
import { AppLayout } from '@/src/react/ui/AppLayout';
import { AppScope } from '@/src/react/ui/AppScope';
import { AppToolbar, type AppToolbarProps } from '@/src/react/ui/AppToolbar';
import type { DataContext } from '@/src/react/ui/data-context';
import type { BoundStory } from '@/src/react/ui/story';
import { ThemeToggle } from '@/src/react/ui/ThemeSelector';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { DataViewToast } from '@/src/react/ui/DataViewToast';
import { InspectionContext } from '@/src/react/ui/InspectionContext';
import { DataSection, type SectionResult } from '@/src/react/ui/DataSection';
import type { EmptyContent } from '@/src/react/ui/presentation';

type DataAppBaseProps = {
  config: DataAppConfig;
  dataContext: DataContext;
  aboutEmpty?: AboutEmpty;
  description?: ReactNode;
  /** Display names only; config.scope remains the connection identity. */
  scopeLabels?: { organization?: string; environment?: string };
  toolbarActions?: ReactNode;
  footerActions?: ReactNode;
  layoutProps?: Omit<
    ComponentProps<typeof AppLayout>,
    'children' | 'footerActions'
  >;
};

export type DataAppRequest<Data, Input> = SectionResult<Data, Input> & {
  queries?: DisclosedQuery[];
  refresh?: AppToolbarProps['refresh'];
  empty: EmptyContent;
  controls?: ReactNode;
};

export type DataAppProps<Data = unknown, Input = unknown> = DataAppBaseProps &
  (
    | {
        request: DataAppRequest<Data, Input>;
        /** Findings are always derived from the result currently visible to the reader. */
        story?: BoundStory<Data, Input>;
        children: (data: Data, displayedInput: Input) => ReactNode;
        loading?: ReactNode;
        label?: string;
        queries?: never;
        refresh?: never;
        variables?: never;
      }
    | {
        request?: never;
        story?: never;
        children: ReactNode;
        queries?: DisclosedQuery[];
        refresh?: AppToolbarProps['refresh'];
        variables?: ReactNode;
        loading?: never;
        empty?: never;
        label?: never;
      }
  );

/** Owns the page title, header, gutter, and width; body content uses section headings.
 * The primary request owns controls, empty state, displayed input, refresh, and inspection.
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
    toolbarActions,
    footerActions,
    layoutProps,
  } = props;
  const presentation = useDataAppPresentation();
  const isEmbedded = presentation?.surface === 'embedded';
  const themeController = useAppAppearance(
    config.appearance,
    presentation?.theme
  );
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (import.meta.env?.DEV && bodyRef.current?.querySelector('h1'))
      console.warn(
        'DataApp owns the page title. Use section headings (h2) in its body.'
      );
  });

  const snapshot = request && displayedSnapshot(request.view);
  const story =
    request && props.story && snapshot
      ? { findings: props.story(snapshot) }
      : undefined;
  const scope = (
    <AppScope
      organization={scopeLabels?.organization ?? config.scope.organization}
      environment={scopeLabels?.environment ?? config.scope.environment}
    />
  );
  const toolbar = (
    <AppToolbar
      requestState={request?.view.kind}
      refresh={refresh ?? request?.refresh}
      story={
        story && {
          ...story,
          title: config.title,
          scope,
          dataContext,
          empty: aboutEmpty,
          theme: themeController,
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
        footer={isEmbedded ? null : layoutProps?.footer}
        footerActions={
          footerActions ??
          (themeController && <ThemeToggle theme={themeController} />)
        }
      >
        {isEmbedded ? (
          toolbar
        ) : (
          <AppHeader
            scope={scope}
            title={config.title}
            description={description}
            toolbar={toolbar}
          />
        )}
        {(request?.controls ?? props.variables) && (
          <VariableBar>{request?.controls ?? props.variables}</VariableBar>
        )}
        <div ref={bodyRef} className="altertable-app-body">
          {request ? (
            <DataSection
              result={request}
              notice="none"
              dimOnUpdate={false}
              loading={props.loading}
              empty={request.empty}
              label={props.label}
            >
              {(data, displayedInput) => props.children(data, displayedInput)}
            </DataSection>
          ) : (
            props.children
          )}
        </div>
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
