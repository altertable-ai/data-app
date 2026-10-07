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
const context = createDataContext({ alpha: 'alpha', beta: 'beta' })({
  description: 'Declared views',
  glossary: {},
});
const alpha = hooks.defineDataView({
  dataContext: context,
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
const betaContext = createDataContext({ beta: 'beta' })({
  description: 'Independent beta context',
  glossary: {
    betaCount: {
      term: 'Independent beta',
      definition: 'Only the beta section owns this glossary entry.',
      queryNames: ['beta'],
    },
  },
});
const beta = hooks.defineDataView({
  dataContext: betaContext,
  operation: 'beta',
  describeInput: () => 'beta',
  isEmpty: () => false,
  emptyFallback: { title: 'No beta' },
});
const alphaDataset = alpha.dataset({
  name: 'Alpha',
  select: (data, input) => [{ ...data, version: input.version }],
  rowKey: () => 'alpha',
  columns: {
    count: { value: row => row.count },
    version: { value: row => row.version },
  },
  evidence: { id: 'alpha-data', queryNames: ['alpha'] },
});
const alphaContent = alpha.content(result => (
  <>
    <TextWidget title="Alpha" dataset={alphaDataset} source={result}>
      {rows => (
        <p data-testid="primary">
          {rows[0]!.count} for {rows[0]!.version}
        </p>
      )}
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
const betaDataset = beta.dataset({
  name: 'Beta',
  select: data => [data],
  rowKey: () => 'beta',
  columns: { count: { value: row => row.count } },
  evidence: { id: 'beta', glossaryIds: ['betaCount'] },
});
const betaContent = beta.content(result => (
  <TextWidget dataset={betaDataset} source={result}>
    {rows => <p data-testid="secondary">{rows[0]!.count}</p>}
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
      story={() => []}
      datasets={[alphaDataset]}
    >
      <button onClick={() => resolve('alpha', 1)}>Resolve alpha 1</button>
      <button onClick={() => resolve('alpha', 2)}>Resolve alpha 2</button>
      <button onClick={() => resolve('beta', 1)}>Resolve beta</button>
      <button onClick={() => setShown(true)}>Show primary</button>
      {shown && <DataSection content={alphaContent} />}
      <DataSection content={betaContent} />
    </DataApp>
  );
}
