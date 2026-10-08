import { defineDataApp } from '@altertable/data-app/config';
import { createRoot } from 'react-dom/client';
import { defineQueryNames } from '@altertable/data-app/contract';
import { DataAppFrame as DataApp } from '@/src/react/ui/DataAppFrame';
import {
  createDataContext,
  Stack,
  Grid,
  GridItem,
  TextContent,
  injectDataAppStyles,
} from '@altertable/data-app/react';
import { DataAppProvider, MetricWidget } from '@altertable/data-app/react/ui';
import { DataSectionBoundary as DataSection } from '@/src/react/ui/DataSectionBoundary';
import { type DataView } from '@/src/core/data-view';

const dataApp = defineDataApp({
  title: 'Layout contract',
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
function Cards({ loading = false }: { loading?: boolean }) {
  return (
    <Grid
      columns={params.has('span') ? 2 : 3}
      minItemWidth="compact"
      data-testid="cards"
    >
      <GridItem span={2}>
        {loading ? (
          <MetricWidget label="First metric" loading />
        ) : (
          <MetricWidget
            label="First metric"
            value={1}
            format={{ kind: 'count' }}
          />
        )}
      </GridItem>
      <GridItem>
        {loading ? (
          <MetricWidget label="Second metric" loading />
        ) : (
          <MetricWidget
            label="Second metric"
            value={2}
            format={{ kind: 'count' }}
          />
        )}
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
