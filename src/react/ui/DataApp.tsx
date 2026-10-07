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
} from '@/src/react/ui/DataAppFrame';
import {
  PrimaryViewContext,
  type DeclaredView,
  useDeclaredResult,
} from '@/src/react/view-runtime';

export type DataAppProps<Data, Input = unknown> = Omit<
  DataAppBaseProps,
  'dataContext'
> & {
  view: DeclaredView<Data, Input> & {
    scope(snapshot: DisplayedSnapshot<Data, Input>): string;
  };
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
  const { view, datasets, story, ...frame } = props;
  const result = useDeclaredResult(view);
  return (
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
            frame.config.title
          )
        }
      />
    </PrimaryViewContext>
  );
}
