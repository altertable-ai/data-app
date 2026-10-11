import { SearchSuggestionsContext } from '@/src/react/search-suggestions';
import type { SearchSuggestions } from '@/src/react/bindings';
import { useDataApp } from '@/src/react/app-context';
import { ownedSource } from '@/src/react/source-owner';
import {
  registeredEvidence,
  type RegisteredBinding,
} from '@/src/react/bindings';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import { exportDatasets, type ExportDataset } from '@/src/react/bindings';
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
    /** Suggestions for the first generated search, from explicitly chosen datasets of this view.
     * Supply a list to combine datasets in priority order, with five suggestions overall. */
    searchSuggestions?:
      | SearchSuggestions<Data, Input>
      | readonly SearchSuggestions<Data, Input>[];
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
  const { view, datasets, story, searchSuggestions, ...frame } = props;
  const app = useDataApp();
  const result = useDeclaredResult(view);
  const bindings = searchSuggestions
    ? 'read' in searchSuggestions
      ? [searchSuggestions]
      : searchSuggestions
    : [];
  const source = ownedSource(
    view,
    result.snapshot ?? { loading: true as const }
  );
  const suggestions = bindings
    .flatMap((binding, index) => {
      const reading = binding.read(source);
      return reading.loading
        ? []
        : reading.value.map(item => ({ ...item, id: `${index}:${item.id}` }));
    })
    .slice(0, 5);
  return (
    <SearchSuggestionsContext
      value={
        bindings.length
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
