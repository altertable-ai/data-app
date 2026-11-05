import {
  KEY_SEPARATOR,
  invariant,
  type DataReading,
  type DisplayedSnapshot,
} from '@altertable/data-app/internal';
import { type ReactNode } from 'react';

import { useDataApp } from '../app-context.ts';
import {
  registeredEvidence,
  exportDatasets,
  RegisteredBinding,
  type ExportDataset,
} from '../bindings.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import { DetailRoutes, type DetailContent } from '../details.tsx';
import { SearchSuggestionsContext } from '../search-suggestions.ts';
import { ownedSource } from '../source-owner.ts';
import {
  AppViewResultsContext,
  assertAppRendersFilters,
  type DeclaredView,
  type ViewResult,
  useDeclaredResult,
} from '../view-runtime.tsx';
import {
  DataAppFrame,
  type DataAppBaseProps,
  type DataAppControlProps,
} from './DataAppFrame.tsx';
import type { StoryFinding } from './story.ts';

/** A declared data or time view that `<DataApp>` can run and describe. */
export type DataAppView<Data, Input> = DeclaredView<Data, Input> & {
  scope(snapshot: DisplayedSnapshot<Data, Input>): string;
};
type AnyView = DataAppView<any, any>;
/** Read a view's data and input through its `scope()` signature. */
type SnapshotOf<View> = View extends {
  scope(snapshot: infer Snapshot): string;
}
  ? Snapshot
  : never;
type ExportOf<View> = View extends {
  scope(snapshot: DisplayedSnapshot<infer Data, infer Input>): string;
}
  ? ExportDataset<Data, Input>
  : never;
type StoryFindings = readonly (Omit<StoryFinding, 'evidence'> & {
  evidence: RegisteredBinding;
})[];

export type DataAppProps<
  Data,
  Input = unknown,
  SummaryViews extends readonly AnyView[] = [],
> = Omit<DataAppBaseProps, 'dataContext'> &
  DataAppControlProps & {
    view: DataAppView<Data, Input>;
    /** Other views that the story and CSV export read, sharing `view`’s data context.
     * They load with `view` instead of waiting for their sections to near the viewport. */
    summaryViews?: SummaryViews;
    /** Show supplied datasets’ record suggestions on the first declared search. Defaults to true. */
    showSearchSuggestions?: boolean;
    /** Omit to leave presentation out of the toolbar. Receives `view`’s displayed
     * snapshot, then one per summary view in `summaryViews` order. */
    story?: (
      snapshot: DisplayedSnapshot<Data, Input>,
      ...summaries: {
        [Index in keyof SummaryViews]: SnapshotOf<SummaryViews[Index]>;
      }
    ) => StoryFindings;
    /** Omit to leave CSV export out of the toolbar. Datasets may belong to `view` or a summary view. */
    datasets?: readonly [
      ExportDataset<Data, Input> | ExportOf<SummaryViews[number]>,
      ...(ExportDataset<Data, Input> | ExportOf<SummaryViews[number]>)[],
    ];
    /** Detail destinations available to dataset actions and metric record inspection. */
    details?: readonly DetailContent<any, any>[];
  };

/** Executes the primary view and its summary views, and owns controls, inspection, exports, and stories. */
export function DataApp<
  Data,
  Input,
  const SummaryViews extends readonly AnyView[] = [],
>(props: DataAppProps<Data, Input, SummaryViews>) {
  const { summaryViews = [], ...appProps } = props;
  return (
    <SummaryResults views={summaryViews} results={[]}>
      {summaries => <PrimaryDataApp {...appProps} summaries={summaries} />}
    </SummaryResults>
  );
}

type SummaryResult = { view: AnyView; result: ViewResult<unknown, unknown> };
type SummaryResultsProps = {
  views: readonly AnyView[];
  results: readonly SummaryResult[];
  children: (results: readonly SummaryResult[]) => ReactNode;
};

/** Subscribe to each summary view in order, one hook call per component. */
function SummaryResults(props: SummaryResultsProps) {
  const view = props.views[props.results.length];
  if (!view) return props.children(props.results);
  return <SummaryViewResult {...props} view={view} />;
}

function SummaryViewResult({
  view,
  ...props
}: SummaryResultsProps & { view: AnyView }) {
  const result = useDeclaredResult(view);
  return (
    <SummaryResults {...props} results={[...props.results, { view, result }]} />
  );
}

