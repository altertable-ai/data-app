import { createDataContext as registerContext } from '@/src/react/ui/data-context';
import { useDeclaredResult } from '@/src/react/view-runtime';
import { DeclaredApp } from '@/dev/fixtures/declared-app';
import { DataSectionBoundary as DataSection } from '@/src/react/ui/DataSectionBoundary';
import { bindDataset } from '@/src/react/bindings';
import { defineDataContent } from '@/src/react/content';
import { ClientCacheApp } from '@/dev/fixtures/client-cache';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { injectDataAppStyles } from '@altertable/data-app/react';
import { createDataClient, type OutputOf } from '@/src/client/index';
import { defineOperation } from '@/src/core/contract';
import type { TransportResponse } from '@/src/core/bridge';
import { createDataHooks } from '@/src/react/hooks';
import { DataAppProvider, TextWidget } from '@altertable/data-app/react/ui';

injectDataAppStyles();

const context = registerContext({})({
  description: 'Fixture context',
  glossary: {},
});

const operations = {
  alpha: defineOperation({
    input(value: unknown) {
      return value as { version: number };
    },
    output(value: unknown) {
      return value as { kind: 'alpha'; count: number };
    },
    checks: [{ version: 1 }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: false },
    async run() {
      return { kind: 'alpha', count: 1 };
    },
  }),
  beta: defineOperation({
    input(value: unknown) {
      return value as { version: number };
    },
    output(value: unknown) {
      return value as { kind: 'beta'; label: string };
    },
    checks: [{ version: 1 }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: false },
    async run() {
      return { kind: 'beta', label: 'Beta' };
    },
  }),
};
const pending = new Map<string, (response: TransportResponse) => void>();
const client = createDataClient<typeof operations>({
  transport(name, input, signal) {
    return new Promise((resolve, reject) => {
      const key = `${name}:${(input as { version: number }).version}`;

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
const { defineDataView } = createDataHooks(client);
const narrativeRows = bindDataset({
  name: 'Activity',
  select: (
    data: OutputOf<typeof operations.alpha | typeof operations.beta>,
    input: { version: number }
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
  { version: number }
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
    {([{ value, version }]) => (
      <p>
        {value} for selection {version}
      </p>
    )}
  </TextWidget>
));

function App() {
  const [operation, setOperation] = useState<'alpha' | 'beta'>('alpha');
  const [version, setVersion] = useState(1);
  const result = useDeclaredResult(
    defineDataView({
      dataContext: context,
      operation,
      variables: {},
      input: () => ({ version }),
      describeInput: input => `selection ${input.version}`,
      isEmpty: () => false,
      emptyFallback: { title: 'No activity' },
    })
  );

  function settle(failed: boolean) {
    pending.get(`${operation}:${version}`)?.(
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
                  ? { kind: 'alpha', count: version }
                  : { kind: 'beta', label: `Beta ${version}` },
              requestId: `${operation}:${version}`,
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
      <button onClick={() => setVersion(value => value + 1)}>
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
        emptyFallback={{ title: 'No activity' }}
        {...narrative}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <DataAppProvider>
    {new URLSearchParams(location.search).has('declared') ? (
      <DeclaredApp />
    ) : new URLSearchParams(location.search).has('client-cache') ? (
      <ClientCacheApp />
    ) : (
      <App />
    )}
  </DataAppProvider>
);
