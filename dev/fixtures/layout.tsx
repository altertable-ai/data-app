import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  Stack,
  Grid,
  GridItem,
  TextContent,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { DataAppProvider, DataWidget } from '@altertable/data-app-react/ui';
import { defineQueryNames } from '@altertable/data-app/contract';
import { formatCount } from '@altertable/data-app/format';
import { type DataView } from '@altertable/data-app/internal';
import { createRoot } from 'react-dom/client';

import { DataAppFrame as DataApp } from '@/packages/data-app-react/src/ui/DataAppFrame.tsx';
import { DataSectionBoundary as DataSection } from '@/packages/data-app-react/src/ui/DataSectionBoundary.tsx';

const dataApp = defineDataApp({
  title: 'Layout contract',
  description: 'Explore responsive layouts and loading states.',
  scope: { organization: 'demo', environment: 'test' },
  appearance: { density: 'comfortable', theme: 'light' },
  queries: {},
});

const params = new URLSearchParams(location.search);
injectDataAppStyles();
const state = params.get('state');
const view: DataView<number, string> =
  state === 'loading'
    ? { kind: 'loading' }
    : state === 'empty'
      ? { kind: 'empty', input: 'current' }
      : state === 'error'
        ? { kind: 'error', error: new Error('Unavailable') }
        : state === 'stale'
          ? {
              kind: 'stale-error',
              data: 1,
              displayedInput: 'previous',
              requestedInput: 'current',
              error: new Error('Unavailable'),
              message: 'Showing previous results.',
            }
          : { kind: 'ready', data: 1, input: 'current' };
function LayoutMetric({
  title,
  value,
  loading,
}: {
  title: string;
  value: number;
  loading: boolean;
}) {
  return (
    <DataWidget
      title={title}
      reading={loading ? { loading: true } : { loading: false, value }}
      isEmpty={() => false}
      emptyFallback={{ title: 'No value' }}
      evidence={{ id: title, queryNames: ['layout'] }}
    >
      {current => formatCount(current)}
    </DataWidget>
  );
}
function Cards({ loading = false }: { loading?: boolean }) {
  return (
    <Grid
      columns={params.has('span') ? 2 : 3}
      minItemWidth="compact"
      data-testid="cards"
    >
      <GridItem span={2}>
        <LayoutMetric title="First metric" value={1} loading={loading} />
      </GridItem>
      <GridItem>
        <LayoutMetric title="Second metric" value={2} loading={loading} />
      </GridItem>
    </Grid>
  );
}
createRoot(document.getElementById('root')!).render(
  <DataAppProvider
    app={{
      ...dataApp,
      appearance: {
        density:
          params.get('density') === 'spacious' ? 'spacious' : 'comfortable',
        theme: params.get('theme') === 'dark' ? 'dark' : 'light',
      },
    }}
  >
    <DataApp
      dataContext={createDataContext(defineQueryNames({}))({
        description: 'Layout fixture',
        glossary: {},
      })}
    >
      <Stack data-testid="sections">
        <TextContent>
          <h2>Layout contract</h2>
          <p>Shared spacing at every width.</p>
        </TextContent>
        <DataSection
          result={{ view, refetch() {} }}
          notice="inline"
          emptyFallback={{ title: 'No results' }}
          loadingFallback={<Cards loading />}
        >
          {() => <Cards />}
        </DataSection>
      </Stack>
      <TextContent>
        <p>Following section</p>
      </TextContent>
    </DataApp>
  </DataAppProvider>
);
