import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { createDataContext as registerContext } from '@/packages/data-app-react/src/ui/data-context.ts';
import { useDeclaredResult } from '@/packages/data-app-react/src/view-runtime.tsx';
import { DeclaredApp, dataApp } from '@/dev/fixtures/declared-app';
import { DataSectionBoundary as DataSection } from '@/packages/data-app-react/src/ui/DataSectionBoundary.tsx';
import { bindDataset } from '@/packages/data-app-react/src/bindings.ts';
import { defineDataContent } from '@/packages/data-app-react/src/content.ts';
import { ClientCacheApp } from '@/dev/fixtures/client-cache';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { injectDataAppStyles } from '@altertable/data-app-react';
import {
  createDataClient,
  type InputOf,
  type OutputOf,
} from '@altertable/data-app/client';
import { defineOperation } from '@altertable/data-app/contract';
import type { TransportResponse } from '@altertable/data-app/contract';
import { createDataHooks } from '@/packages/data-app-react/src/hooks.ts';
import { DataAppProvider, TextWidget } from '@altertable/data-app-react/ui';

injectDataAppStyles();

const context = registerContext({})({
  description: 'Fixture context',
  glossary: {},
});

const operations = {
  alpha: defineOperation({
    queries: {},
    input(value: unknown) {
      return value as { version: number };
    },
    checks: [{ version: 1 }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run() {
      return { kind: 'alpha', count: 1 };
    },
  }),
  beta: defineOperation({
    queries: {},
    input(value: unknown) {
      return value as { version: number };
    },
    checks: [{ version: 1 }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run() {
      return { kind: 'beta', label: 'Beta' };
    },
  }),
};
const pending = new Map<string, (response: TransportResponse) => void>();
const client = createDataClient<typeof operations>({
  transport(name, input, signal) {
    return new Promise((resolve, reject) => {
      const key = [name, (input as { version: number }).version].join(
        KEY_SEPARATOR
      );

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
  const [version, setVersion] = useState(1);
  const definition = {
    dataContext: context,
    variables: {},
    input: () => ({ version }),
    describeInput: (input: InputOf<typeof operations.alpha>) =>
      `selection ${input.version}`,
    isEmpty: () => false,
    emptyFallback: { title: 'No activity' },
  };
  const result = useDeclaredResult(
    operation === 'alpha'
      ? defineDataView({ ...definition, operation: 'alpha' })
      : defineDataView({ ...definition, operation: 'beta' })
  );

  function settle(failed: boolean) {
    pending.get([operation, version].join(KEY_SEPARATOR))?.(
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
              requestId: [operation, version].join(KEY_SEPARATOR),
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
