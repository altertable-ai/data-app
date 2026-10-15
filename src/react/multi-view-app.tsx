import { ViewControlBar } from '@/src/react/view-control-bar';
import { Fragment, useContext, type ReactNode } from 'react';
import { invariant } from '@/src/core/invariant';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import {
  defineAppVariables,
  type VariableCollection,
} from '@/src/core/variables';
import {
  RegisteredBinding,
  ExportDataset,
  datasetCsv,
} from '@/src/react/bindings';
import { ownedSource } from '@/src/react/source-owner';
import { useDataApp } from '@/src/react/app-context';
import {
  DeclaredView,
  ViewResultsContext,
  HiddenViewVariablesContext,
  type ViewResult,
  getViewDefinition,
} from '@/src/react/view-runtime';
import {
  DataAppFrame,
  type DataAppBaseProps,
  type DataAppControlProps,
} from '@/src/react/ui/DataAppFrame';
import type { DataContext } from '@/src/react/ui/data-context';
import type { StoryFinding } from '@/src/react/ui/story';
import { registeredEvidence } from '@/src/react/bindings';
import type { CsvTable } from '@/src/react/ui/csv-export';
import { SearchSuggestionsContext } from '@/src/react/search-suggestions';

export type DataAppViews = Readonly<
  Record<
    string,
    DeclaredView<any, any> & {
      scope(snapshot: DisplayedSnapshot<any, any>): string;
    }
  >
>;
/** Each snapshot keeps the input that produced its displayed data. Unavailable views are undefined. */
export type AppSnapshots<Views extends DataAppViews> = {
  readonly [Key in keyof Views]: Parameters<Views[Key]['scope']>[0] | undefined;
};
export type AppFinding = Omit<StoryFinding, 'evidence'> & {
  evidence: RegisteredBinding;
};
export type MultiViewDataAppProps<Views extends DataAppViews> = Omit<
  DataAppBaseProps,
  'dataContext'
> &
  DataAppControlProps & {
    views: Views & (keyof Views extends never ? never : object);
    view?: never;
    datasets: readonly [ExportDataset<any, any>, ...ExportDataset<any, any>[]];
    story: (snapshots: AppSnapshots<Views>) => readonly AppFinding[];
    showSearchSuggestions?: boolean;
  };

type Entry = {
  name: string;
  view: DeclaredView<any, any>;
  hidden: ReadonlySet<object>;
};

function registryEntries(views: DataAppViews): Entry[] {
  const seen = new Set<object>();
  const variables: VariableCollection = {};
  const entries = Object.entries(views).map(([name, view]) => {
    invariant(
      name.trim() && !seen.has(view),
      'Registered views need unique declarations and nonempty names.'
    );
    seen.add(view);
    const definition = getViewDefinition(view) as {
      variables: VariableCollection;
    };
    const hidden = new Set<object>();
    for (const [key, variable] of Object.entries(definition.variables)) {
      invariant(
        !variables[key] || variables[key] === variable,
        `Variable ${key} conflicts across views. Reuse the same definition.`
      );
      if (variables[key]) hidden.add(variable);
      variables[key] = variable;
    }
    return { name, view, hidden };
  });
  invariant(entries.length, 'DataApp needs at least one view.');
  defineAppVariables(variables);
  return entries;
}

/** One hook owner per declared view; component boundaries keep hook order independent of registry size. */
function ObserveViews({
  entries,
  index = 0,
  results = new Map(),
  children,
}: {
  entries: Entry[];
  index?: number;
  results?: ReadonlyMap<object, ViewResult<any, any>>;
  children: ReactNode;
}) {
  const entry = entries[index];
  if (!entry)
    return <ViewResultsContext value={results}>{children}</ViewResultsContext>;
  return (
    <HiddenViewVariablesContext value={entry.hidden}>
      <ObserveView
        key={entry.name}
        entry={entry}
        entries={entries}
        index={index}
        results={results}
      >
        {children}
      </ObserveView>
    </HiddenViewVariablesContext>
  );
}
function ObserveView({
  entry,
  entries,
  index,
  results,
  children,
}: {
  entry: Entry;
  entries: Entry[];
  index: number;
  results: ReadonlyMap<object, ViewResult<any, any>>;
  children: ReactNode;
}) {
  const result = DeclaredView.useResult(entry.view);
  return (
    <ObserveViews
      entries={entries}
      index={index + 1}
      results={new Map([...results, [entry.view, result]])}
    >
      {children}
    </ObserveViews>
  );
}

export function MultiViewDataApp<Views extends DataAppViews>(
  props: MultiViewDataAppProps<Views>
) {
  const entries = registryEntries(props.views);
  return (
    <ObserveViews entries={entries}>
      <RegisteredApp {...props} entries={entries} />
    </ObserveViews>
  );
}

function mergeContexts(contexts: DataContext[]): DataContext {
  function merge<Value>(
    records: (Readonly<Record<string, Value>> | undefined)[]
  ) {
    const combined: Record<string, Value> = {};
    for (const record of records)
      for (const [key, value] of Object.entries(record ?? {})) {
        invariant(
          !Object.hasOwn(combined, key) || combined[key] === value,
          `Conflicting data context entry: ${key}. Share a definition or use a unique identifier.`
        );
        combined[key] = value;
      }
    return combined;
  }
  return {
    description: (
      <>
        {[...new Set(contexts.map(context => context.description))].map(
          (description, index) => (
            <div key={index}>{description}</div>
          )
        )}
      </>
    ),
    glossary: merge(contexts.map(context => context.glossary)),
    identifiers: merge(contexts.map(context => context.identifiers)),
    queryNames: merge(contexts.map(context => context.queryNames)),
  };
}

