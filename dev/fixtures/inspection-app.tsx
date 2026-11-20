import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  mountDataApp,
  injectDataAppStyles,
  Button,
} from '@altertable/data-app-react';
import { DataWidget, AboutData } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import { useState } from 'react';

const params = new URLSearchParams(location.search);
const dataApp = defineDataApp({
  title: 'Inspection ownership',
  description: 'Inspect query evidence for displayed results.',
  scope: { organization: 'Test', environment: 'local' },
  queries: {
    counts: {
      statement: 'SELECT $count AS count',
      params: {
        count: { type: 'number' },
        label: { type: 'string' },
        enabled: { type: 'boolean' },
        nullable: { type: 'string', nullable: true },
      },
      projections: { count: { type: 'number' } },
    },
  },
});
const { defineView } = createDataHooks(
  createDataClient({
    operations: {
      counts: dataApp.defineOperation({
        policy: { maxQueryRows: 1 },
        async run({ query }) {
          const { rows } = await query('counts', {
            count: 1,
            label: params.has('long-parameter')
              ? 'Long parameter value '.repeat(10)
              : "a'\n$label",
            enabled: false,
            nullable: null,
          });
          return rows[0]!.count;
        },
      }),
    },
    lakehouse: {
      // The fixture echoes the bound count instead of running SQL.
      async queryAll(_statement, options) {
        return {
          columns: [{ name: 'count' }],
          rows: [[options.params?.count ?? null]],
        };
      },
    },
  })
);
const dataContext = createDataContext(dataApp.queryNames)({
  description: 'Counts',
  glossary: {
    count: {
      term: 'Count',
      definition: 'The bound count.',
      queryNames: [dataApp.queryNames.counts],
    },
  },
});
const countsView = defineView({ dataContext, operation: 'counts' });
const nestedCount = countsView.metric(
  {
    id: 'nested-count',
    glossaryId: 'count',
    label: 'Nested count',
    format: { kind: 'count' },
  },
  count => ({ current: count })
);
const repeatedCount = countsView.metric(
  {
    id: 'repeated-count',
    glossaryId: 'count',
    label: 'Repeated count',
    format: { kind: 'count' },
  },
  count => ({ current: count })
);
const longHeading = params.has('long-heading');
const countsContent = countsView.content(result => (
  <>
    <DataWidget
      title={longHeading ? 'Show HN vs Ask HN vs Launch HN' : 'Summary'}
      description={
        longHeading ? 'Posts per year by format (log scale).' : undefined
      }
      style={longHeading ? { width: 350, maxWidth: '100%' } : undefined}
      evidence={{ id: 'summary', queryNames: ['counts'] }}
    >
      <MetricWidget metric={nestedCount} source={result} />
    </DataWidget>
    <MetricWidget metric={repeatedCount} source={result} />
  </>
));
function ControlledInspection() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<boolean[]>([]);
  return (
    <>
      <output aria-label="Inspection requests">
        {JSON.stringify(requests)}
      </output>
      <Button onClick={() => setOpen(true)}>Accept open</Button>
      <AboutData
        id="controlled"
        title="Controlled"
        open={open}
        onOpenChange={requested =>
          setRequests(previous => [...previous, requested])
        }
        shortcut={false}
        headerActions={
          <Button onClick={() => setOpen(false)}>Accept close</Button>
        }
      >
        Controlled inspection
      </AboutData>
    </>
  );
}
function App() {
  return (
    <DataApp view={countsView}>
      {params.has('controlled') && <ControlledInspection />}
      <DataSection content={countsContent} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });
