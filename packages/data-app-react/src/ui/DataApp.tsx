import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import type { DisplayedSnapshot } from '@altertable/data-app/internal';

import { useDataApp } from '../app-context.ts';
import {
  registeredEvidence,
  exportDatasets,
  type ExportDataset,
  type RegisteredBinding,
} from '../bindings.ts';
import { DateFormattingContext } from '../date-formatting.ts';
import { DetailRoutes, type DetailContent } from '../details.tsx';
import { SearchSuggestionsContext } from '../search-suggestions.ts';
import { ownedSource } from '../source-owner.ts';
import {
  PrimaryViewContext,
  type DeclaredView,
  useDeclaredResult,
} from '../view-runtime.tsx';
import {
  DataAppFrame,
  type DataAppBaseProps,
  type DataAppControlProps,
} from './DataAppFrame.tsx';
import type { StoryFinding } from './story.ts';

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
    /** Omit to leave presentation out of the toolbar. */
    story?: (snapshot: DisplayedSnapshot<Data, Input>) => readonly (Omit<
      StoryFinding,
      'evidence'
    > & {
      evidence: RegisteredBinding;
    })[];
    /** Omit to leave CSV export out of the toolbar. */
    datasets?: readonly [
      ExportDataset<Data, Input>,
      ...ExportDataset<Data, Input>[],
    ];
    /** Detail destinations available to dataset actions and metric record inspection. */
    details?: readonly DetailContent<any, any>[];
  };

/** Executes the primary view and owns its controls, inspection, exports, and stories. */
export function DataApp<Data, Input>(props: DataAppProps<Data, Input>) {
  const {
    view,
    datasets,
    story,
    showSearchSuggestions = true,
    details = [],
    children,
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
      ? (datasets ?? []).flatMap((dataset, index) => {
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
          <DetailRoutes details={details}>
            <DataAppFrame
              {...frame}
              request={result}
              dataContext={result.dataContext}
              story={
                story
                  ? snapshot =>
                      story(ownedSource(view, snapshot)).map(finding => ({
                        ...finding,
                        evidence: registeredEvidence(finding.evidence, view),
                      }))
                  : undefined
              }
              csvExport={
                datasets
                  ? (snapshot: DisplayedSnapshot<Data, Input>) =>
                      exportDatasets(
                        datasets,
                        ownedSource(view, snapshot),
                        view.scope(snapshot),
                        app.title
                      )
                  : undefined
              }
            >
              {children}
            </DataAppFrame>
          </DetailRoutes>
        </PrimaryViewContext>
      </SearchSuggestionsContext>
    </DateFormattingContext>
  );
}
