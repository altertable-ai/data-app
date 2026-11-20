import { defineDataApp } from '@altertable/data-app';
import {
  AnnotationTarget,
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import { DataWidget, useAppFilters } from '@altertable/data-app-react/ui';
import {
  createMessageClient,
  createDataClient,
  getDataAppTransport,
  getDataAppNavigation,
  DataAppError,
} from '@altertable/data-app/client';
import { connectionCheck, searchFilter } from '@altertable/data-app/contract';
import { useState } from 'react';

import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
import { literalLakehouse } from '@/tests/public-api/fixtures/literal-client';
const dataApp = defineDataApp({
  title: 'Embedded report',
  description: 'Explore embedded queries and host interactions.',
  scope: { organization: 'test', environment: 'prod' },
  appearance: { theme: 'system' },
  queries: {
    connection: {
      projections: { connection_check: { type: 'number' } },
      statement: 'SELECT 1 AS connection_check',
      params: {},
    },
  },
});
const bridge = getDataAppTransport()!;
const data = createDataClient({
  operations: { connection: connectionCheck(dataApp.queries) },
});
const messages = createMessageClient(bridgeRoutes, bridge.request);
const variables = {
  period: searchFilter({ key: 'period', history: 'push' }),
};
// The report's values are literal, so they load without the host's query bridge.
const { defineView } = createDataHooks(
  createDataClient({
    operations: {
      report: dataApp.defineOperation({
        policy: { maxQueryRows: 10 },
        async run() {
          return {
            customers: 42,
            counts: [
              { name: 'München, "East"', count: 0 },
              { name: 'Two\nlines', count: null },
            ],
            summary: [{ total: 0 }],
          };
        },
      }),
    },
    lakehouse: literalLakehouse,
  })
);
const reportView = defineView({
  dataContext: createDataContext(dataApp.queryNames)({
    description: 'Test report',
    glossary: { count: { term: 'Count', definition: 'Recorded count.' } },
  }),
  operation: 'report',
});
const counts = reportView.dataset({
  name: 'Counts',
  select: report => report.counts,
  rowKey: row => row.name,
  columns: { name: {}, count: {} },
  evidence: { id: 'counts', glossaryIds: ['count'] },
});
const summary = reportView.dataset({
  name: 'Summary',
  select: report => report.summary,
  rowKey: row => row.total,
  columns: { total: {} },
  evidence: { id: 'summary', glossaryIds: ['count'] },
});
const customers = reportView.metric(
  {
    id: 'customer-count',
    glossaryId: 'count',
    label: 'Customers',
    format: { kind: 'count' },
  },
  report => ({ current: report.customers })
);
const customersContent = reportView.content(result => (
  <MetricWidget metric={customers} source={result} annotationId="customers" />
));

function App() {
  const [crashed, setCrashed] = useState(false);
  const state = useAppFilters(variables);
  const search = state.values.period ? `period=${state.values.period}` : '';
  const [result, setResult] = useState('');
  if (crashed) throw new Error('Uncaught render failure');

  return (
    <DataApp
      view={reportView}
      datasets={[counts, summary]}
      description="Report description"
      toolbarActions={<button>Custom toolbar action</button>}
      footerActions={<button>Custom footer action</button>}
    >
      <DataWidget
        title="Revenue by month"
        evidence={{ id: 'monthly-revenue', queryNames: ['revenue'] }}
      >
        <button onClick={() => setResult('Chart clicked')}>
          Explore revenue
        </button>
      </DataWidget>
      <DataSection content={customersContent} />
      <AnnotationTarget annotationId="intro" label="Introduction">
        <p>Revenue is growing.</p>
      </AnnotationTarget>
      <button onClick={() => setCrashed(true)}>Crash render</button>
      <button
        onClick={() =>
          setTimeout(() => {
            throw new Error('Delayed app failure');
          }, 0)
        }
      >
        Crash callback
      </button>
      <button
        onClick={() => {
          void Promise.reject(new Error('App promise failure'));
        }}
      >
        Reject promise
      </button>
      <p id="location">
        {search}
        {getDataAppNavigation()!.snapshot().hash}
      </p>
      <p id="result">{result}</p>
      <button
        onClick={() => {
          void messages
            .request('test:echo', { period: 'last-7' })
            .then(value => setResult(JSON.stringify(value)));
        }}
      >
        Query
      </button>
      <button
        onClick={() => {
          void data
            .query('connection', {})
            .then(value => setResult(JSON.stringify(value)));
        }}
      >
        Data query
      </button>
      <button
        onClick={() => {
          void bridge.lakehouse
            .queryAllById('forbidden', {
              limit: 1,
              signal: new AbortController().signal,
            })
            .catch(error =>
              setResult(
                JSON.stringify({
                  publicError: error instanceof DataAppError,
                  code: error.code,
                })
              )
            );
        }}
      >
        Denied query
      </button>
      <button onClick={() => state.set('period', '')}>Clear filter</button>
      <button onClick={() => state.set('period', 'last-7')}>Last 7 days</button>
    </DataApp>
  );
}

document.body.dataset.executions = String(
  Number(document.body.dataset.executions ?? 0) + 1
);
injectDataAppStyles();

mountDataApp({
  app: dataApp,
  component: App,
});