function RegisteredApp<Views extends DataAppViews>({
  views: _views,
  entries,
  datasets,
  story,
  showSearchSuggestions = true,
  ...frame
}: MultiViewDataAppProps<Views> & { entries: Entry[] }) {
  const results = useContext(ViewResultsContext)!;
  const app = useDataApp();
  const snapshots: Record<string, DisplayedSnapshot<any, any> | undefined> = {};
  const byOwner = new Map<object, DisplayedSnapshot<any, any> | undefined>();
  const requests = entries.map(entry => results.get(entry.view)!);
  for (const entry of entries) {
    const snapshot = results.get(entry.view)!.snapshot;
    const source = snapshot ? ownedSource(entry.view, snapshot) : undefined;
    snapshots[entry.name] = source;
    byOwner.set(entry.view, source);
  }
  const findings = story(snapshots as AppSnapshots<Views>).map(finding => {
    const owner = RegisteredBinding.owner(finding.evidence);
    invariant(
      byOwner.get(owner),
      'Story evidence requires an available registered view.'
    );
    const snapshot = byOwner.get(owner)!;
    const declaration = entries.find(entry => entry.view === owner)!.view;
    const definition = getViewDefinition(declaration) as {
      describeInput: (input: any) => string;
    };
    const scope = definition.describeInput(snapshot.input);
    return {
      ...finding,
      context: [
        finding.context,
        scope,
        snapshot.state === 'stale-error'
          ? 'Showing the last successful result.'
          : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
      evidence: registeredEvidence(finding.evidence, owner),
    };
  });
  const tables: CsvTable[] = [];
  const unavailable: string[] = [];
  for (const dataset of datasets) {
    const owner = RegisteredBinding.owner(dataset);
    invariant(
      byOwner.has(owner),
      'Export datasets must belong to a registered view.'
    );
    const snapshot = byOwner.get(owner);
    if (!snapshot) {
      unavailable.push(dataset.name);
      continue;
    }
    const declaration = entries.find(entry => entry.view === owner)!.view;
    const definition = getViewDefinition(declaration) as {
      describeInput: (input: any) => string;
    };
    tables.push({
      ...datasetCsv(dataset, snapshot),
      scope: definition.describeInput(snapshot.input),
      stale: snapshot.state === 'stale-error',
    });
  }
  invariant(
    new Set(datasets.map(dataset => dataset.name.toLowerCase())).size ===
      datasets.length,
    'Export dataset names must be unique.'
  );
  const refreshing = requests.some(request => request.refreshing);
  const hasDisplayedResult = [...byOwner.values()].some(Boolean);
  const queries = requests.flatMap(request => request.queries ?? []);
  const controlBars = requests.flatMap(request =>
    request.controlBar ? [request.controlBar] : []
  );
  const groups =
    showSearchSuggestions &&
    frame.showSearch !== false &&
    requests.some(request => request.searchControls)
      ? datasets.flatMap((dataset, index) => {
          const snapshot = byOwner.get(RegisteredBinding.owner(dataset));
          const reading = snapshot && dataset.readSearchSuggestions(snapshot);
          return reading && !reading.loading
            ? [
                reading.value.map(item => ({
                  ...item,
                  id: `${index}:${item.id}`,
                })),
              ]
            : [];
        })
      : [];
  return (
    <SearchSuggestionsContext
      value={groups.length ? { groups, busy: refreshing } : null}
    >
      <DataAppFrame
        {...frame}
        dataContext={mergeContexts(
          requests.map(request => request.dataContext)
        )}
        request={{
          // There is no aggregate data result: availability and feedback belong to individual views.
          view:
            !hasDisplayedResult && refreshing
              ? { kind: 'loading' }
              : {
                  kind: 'ready',
                  data: snapshots,
                  input: Object.fromEntries(
                    Object.entries(snapshots).map(([key, snapshot]) => [
                      key,
                      snapshot?.input,
                    ])
                  ),
                },
          refreshing,
          queries,
          refetch: () => {
            for (const request of requests) request.refetch();
          },
          cancel: () => {
            for (const request of requests) request.cancel();
          },
          searchControls: requests.some(request => request.searchControls)
            ? requests.map((request, index) => (
                <Fragment key={entries[index]!.name}>
                  {request.searchControls}
                </Fragment>
              ))
            : undefined,
          filterControls: controlBars.length ? (
            <ViewControlBar
              primaryFilters={controlBars.flatMap(bar => bar.primaryFilters)}
              activeSecondaryFilters={controlBars.flatMap(
                bar => bar.activeSecondaryFilters
              )}
              allFilters={controlBars.flatMap(bar => bar.allFilters)}
              activeFilterCount={controlBars.reduce(
                (total, bar) => total + bar.activeFilterCount,
                0
              )}
              displayOptions={controlBars.flatMap(bar => bar.displayOptions)}
              changedDisplayOptionCount={controlBars.reduce(
                (total, bar) => total + bar.changedDisplayOptionCount,
                0
              )}
              onClear={
                controlBars.some(bar => bar.onClear)
                  ? () => {
                      for (const bar of controlBars) bar.onClear?.();
                    }
                  : undefined
              }
            />
          ) : undefined,
        }}
        artifacts={{
          findings,
          csvExport: {
            filename:
              app.title
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, '-')
                .slice(0, 180) || 'data',
            tables,
            unavailable,
          },
        }}
        story={() => findings}
        csvExport={() => ({ filename: 'data', tables, unavailable })}
      />
    </SearchSuggestionsContext>
  );
}
