import { useDataAppPresentation } from '@/src/react/ui/useDataAppPresentation';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { useAppAppearance } from '@/src/react/ui/useAppAppearance';
import type { DisclosedQuery } from '@/src/core/contract';
import type { DataAppConfig } from '@/src/core/config';
import type { CsvExport } from '@/src/react/ui/csv-export';
import {
  displayedSnapshot,
  type DisplayedSnapshot,
} from '@/src/core/data-view';
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
import type { SectionResult } from '@/src/react/ui/DataSection';

type DataAppBaseProps = {
  children: ReactNode;
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
  controls?: ReactNode;
};

export type DataAppProps<Data = unknown, Input = unknown> = DataAppBaseProps &
  (
    | {
        request: DataAppRequest<Data, Input>;
        /** Findings are always derived from the result currently visible to the reader. */
        story: BoundStory<Data, Input>;
        /** Every analytical view exports every distinct dataset in its displayed result. */
        csvExport: (snapshot: DisplayedSnapshot<Data, Input>) => CsvExport;
        queries?: never;
        refresh?: never;
        variables?: never;
      }
    | {
        request?: never;
        story?: never;
        csvExport?: CsvExport;
        queries?: DisclosedQuery[];
        refresh?: AppToolbarProps['refresh'];
        variables?: ReactNode;
      }
  );

/** Owns the page title, header, gutter, and width; body content uses section headings.
 * The primary request binds the toolbar, controls, refresh, and inspection.
 * Children always render; compose DataSection boundaries around independently loading content. */
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
  const findings = request && snapshot ? props.story(snapshot) : undefined;
  const story = findings?.length ? { findings } : undefined;
  const scope = (
    <AppScope
      organization={scopeLabels?.organization ?? config.scope.organization}
      environment={scopeLabels?.environment ?? config.scope.environment}
    />
  );
  const toolbar = (
    <AppToolbar
      csvExport={
        request
          ? snapshot
            ? props.csvExport(snapshot)
            : null
          : props.csvExport
      }
      requestState={request?.view.kind}
      refresh={refresh ?? request?.refresh}
      story={
        story
          ? {
              ...story,
              title: config.title,
              scope,
              dataContext,
              empty: aboutEmpty,
              theme: themeController,
            }
          : request
            ? null
            : undefined
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
          {props.children}
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
