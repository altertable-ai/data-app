import {
  type DataAppAction,
  type DataAppActions,
  type IframeTransport,
} from '@altertable/data-app/client';
import { type DisclosedQuery } from '@altertable/data-app/contract';
import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from 'react';

import { AboutData } from './AboutData.tsx';
import { type CsvExport } from './csv-export.ts';
import { type DataContext } from './data-context.ts';
import { useCsvExport } from './ExportControl.tsx';
import {
  openStoryPresentation,
  PresentStory,
  type PresentStoryProps,
} from './PresentStory.tsx';
import { searchParams, subscribeSearch, writeSearch } from './search.ts';

function isPresenting() {
  return searchParams().get('present') === '1';
}

export type HostActionsProps = {
  transport: IframeTransport;
  refresh?: {
    refreshing: boolean;
    onRefresh: () => void;
    onCancel?: () => void;
  };
  /** Null offers a disabled export while its data is unavailable. */
  csvExport?: CsvExport | null;
  /** Null offers a disabled story while its findings are unavailable. */
  story?: PresentStoryProps | null;
  dataContext: DataContext;
  queries?: DisclosedQuery[];
};

/** Offers page actions to the embedding host instead of a toolbar, and renders the
 * surfaces those actions open: the story presentation, inspection sheet, and export errors. */
export function HostActions({
  transport,
  refresh,
  csvExport,
  story,
  dataContext,
  queries,
}: HostActionsProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const exporter = useCsvExport(csvExport ?? undefined);
  // The story's open state lives in the URL, shared with Back/Forward and saved links.
  const presenting =
    useSyncExternalStore(subscribeSearch, isPresenting, () => false) && !!story;
  const actions: DataAppActions = {
    ...(refresh && {
      refresh: {
        refreshing: refresh.refreshing,
        cancellable: refresh.onCancel !== undefined,
      },
    }),
    ...(csvExport !== undefined && {
      exportCsv: {
        enabled: !!csvExport?.tables.length && exporter.status !== 'pending',
        tables: csvExport?.tables.map(table => table.name) ?? [],
      },
    }),
    ...(story !== undefined && {
      presentStory: { enabled: !!story, presenting },
    }),
    aboutData: { enabled: true },
  };

  // Report the latest offer after every render; the transport skips unchanged sets.
  // Bootstraps that predate page actions lack these methods, so the app offers none.
  useEffect(() => {
    transport.setActions?.(actions);
  });
  useEffect(() => () => transport.setActions?.({}), [transport]);

  const run = useEffectEvent((action: DataAppAction) => {
    switch (action.type) {
      case 'refresh':
        if (refresh && !refresh.refreshing) refresh.onRefresh();
        break;
      case 'cancelRefresh':
        if (refresh?.refreshing) refresh.onCancel?.();
        break;
      case 'exportCsv': {
        const table =
          action.table === undefined
            ? undefined
            : csvExport?.tables.find(item => item.name === action.table);
        if (action.table === undefined || table) void exporter.download(table);
        break;
      }
      case 'presentStory':
        if (story && !presenting) openStoryPresentation(story);
        break;
      case 'closeStory':
        if (presenting) writeSearch({ present: null, step: null });
        break;
      case 'aboutData':
        setAboutOpen(true);
        break;
    }
  });
  useEffect(() => transport.onAction?.(action => run(action)), [transport]);

  return (
    <>
      {exporter.errorToast}
      {story && <PresentStory {...story} trigger={false} />}
      <AboutData
        id="data"
        trigger={false}
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        dataContext={dataContext}
        queries={queries}
      />
    </>
  );
}
