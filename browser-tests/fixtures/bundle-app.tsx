import '@altertable/data-app/react/styles.css';
import type { connectionCheck } from '@altertable/data-app/contract';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createMessageClient,
  createDataClient,
  getDataAppTransport,
  getDataAppNavigation,
  DataAppError,
} from '@altertable/data-app/client';
import {
  DataApp,
  textVariable,
  useAppVariables,
} from '@altertable/data-app/react';
import { bridgeRoutes } from '@/browser-tests/fixtures/bridge-routes';
const bridge = getDataAppTransport()!;
const data = createDataClient<{
  connection: ReturnType<typeof connectionCheck>;
}>();
const messages = createMessageClient(bridgeRoutes, bridge.request);
const variables = { period: textVariable({ key: 'period', history: 'push' }) };

function App() {
  const state = useAppVariables(variables);
  const search = state.values.period ? `period=${state.values.period}` : '';
  const [result, setResult] = useState('');

  return (
    <DataApp
      config={{
        title: 'Embedded report',
        scope: { organization: 'test', environment: 'prod' },
        appearance: { mode: 'system' },
      }}
      dataContext={{ description: 'Test report', glossary: {} }}
      description="Report description"
      toolbarActions={<button>Custom toolbar action</button>}
      footerActions={<button>Custom footer action</button>}
    >
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
createRoot(document.getElementById('root')!).render(<App />);
