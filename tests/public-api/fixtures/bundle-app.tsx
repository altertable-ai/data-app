import { injectDataAppStyles } from '@altertable/data-app/react';
import type { DataAppConfig } from '@altertable/data-app/config';
import { connectionCheck } from '@altertable/data-app/contract';
import { useState } from 'react';
import {
  createMessageClient,
  createDataClient,
  getDataAppTransport,
  getDataAppNavigation,
  DataAppError,
} from '@altertable/data-app/client';
import { DataApp, useAppVariables } from '@altertable/data-app/react/ui';
import { mountDataApp, textVariable } from '@altertable/data-app/react';
import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';
const config: DataAppConfig = {
  title: 'Embedded report',
  scope: { organization: 'test', environment: 'prod' },
  appearance: { theme: 'system' },
};
const bridge = getDataAppTransport()!;
const data = createDataClient({
  operations: { connection: connectionCheck() },
});
const messages = createMessageClient(bridgeRoutes, bridge.request);
const variables = { period: textVariable({ key: 'period', history: 'push' }) };

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
      config={config}
      dataContext={{ description: 'Test report', glossary: {} }}
      description="Report description"
      toolbarActions={<button>Custom toolbar action</button>}
      footerActions={<button>Custom footer action</button>}
    >
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
      <output aria-label="App location" id="location">
        {search}
        {getDataAppNavigation()!.snapshot().hash}
      </output>
      <output aria-label="Query result" id="result">
        {result}
      </output>
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

injectDataAppStyles();

mountDataApp({
  config,
  component: App,
});

let controller: AbortController;
for (const action of ['Concurrent queries', 'Wait for query', 'Cancel query']) {
  const button = document.createElement('button');
  button.textContent = action;
  button.addEventListener('click', () => {
    const result = document.getElementById('transport-result')!;
    if (action === 'Cancel query') {
      controller.abort();
      return;
    }
    if (action === 'Concurrent queries') {
      void Promise.all(
        Array.from({ length: 50 }, (_, index) =>
          messages.request('test:echo', { period: String(index) })
        )
      ).then(values => {
        result.textContent = JSON.stringify(values);
      });
      return;
    }
    controller = new AbortController();
    void messages
      .request('test:wait', 1, { signal: controller.signal })
      .catch(error => {
        result.textContent =
          error.name === 'AbortError' ? error.name : (error.code ?? error.name);
      });
  });
  document.body.append(button);
}

const transportResult = document.createElement('output');
transportResult.id = 'transport-result';
transportResult.setAttribute('aria-label', 'Transport result');
document.body.append(transportResult);
