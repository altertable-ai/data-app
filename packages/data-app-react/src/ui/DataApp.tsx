import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { DateFormattingContext } from '../date-formatting.ts';
import { SearchSuggestionsContext } from '../search-suggestions.ts';
import { useDataApp } from '../app-context.ts';
import { ownedSource } from '../source-owner.ts';
import {
  registeredEvidence,
  exportDatasets,
  type ExportDataset,
  type RegisteredBinding,
} from '../bindings.ts';
import type { DisplayedSnapshot } from '@altertable/data-app/internal';
import type { StoryFinding } from './story.ts';
import {
  DataAppFrame,
  type DataAppBaseProps,
  type DataAppControlProps,
} from './DataAppFrame.tsx';
import {
  PrimaryViewContext,
  type DeclaredView,
  useDeclaredResult,
} from '../view-runtime.tsx';

export type DataAppProps<Data, Input = unknown> = Omit<
  DataAppBaseProps,
  'dataContext'
> &
  DataAppControlProps & {
    view: DeclaredView<Data, Input> & {
      scope(snapshot: DisplayedSnapshot<Data, Input>): string;
    };
    /** Show supplied datasets’ record suggestions on the first declared search. Defaults to true. */
    showSearchSuggestions?: boolean;
    story: (snapshot: DisplayedSnapshot<Data, Input>) => readonly (Omit<
      StoryFinding,
      'evidence'
    > & {
      evidence: RegisteredBinding;
    })[];
    datasets: readonly [
      ExportDataset<Data, Input>,
      ...ExportDataset<Data, Input>[],
    ];
  };

/** Executes the primary view and owns its controls, inspection, exports, and stories. */
export function DataApp<Data, Input>(props: DataAppProps<Data, Input>) {
  const {
    view,
    datasets,
    story,
    showSearchSuggestions = true,
    ...frame
  } = props;
  const app = useDataApp();
  const result = useDeclaredResult(view);
  const source = ownedSource(
    view,
    result.snapshot ?? { loading: true as const }
  );
  const suggestionGroups =
    showSearchSuggestions && frame.showSearch !== false && result.searchControls
      ? datasets.flatMap((dataset, index) => {
          const reading = dataset.readSearchSuggestions(source);
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
        <PrimaryViewContext value={{ declaration: view, result }}>
          <DataAppFrame
            {...frame}
            request={result}
            dataContext={result.dataContext}
            story={snapshot =>
              story(ownedSource(view, snapshot)).map(finding => ({
                ...finding,
                evidence: registeredEvidence(finding.evidence, view),
              }))
            }
            csvExport={(snapshot: DisplayedSnapshot<Data, Input>) =>
              exportDatasets(
                datasets,
                ownedSource(view, snapshot),
                view.scope(snapshot),
                app.title
              )
            }
          />
        </PrimaryViewContext>
      </SearchSuggestionsContext>
    </DateFormattingContext>
  );
}
