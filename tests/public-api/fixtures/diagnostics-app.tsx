import { defineDataApp } from '@altertable/data-app';
import {
  injectDataAppStyles,
  Grid,
  Button,
  TextContent,
} from '@altertable/data-app-react';
import {
  DataWidget,
  DataAppProvider,
  TextWidget,
  VisualizationWidget,
} from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  getDataAppTransport,
  getDataAppNavigation,
} from '@altertable/data-app/client';
import {
  DataSourceError,
  type DataOperations,
} from '@altertable/data-app/contract';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

injectDataAppStyles();
document.documentElement.setAttribute('data-atbl-appearance', '');
getDataAppTransport()?.supportContentSizing();
function BadChart({ broken }: { broken: boolean }) {
  if (broken) throw new Error('Series requires a numeric value');
  return <div style={{ height: 220 }}>Chart ready</div>;
}
function WidgetRegressions() {
  const [broken, setBroken] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <main style={{ padding: 24 }}>
      <Button onClick={() => setBroken(true)}>Break renderers</Button>
      <Grid columns={2} aria-label="Widget grid">
        <DataWidget title="Spanning widget" style={{ gridColumn: '1 / -1' }}>
          <span>Inline one</span>
          <span>Inline two</span>
        </DataWidget>
        <TextWidget
          title="Narrative"
          description="Static narrative description"
          footer="Static narrative footer"
          reading={{ loading: false, value: 1 }}
          evidence={{ id: 'narrative', queryNames: ['narrative'] }}
        >
          {() => {
            if (broken) throw new Error('Narrative renderer failed');
            return 'Narrative ready';
          }}
        </TextWidget>
        <VisualizationWidget
          title="Alternate views"
          reading={{ loading: false, value: [1] }}
          isEmpty={rows => !rows.length}
          emptyFallback={{ title: 'No rows' }}
          evidence={{ id: 'views', queryNames: ['views'] }}
          viewLabel="Chart views"
          views={
            broken
              ? []
              : [{ id: 'one', label: 'One', render: () => 'View ready' }]
          }
        />
        <DataWidget title={broken ? <BrokenHeading /> : 'Custom heading'}>
          Ready body
        </DataWidget>
      </Grid>
      <Grid columns={3} aria-label="Wrapping grid">
        {['Wrapped one', 'Wrapped two', 'Wrapped three'].map(title => (
          <DataWidget key={title} title={title}>
            Ready
          </DataWidget>
        ))}
      </Grid>
      <Button onClick={() => setCount(count + 1)}>
        Healthy action {count}
      </Button>
    </main>
  );
}
function BrokenHeading(): never {
  throw new Error('Heading renderer failed');
}
function OverflowRegressions() {
  const [broken, setBroken] = useState(false);
  const [hide, setHide] = useState(false);
  return (
    <main style={{ padding: 24 }}>
      <Button onClick={() => setBroken(true)}>Break all widgets</Button>
      <Button onClick={() => setHide(true)}>Hide first 30 widgets</Button>
      {Array.from({ length: 31 }, (_, index) =>
        !hide || index === 30 ? (
          <VisualizationWidget
            key={index}
            title={`Overflow ${index + 1}`}
            visual={<BadChart broken={broken} />}
          />
        ) : null
      )}
    </main>
  );
}
function App() {
  const params = new URLSearchParams(getDataAppNavigation()!.snapshot().search);
  const fixedWidth = params.has('fixed-width');
  const [broken, setBroken] = useState(false);
  const [showFailed, setShowFailed] = useState(true);
  const [count, setCount] = useState(0);
  if (params.get('scenario') === 'boundaries') return <WidgetRegressions />;
  if (params.get('scenario') === 'overflow') return <OverflowRegressions />;
  return (
    <main style={{ padding: 24 }}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 650,
            letterSpacing: '-.035em',
          }}
        >
          Revenue overview
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            color: 'var(--atbl-muted)',
            fontSize: 13,
          }}
        >
          October 2026 · All regions
        </p>
      </header>
      <Button
        onClick={() => {
          function operation(name: string) {
            return {
              input: (_value: unknown) => ({}),
              checks: [{}] as const,
              policy: { maxQueryRows: 10, maxDurationMs: 1000 },
              run: async ({
                lakehouse,
                signal,
              }: Parameters<DataOperations[string]['run']>[0]) =>
                lakehouse.queryAll('SELECT broken_column', {
                  name,
                  limit: 10,
                  signal,
                }),
            };
          }
          const operations = {
            revenue: operation('revenue'),
            retention: operation('retention'),
          };
          const client = createDataClient({
            operations,
            lakehouse: {
              queryAll: async () => {
                throw new DataSourceError('query_rejected', 400);
              },
            },
          });
          void client.query('revenue', {}).catch(() => {});
          void client.query('retention', {}).catch(() => {});
          setBroken(true);
        }}
      >
        Break widgets
      </Button>
      <Button onClick={() => setShowFailed(false)}>Hide failed widgets</Button>
      <Grid columns={2}>
        {showFailed && (
          <>
            {' '}
            <VisualizationWidget
              title="Revenue"
              description="Monthly revenue by channel"
              footer={
                <span style={{ fontSize: 12, color: 'var(--atbl-muted)' }}>
                  USD · Updated today
                </span>
              }
              style={fixedWidth ? { width: 260, maxWidth: '100%' } : undefined}
              visual={<BadChart broken={broken} />}
            />
            <VisualizationWidget
              title="Retention"
              description="Returning customer cohorts"
              visual={<BadChart broken={broken} />}
            />
          </>
        )}
        <VisualizationWidget
          title="Healthy content"
          visual={
            <Button onClick={() => setCount(count + 1)}>
              Healthy clicks {count}
            </Button>
          }
        />
      </Grid>
      <TextContent>
        <p>Neighbor below the widgets</p>
      </TextContent>
    </main>
  );
}
document.documentElement.setAttribute('data-atbl-theme', 'light');
getDataAppTransport()?.subscribe(state => {
  const theme =
    (state as { presentation?: { theme?: string } }).presentation?.theme ??
    'light';
  document.documentElement.setAttribute('data-atbl-theme', theme);
});
const dataApp = defineDataApp({
  title: 'Diagnostic app',
  description: 'Exercise diagnostic recovery.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
createRoot(document.getElementById('root')!).render(
  <DataAppProvider app={dataApp}>
    <App />
  </DataAppProvider>
);
