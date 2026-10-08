import { injectDataAppStyles } from '@altertable/data-app/react';
import { defineDataApp } from '@altertable/data-app/config';
import { connectionCheck } from '@altertable/data-app/contract';
import { useState } from 'react';
import {
  createMessageClient,
  createDataClient,
  getDataAppTransport,
  getDataAppNavigation,
  DataAppError,
} from '@altertable/data-app/client';
import {
  DataApp,
  DataWidget,
  MetricWidget,
  useAppVariables,
} from '@altertable/data-app/react/ui';
import { AnnotationTarget } from '@altertable/data-app/react';
import { mountDataApp, searchVariable } from '@altertable/data-app/react';
import { bridgeRoutes } from '@/dev/fixtures/bridge-routes';
const dataApp = defineDataApp({
  title: 'Embedded report',
  scope: { organization: 'test', environment: 'prod' },
  appearance: { theme: 'system' },
  queries: {
    connection: { statement: 'SELECT 1 AS connection_check', params: {} },
  },
});
const bridge = getDataAppTransport()!;
const data = createDataClient({
  operations: { connection: connectionCheck(dataApp.queries) },
});
const messages = createMessageClient(bridgeRoutes, bridge.request);
const variables = {
  period: searchVariable({ key: 'period', history: 'push' }),
};

function App() {
  const [crashed, setCrashed] = useState(false);
  const state = useAppVariables(variables);
  const search = state.values.period ? `period=${state.values.period}` : '';
  const [result, setResult] = useState('');
  if (crashed) throw new Error('Uncaught render failure');

  return (
    <DataApp
      csvExport={{
        filename: 'gallery',
        tables: [
          {
            name: 'Counts',
            columns: ['Name', 'Count'],
            rows: [
              ['München, "East"', 0],
              ['Two\nlines', null],
            ],
          },
          { name: 'Summary', columns: ['Total'], rows: [[0]] },
        ],
      }}
      dataContext={{ description: 'Test report', glossary: {} }}
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
      <MetricWidget
        label="Customers"
        annotationId="customers"
        value={42}
        format={{ kind: 'count' }}
      />
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
          void createDataClient<{
            forbidden: ReturnType<typeof connectionCheck>;
          }>()
            .query('forbidden', {})
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
