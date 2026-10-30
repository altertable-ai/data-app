import { type DisclosedQuery } from '@altertable/data-app/contract';
import {
  displayedSnapshot,
  type DisplayedSnapshot,
} from '@altertable/data-app/internal';
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';

import { AnnotationControls } from '../annotations/AnnotationControls.tsx';
import { useDataApp } from '../app-context.ts';
import { AboutData } from './AboutData.tsx';
import { AppHeader } from './AppHeader.tsx';
import { AppLayout } from './AppLayout.tsx';
import { AppScope } from './AppScope.tsx';
import { AppToolbar } from './AppToolbar.tsx';
import { type CsvExport } from './csv-export.ts';
import { type DataContext } from './data-context.ts';
import { type SectionResult } from './DataSectionBoundary.tsx';
import { DataViewToast } from './DataViewToast.tsx';
import { InspectionContext } from './InspectionContext.tsx';
import { InspectionProvider } from './InspectionProvider.tsx';
import { Stack } from './Stack.tsx';
import { type BoundStory } from './story.ts';
import { TextContent } from './TextContent.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useAppAppearance } from './useAppAppearance.ts';
import { useDataAppPresentation } from './useDataAppPresentation.ts';
import { VariableBar } from './VariableBar.tsx';

export type DataAppBaseProps = {
  children: ReactNode;
  dataContext: DataContext;
  /** Override the declared subtitle; null hides it. */
  description?: ReactNode;
  /** Show page actions. Defaults to true; does not hide filters or data states. */
  showToolbar?: boolean;
  toolbarActions?: ReactNode;
  footerActions?: ReactNode;
  /** Optional source, coverage, or methodology note below the app content.
   * Compose prose and inline components; typography and spacing are provided.
   * Put data widgets in children and app controls in footerActions. */
  footer?: ReactNode;
};

type DataAppRequest<Data, Input> = SectionResult<Data, Input> & {
  queries?: DisclosedQuery[];
  /** Actual request activity, including retries with retained data. */
  refreshing?: boolean;
  cancel?: () => unknown;
  searchControls?: ReactNode;
  filterControls?: ReactNode;
};

export type DataAppControlProps = {
  /** Show declared search controls. Defaults to true; hiding preserves their values. */
  showSearch?: boolean;
  /** Show declared filter controls, including display options. Defaults to true; hiding preserves their values. */
  showFilters?: boolean;
};

export type StaticDataAppProps = DataAppBaseProps & {
  csvExport?: CsvExport;
  queries?: DisclosedQuery[];
};

export type DataAppProps<Data = unknown, Input = unknown> =
  | (DataAppBaseProps &
      DataAppControlProps & {
        request: DataAppRequest<Data, Input>;
        /** Findings are always derived from the result currently visible to the user. */
        story?: BoundStory<Data, Input>;
        /** Export every distinct dataset in the displayed result. */
        csvExport?: (snapshot: DisplayedSnapshot<Data, Input>) => CsvExport;
        queries?: never;
      })
  | (StaticDataAppProps & {
      request?: never;
      story?: never;
    });

/** Owns the page title, header, gutter, and width; body content uses section headings.
 * The primary request binds the toolbar, controls, refresh, and inspection.
 * Children always render; compose DataSection boundaries around independently loading content. */
export function DataAppFrame<Data, Input>(props: DataAppProps<Data, Input>) {
  const {
    dataContext,
    description,
    request,
    queries,
    footerActions,
    toolbarActions,
  } = props;
  const app = useDataApp();
  const presentation = useDataAppPresentation();
  const isEmbedded = presentation?.surface === 'embedded';
  const themeController = useAppAppearance(app.appearance, presentation?.theme);
  const bodyRef = useRef<ComponentRef<'div'>>(null);
  useEffect(() => {
    if (import.meta.env?.DEV && bodyRef.current?.querySelector('h1'))
      console.warn(
        'DataApp owns the page title. Use section headings (h2) in its body.'
      );
  });

  const snapshot = request && displayedSnapshot(request.view);
  const findings = request && snapshot ? props.story?.(snapshot) : undefined;
  const story = findings?.length ? { findings } : undefined;
  const scope = (
    <AppScope
      organization={app.scope.organization}
      environment={app.scope.environment}
    />
  );
  const toolbar =
    props.showToolbar === false ? null : (
      <AppToolbar
        csvExport={
          request
            ? snapshot
              ? props.csvExport?.(snapshot)
              : props.csvExport
                ? null
                : undefined
            : props.csvExport
        }
        requestState={request?.view.kind}
        refresh={
          request
            ? {
                refreshing:
                  request.refreshing ??
                  (request.view.kind === 'loading' ||
                    request.view.kind === 'updating'),
                onRefresh: () => void request.refetch(),
                onCancel: request.cancel
                  ? () => void request.cancel?.()
                  : undefined,
              }
            : undefined
        }
        story={
          story
            ? {
                ...story,
                title: app.title,
                scope,
                dataContext,
                theme: themeController,
              }
            : request && props.story
              ? null
              : undefined
        }
        aboutData={
          <AboutData
            id="data"
            shortcut
            dataContext={dataContext}
            queries={request?.queries ?? queries}
            iconOnly
            variant="elevated"
          />
        }
      >
        {presentation?.annotations?.enabled && (
          <AnnotationControls
            rootRef={bodyRef}
            presentation={presentation.annotations}
            displayedInput={snapshot?.input}
            view={snapshot?.state}
          />
        )}
        {toolbarActions}
      </AppToolbar>
    );

  const searchRegion =
    request?.searchControls && props.showSearch !== false ? (
      <VariableBar
        className="altertable-variable-searches"
        aria-label="Search variables"
      >
        {request.searchControls}
      </VariableBar>
    ) : null;
  const filterRegion =
    request?.filterControls && props.showFilters !== false
      ? request.filterControls
      : null;

  return (
    <InspectionProvider>
      <InspectionContext
        value={{
          dataContext,
          queries: request?.queries ?? queries,
          primaryView: request?.view,
        }}
      >
        <AppLayout
          footer={isEmbedded ? null : undefined}
          footerActions={
            <>
              {footerActions}
              {themeController && <ThemeToggle theme={themeController} />}
            </>
          }
        >
          {isEmbedded ? (
            toolbar
          ) : (
            <AppHeader
              scope={scope}
              title={app.title}
              description={
                description === undefined ? app.description : description
              }
              toolbar={toolbar}
            />
          )}
          {(searchRegion != null || filterRegion != null) && (
            <Stack gap="sm">
              {searchRegion}
              {filterRegion}
            </Stack>
          )}
          <div ref={bodyRef} tabIndex={-1} className="altertable-app-body">
            {props.children}
          </div>
          {props.footer != null && (
            <footer className="altertable-app-content-footer">
              <TextContent>{props.footer}</TextContent>
            </footer>
          )}
          {request && (
            <DataViewToast
              view={request.view}
              onRetry={() => void request.refetch()}
            />
          )}
        </AppLayout>
      </InspectionContext>
    </InspectionProvider>
  );
}
