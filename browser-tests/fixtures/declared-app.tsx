import { useState } from 'react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  VisualizationWidget,
  textVariable,
} from '@altertable/data-app/react';
import type { TransportResponse } from '@/src/core/bridge';

const pending = new Map<string, (response: TransportResponse) => void>();
const client = createDataClient<{
  alpha: DataOperation<{ version: number }, { count: number }>;
  beta: DataOperation<Record<string, never>, { count: number }>;
}>({
  transport(name, input, signal) {
    const version =
      name === 'alpha' ? (input as { version: number }).version : 1;
    const key = `${name}:${version}`;
    document.body.dataset[`${name}Requests`] = String(
      Number(document.body.dataset[`${name}Requests`] ?? 0) + 1
    );
    return new Promise((resolve, reject) => {
      signal?.addEventListener(
        'abort',
        () => {
          pending.delete(key);
          reject(signal.reason);
        },
        { once: true }
      );
      pending.set(key, resolve);
    });
  },
});
const hooks = createDataHooks(client);
const alpha = hooks.defineDataView({
  operation: 'alpha',
  variables: {
    version: textVariable({
      key: 'version',
      label: 'Version',
      defaultValue: '1',
    }),
  },
  input: values => ({ version: Number(values.version) }),
  describeInput: input => `version ${input.version}`,
  isEmpty: () => false,
  emptyFallback: { title: 'No alpha' },
});
const beta = hooks.defineDataView({
  operation: 'beta',
  describeInput: () => 'beta',
  isEmpty: () => false,
  emptyFallback: { title: 'No beta' },
});
const context = createDataContext({ alpha: 'alpha', beta: 'beta' })({
  description: 'Declared views',
  glossary: {},
});
const alphaDataset = alpha.dataset({
  name: 'Alpha',
  select: data => [data],
  rowKey: () => 'alpha',
  columns: { count: { value: row => row.count } },
  evidence: context.evidence({ id: 'alpha-data', queryNames: ['alpha'] }),
});
const alphaContent = alpha.content(result => (
  <>
    <TextWidget
      title="Alpha"
      reading={result.select(
        (data, input) => `${data.count} for ${input.version}`
      )}
      evidence={context.evidence({ id: 'alpha', queryNames: ['alpha'] })}
    >
      {value => <p data-testid="primary">{value}</p>}
    </TextWidget>
    <VisualizationWidget
      title="Alpha visualization"
      dataset={alphaDataset}
      source={result}
      viewLabel="Alpha view"
      views={[
        {
          id: 'count',
          label: 'Count',
          render: rows => <p data-testid="primary-visual">{rows[0]?.count}</p>,
        },
        {
          id: 'doubled',
          label: 'Doubled',
          render: rows => (
            <p data-testid="primary-visual">{rows[0]!.count * 2}</p>
          ),
        },
      ]}
    />
  </>
));
const betaContent = beta.content(result => (
  <TextWidget
    title="Beta"
    reading={result.select(data => data.count)}
    evidence={context.evidence({ id: 'beta', queryNames: ['beta'] })}
  >
    {value => <p data-testid="secondary">{value}</p>}
  </TextWidget>
));

function resolve(name: 'alpha' | 'beta', version: number) {
  pending.get(`${name}:${version}`)?.({
    status: 200,
    body: {
      data: { count: version },
      requestId: `${name}:${version}`,
      queriedAt: '2026-10-07T00:00:00Z',
      queryIds: [],
      queries: [{ name, statement: `SELECT ${name}` }],
    },
  });
}

export function DeclaredApp() {
  const [shown, setShown] = useState(false);
  return (
    <DataApp
      view={alpha}
      config={{
        title: 'Declared views',
        scope: { organization: 'test', environment: 'test' },
        appearance: {},
      }}
      dataContext={context}
      story={() => []}
      datasets={[alphaDataset]}
    >
      <button onClick={() => resolve('alpha', 1)}>Resolve alpha 1</button>
      <button onClick={() => resolve('alpha', 2)}>Resolve alpha 2</button>
      <button onClick={() => resolve('beta', 1)}>Resolve beta</button>
      <button onClick={() => setShown(true)}>Show primary</button>
      {shown && <DataSection view={alpha} {...alphaContent} />}
      <DataSection view={beta} {...betaContent} />
    </DataApp>
  );
}