function PrimaryDataApp<
  Data,
  Input,
  const SummaryViews extends readonly AnyView[],
>(
  props: Omit<DataAppProps<Data, Input, SummaryViews>, 'summaryViews'> & {
    summaries: readonly SummaryResult[];
  }
) {
  const {
    view,
    summaries,
    datasets,
    story,
    showSearchSuggestions = true,
    details = [],
    children,
    ...frame
  } = props;
  const app = useDataApp();
  const primary = useDeclaredResult(view);
  // Views in one app have different data shapes; each binding checks its own owner.
  const results = new Map<object, ViewResult<any, any>>([
    [view, primary],
    ...summaries.map(({ view, result }) => [view, result] as const),
  ]);
  const owners = [...results.keys()];
  for (const summary of summaries) {
    invariant(
      summary.result.dataContext === primary.dataContext,
      'Summary views must share the app view’s data context.'
    );
    assertAppRendersFilters(summary.view, view);
  }
  const datasetOwners = (datasets ?? []).map(dataset => {
    const owner = RegisteredBinding.owner(dataset);
    invariant(
      owner && results.has(owner),
      'A toolbar dataset must belong to the app view or one of its summary views.'
    );
    return owner;
  });
  /** Read the owners' displayed snapshots, marked for their bindings, once each has loaded. */
  function readDisplayed<Value>(
    sourceOwners: readonly object[],
    read: (sources: DisplayedSnapshot<any, any>[]) => Value
  ): DataReading<Value> {
    const snapshots = sourceOwners.map(owner => results.get(owner)?.snapshot);
    if (!snapshots.every(isDefined)) return { loading: true };
    return {
      loading: false,
      value: read(
        snapshots.map((snapshot, index) =>
          ownedSource(sourceOwners[index]!, snapshot)
        )
      ),
    };
  }
  /** The owner's displayed snapshot, or its loading state, marked for its bindings. */
  function sourceOf(owner: object) {
    return ownedSource(
      owner,
      results.get(owner)?.snapshot ?? { loading: true as const }
    );
  }
  // Inspection, refresh, and cancel cover every view that the story and export read.
  const allResults = [...results.values()];
  const result = {
    ...primary,
    queries: allResults.flatMap(({ queries }) => queries ?? []),
    refreshing: allResults.some(({ refreshing }) => refreshing),
    refetch() {
      for (const { refetch } of allResults) refetch();
    },
    cancel() {
      for (const { cancel } of allResults) cancel();
    },
  };
  const storyReading =
    story &&
    readDisplayed(owners, ([snapshot, ...summarySnapshots]) =>
      story(snapshot!, ...(summarySnapshots as never)).map(finding => ({
        ...finding,
        evidence: registeredEvidence(finding.evidence, owners),
      }))
    );
  const csvExport =
    datasets &&
    readDisplayed([view, ...datasetOwners], ([snapshot, ...snapshots]) =>
      exportDatasets({
        tables: datasets.map((dataset, index) => ({
          dataset,
          snapshot: snapshots[index]!,
        })),
        scope: view.scope(snapshot!),
        appTitle: app.title,
      })
    );
  const suggestionGroups =
    showSearchSuggestions && frame.showSearch !== false && result.searchControls
      ? (datasets ?? []).flatMap((dataset, index) => {
          const reading = dataset.readSearchSuggestions(
            sourceOf(datasetOwners[index]!)
          );
          if (!reading) return [];
          return [
            reading.loading
              ? []
              : reading.value.map(item => ({
                  ...item,
                  id: [index, item.id].join(KEY_SEPARATOR),
                })),
          ];
        })
      : [];
  return (
    <DateFormattingContext value={{ timeZone: result.timeZone }}>
      <SearchSuggestionsContext
        value={
          suggestionGroups.length
            ? {
                groups: suggestionGroups,
                busy: result.refreshing,
              }
            : null
        }
      >
        <AppViewResultsContext
          value={{
            primaryView: view,
            results: new Map(results).set(view, result),
          }}
        >
          <DetailRoutes details={details}>
            <DataAppFrame
              {...frame}
              request={result}
              dataContext={result.dataContext}
              story={storyReading}
              csvExport={csvExport}
            >
              {children}
            </DataAppFrame>
          </DetailRoutes>
        </AppViewResultsContext>
      </SearchSuggestionsContext>
    </DateFormattingContext>
  );
}

function isDefined<Value>(value: Value | undefined): value is Value {
  return value !== undefined;
}
