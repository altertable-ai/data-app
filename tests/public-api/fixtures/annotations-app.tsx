import { defineDataApp } from '@altertable/data-app';
import {
  AnnotationTarget,
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import { DataWidget, useAppFilters } from '@altertable/data-app-react/ui';
import {
  createMessageClient,
  createDataClient,
  getDataAppTransport,
  getDataAppNavigation,
} from '@altertable/data-app/client';
import { connectionCheck, searchFilter } from '@altertable/data-app/contract';
import { useState } from 'react';

import { bridgeRoutes } from '@/tests/public-api/fixtures/bridge-routes';
import { literalLakehouse } from '@/tests/public-api/fixtures/literal-client';
const dataApp = defineDataApp({
  title: 'Embedded report',
  description: 'Explore embedded queries and host interactions.',
  scope: { organization: 'test', environment: 'prod' },
  appearance: { theme: 'system' },
  queries: {
    connection: {
      projections: { connection_check: { type: 'number' } } as const,
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
// The customer count is literal, so it loads without the host's query bridge.
const { defineView } = createDataHooks(
  createDataClient({
    operations: {
      customers: dataApp.defineOperation({
        policy: { maxQueryRows: 1 },
        async run() {
          return 42;
        },
      }),
    },
    lakehouse: literalLakehouse,
  })
);
const customersView = defineView({
  dataContext: createDataContext(dataApp.queryNames)({
    description: 'Test report',
    glossary: {
      customers: { term: 'Customers', definition: 'Counted customers.' },
    },
  }),
  operation: 'customers',
});
const customers = customersView.metric(
  {
    id: 'customer-count',
    glossaryId: 'customers',
    label: 'Customers',
    format: { kind: 'count' },
  },
  count => ({ current: count })
);
const customersContent = customersView.content(result => (
  <MetricWidget metric={customers} source={result} annotationId="customers" />
));

function App() {
  const [crashed, setCrashed] = useState(false);
  const params = new URLSearchParams(getDataAppNavigation()!.snapshot().search);
  const [showSharedNarrative, setShowSharedNarrative] = useState(
    !params.has('annotation-existing')
  );
  const [loadingNarrative, setLoadingNarrative] = useState(
    params.has('annotation-loading')
  );
  const [showExplicitCollision, setShowExplicitCollision] = useState(
    params.has('annotation-explicit-collision')
  );
  const state = useAppFilters(variables);
  const search = state.values.period ? `period=${state.values.period}` : '';
  const [result, setResult] = useState('');
  if (crashed) throw new Error('Uncaught render failure');

  return (
    <DataApp
      view={customersView}
      description="Report description"
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
      {showSharedNarrative && (
        <DataWidget
          title="Average trip duration"
          evidence={{ id: 'monthly-revenue', queryNames: ['revenue'] }}
        >
          <TextContent>20.0 minutes from start to end.</TextContent>
        </DataWidget>
      )}
      {params.has('annotation-loading') && (
        <DataWidget
          title="Loading narrative"
          evidence={{ id: 'loading-narrative', queryNames: ['revenue'] }}
          reading={
            loadingNarrative
              ? { loading: true }
              : { loading: false, value: 'Ready narrative' }
          }
          isEmpty={() => false}
          emptyFallback={{ title: 'No narrative' }}
        >
          {value => <TextContent>{value}</TextContent>}
        </DataWidget>
      )}
      {showExplicitCollision && (
        <DataWidget
          title="Explicitly identified revenue"
          annotationId="monthly-revenue"
        >
          <TextContent>Author-controlled identity.</TextContent>
        </DataWidget>
      )}
      <DataWidget title="Trip narrative">
        <TextContent>An automatically identified narrative.</TextContent>
      </DataWidget>
      <DataWidget title="Explicit narrative" annotationId="explicit-narrative">
        <TextContent>An explicitly identified narrative.</TextContent>
      </DataWidget>
      {params.has('annotation-scroll') && (
        <div style={{ height: 1600 }}>Long report</div>
      )}
      <AnnotationTarget annotationId="intro" label="Introduction">
        <p>Revenue is growing.</p>
      </AnnotationTarget>
      <button onClick={() => setShowSharedNarrative(value => !value)}>
        Toggle shared narrative
      </button>
      <button onClick={() => setLoadingNarrative(value => !value)}>
        Toggle narrative loading
      </button>
      <button onClick={() => setShowExplicitCollision(value => !value)}>
        Toggle explicit target
      </button>
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
