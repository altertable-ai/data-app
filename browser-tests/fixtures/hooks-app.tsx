import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createDataClient } from '@/src/client/index';
import { defineOperation } from '@/src/core/contract';
import type { TransportResponse } from '@/src/core/bridge';
import { createDataHooks, DataAppProvider } from '@/src/react/index';

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
const { useDataView } = createDataHooks(client);

function App() {
  const [operation, setOperation] = useState<'alpha' | 'beta'>('alpha');
  const [version, setVersion] = useState(1);
  const result = useDataView(
    operation,
    { version },
    {
      isEmpty() {
        return false;
      },
    }
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
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <DataAppProvider>
    <App />
  </DataAppProvider>
);
