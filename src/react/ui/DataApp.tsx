import type { ReactNode } from 'react';
import type { DataAppConfig } from '@/src/core/config';
import type { DisplayedSnapshot } from '@/src/core/data-view';
import { exportDatasets, type ExportDataset } from '@/src/react/bindings';
import type { BoundStory } from '@/src/react/ui/story';
import { DataAppFrame } from '@/src/react/ui/DataAppFrame';
import {
  PrimaryViewContext,
  type DeclaredView,
  useDeclaredResult,
} from '@/src/react/view-runtime';

export type DataAppProps<Data, Input = unknown> = {
  view: DeclaredView<Data, Input> & {
    scope(snapshot: DisplayedSnapshot<Data, Input>): string;
  };
  config: DataAppConfig;
  story: BoundStory<Data, Input>;
  datasets: readonly [
    ExportDataset<Data, Input>,
    ...ExportDataset<Data, Input>[],
  ];
  children: ReactNode;
  description?: ReactNode;
  toolbarActions?: ReactNode;
  footerActions?: ReactNode;
};

/** Executes the primary view and owns its controls, inspection, exports, and stories. */
export function DataApp<Data, Input>(props: DataAppProps<Data, Input>) {
  const { view, datasets, ...frame } = props;
  const result = useDeclaredResult(view);
  return (
    <PrimaryViewContext value={{ declaration: view, result }}>
      <DataAppFrame
        {...frame}
        request={result}
        dataContext={result.dataContext}
        csvExport={(snapshot: DisplayedSnapshot<Data, Input>) =>
          exportDatasets(
            datasets,
            snapshot,
            view.scope(snapshot),
            frame.config.title
          )
        }
      />
    </PrimaryViewContext>
  );
}
