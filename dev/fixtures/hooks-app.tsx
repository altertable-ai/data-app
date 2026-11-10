import { injectDataAppStyles } from '@altertable/data-app-react';
import {
  DataAppProvider,
  TextWidget,
  useAppFilters,
} from '@altertable/data-app-react/ui';
import {
  createDataClient,
  type InputOf,
  type OutputOf,
} from '@altertable/data-app/client';
import { defineOperation, searchFilter } from '@altertable/data-app/contract';
import type { TransportResponse } from '@altertable/data-app/contract';
import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientCacheApp } from '@/dev/fixtures/client-cache';
import { DeclaredApp, dataApp } from '@/dev/fixtures/declared-app';
import { bindDataset } from '@/packages/data-app-react/src/bindings.ts';
import { defineDataContent } from '@/packages/data-app-react/src/content.ts';
import { createDataHooks } from '@/packages/data-app-react/src/hooks.ts';
import { createDataContext as registerContext } from '@/packages/data-app-react/src/ui/data-context.ts';
import { DataSectionBoundary as DataSection } from '@/packages/data-app-react/src/ui/DataSectionBoundary.tsx';
import { useDeclaredResult } from '@/packages/data-app-react/src/view-runtime.tsx';

injectDataAppStyles();

const context = registerContext({})({
  description: 'Fixture context',
  glossary: {},
});

const version = searchFilter({
  key: 'version',
  label: 'Selection',
  defaultValue: '1',
});
const operations = {
  alpha: defineOperation({
    queries: {},
    filters: { version },
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run() {
      return { kind: 'alpha', count: 1 };
    },
  }),
  beta: defineOperation({
    queries: {},
    filters: { version },
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run() {
      return { kind: 'beta', label: 'Beta' };
    },
  }),
};
const pending = new Map<string, (response: TransportResponse) => void>();
const client = createDataClient<typeof operations>({
  filters: {
    alpha: operations.alpha.filters,
    beta: operations.beta.filters,
  },
  transport(name, input, signal) {
    return new Promise((resolve, reject) => {
      const key = [
        name,
        (input as InputOf<typeof operations.alpha>).version,
      ].join(KEY_SEPARATOR);

      function abort() {
        pending.delete(key);
        reject(signal?.reason);
      }
      signal?.addEventListener('abort', abort, { once: true });
      pending.set(key, response => {
        signal?.removeEventListener('abort', abort);
        pending.delete(key);
        resolve(response);
      });
    });
  },
});
const { defineView } = createDataHooks(client);
function describeInput(input: InputOf<typeof operations.alpha>) {
  return `selection ${input.version}`;
}
const views = {
  alpha: defineView({
    dataContext: context,
    operation: 'alpha',
    describeInput,
  }),
  beta: defineView({ dataContext: context, operation: 'beta', describeInput }),
};
const narrativeRows = bindDataset({
  name: 'Activity',
  select: (
    data: OutputOf<typeof operations.alpha | typeof operations.beta>,
    input: InputOf<typeof operations.alpha>
  ) => [
    {
      value: 'count' in data ? data.count : data.label,
      version: input.version,
    },
  ],
  rowKey: row => row.version,
  columns: {
    value: { value: row => row.value },
    version: { value: row => row.version },
  },
  evidence: { id: 'fixture', queryNames: ['fixture'] },
});
const narrative = defineDataContent<
  OutputOf<(typeof operations)[keyof typeof operations]>,
  InputOf<typeof operations.alpha>
>(result => (
  <TextWidget
    title="Activity explained"
    data-testid="narrative"
    evidence={{
      id: 'activity-explanation',
      queryNames: ['alpha-evidence', 'beta-evidence'],
    }}
    reading={narrativeRows.read(result)}
  >
    {rows =>
      rows.map(({ value, version }) => (
        <p key={version}>
          {value} for selection {version}
        </p>
      ))
    }
  </TextWidget>
));

function App() {
  const [operation, setOperation] = useState<'alpha' | 'beta'>('alpha');
  const selection = useAppFilters({ version });
  const current = selection.values.version;
  function setVersion(value: number) {
    selection.set('version', String(value));
  }
  const result = useDeclaredResult(views[operation]);

  function settle(failed: boolean) {
    pending.get([operation, current].join(KEY_SEPARATOR))?.(
      failed
        ? {
            status: 502,
            body: {
              error: {
                code: 'source_unavailable',
                message: 'Fixture unavailable',
              },
            },
          }
        : {
            status: 200,
            body: {
              data:
                operation === 'alpha'
                  ? { kind: 'alpha', count: Number(current) }
                  : { kind: 'beta', label: `Beta ${current}` },
              requestId: [operation, current].join(KEY_SEPARATOR),
              queriedAt: '2026-09-30T00:00:00Z',
              queryIds: [],
              queries: [
                { name: `${operation}-evidence`, statement: 'SELECT 1' },
              ],
            },
          }
    );
  }

  return (
    <>
      <button
        onClick={() => {
          setOperation('alpha');
          setVersion(1);
        }}
      >
        Alpha
      </button>
      <button
        onClick={() => {
          setOperation('beta');
          setVersion(1);
        }}
      >
        Beta
      </button>
      <button onClick={() => setVersion(Number(current) + 1)}>
        Change input
      </button>
      <button onClick={() => settle(false)}>Resolve request</button>
      <button onClick={() => settle(true)}>Fail request</button>
      <p data-testid="operation">{operation}</p>
      <p data-testid="state">{result.view.kind}</p>
      <p data-testid="shown">{result.snapshot?.data.kind ?? 'none'}</p>
      <p data-testid="input">{result.snapshot?.input.version ?? 'none'}</p>
      <p data-testid="evidence">
        {result.queries?.map(query => query.name).join(',') ?? 'none'}
      </p>
      <DataSection
        result={result}
        notice="inline"
        emptyFallback={{ title: 'No activity' }}
        {...narrative}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <DataAppProvider app={dataApp}>
    {new URLSearchParams(location.search).has('declared') ? (
      <DeclaredApp />
    ) : new URLSearchParams(location.search).has('client-cache') ? (
      <ClientCacheApp />
    ) : (
      <App />
    )}
  </DataAppProvider>
);
