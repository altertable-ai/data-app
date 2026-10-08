import {
  createDataClient,
  createHttpTransport,
} from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  Grid,
  GridItem,
  Stack,
  TextContent,
  MetricWidget,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';
const config = {
  title: 'Responsive report',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
};
const hooks = createDataHooks(
  createDataClient<{
    activity: DataOperation<Record<string, never>, number[]>;
  }>({ transport: createHttpTransport({ endpoint: '/layout-data' }) })
);
const context = createDataContext({ activity: 'activity' })({
  description: 'Responsive activity report',
  glossary: {
    activity: {
      term: 'Events',
      definition: 'Recorded events',
      queryNames: ['activity'],
    },
  },
});
const view = hooks.defineDataView({
  dataContext: context,
  operation: 'activity',
  describeInput: () => 'all activity',
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No activity' },
});
const metric = view.metric(
  {
    id: 'activity',
    label: 'Events',
    format: { kind: 'count' },
    glossaryId: 'activity',
  },
  rows => ({ current: rows[0]! })
);
const dataset = view.dataset({
  name: 'Activity',
  select: rows => rows.map((count, index) => ({ count, index })),
  rowKey: row => row.index,
  columns: { count: { value: row => row.count } },
  evidence: { id: 'activity', glossaryIds: ['activity'] },
});
const content = view.content(result => (
  <Grid columns={2} minItemWidth="compact" aria-label="Activity cards">
    <GridItem span={2}>
      <MetricWidget metric={metric} source={result} />
    </GridItem>
    <GridItem>
      <MetricWidget metric={metric} source={result} />
    </GridItem>
  </Grid>
));
function App() {
  return (
    <DataApp config={config} view={view} datasets={[dataset]} story={() => []}>
      <Stack aria-label="Report sections">
        <TextContent>
          <h2>Activity overview</h2>
          <p>Activity at every screen size.</p>
        </TextContent>
        <DataSection content={content} />
        <TextContent>
          <p>Following section</p>
        </TextContent>
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config, component: App });
