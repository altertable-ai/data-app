import {
  SearchSuggestionsContext,
  balanceSearchSuggestions,
} from '@/src/react/search-suggestions';
import { useDataApp } from '@/src/react/app-context';
import { ownedSource } from '@/src/react/source-owner';
import {
  registeredEvidence,
  exportDatasets,
  type ExportDataset,
  type RegisteredBinding,
} from '@/src/react/bindings';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import type { StoryFinding } from '@/src/react/ui/story';
import {
  DataAppFrame,
  type DataAppBaseProps,
  type DataAppControlProps,
} from '@/src/react/ui/DataAppFrame';
import {
  PrimaryViewContext,
  type DeclaredView,
  useDeclaredResult,
} from '@/src/react/view-runtime';

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
  const suggestionGroups = showSearchSuggestions
    ? datasets.flatMap((dataset, index) => {
        const reading = dataset.readSearchSuggestions(source);
        if (!reading) return [];
        return [
          reading.loading
            ? []
            : reading.value.map(item => ({
                ...item,
                id: `${index}:${item.id}`,
              })),
        ];
      })
    : [];
  const suggestions = balanceSearchSuggestions(suggestionGroups);
  return (
    <SearchSuggestionsContext
      value={
        suggestionGroups.length
          ? {
              items: suggestions,
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
  );
}
