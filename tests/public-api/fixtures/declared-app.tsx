import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataTransport } from '@altertable/data-app/client';
import {
  searchFilter,
  type DataOperation,
  type FilterInput,
} from '@altertable/data-app/contract';
import { useState } from 'react';
type TransportResponse = Awaited<ReturnType<DataTransport>>;

const alphaFilters = {
  version: searchFilter({
    key: 'version',
    label: 'Version',
    defaultValue: '1',
  }),
};

const pending = new Map<string, (response: TransportResponse) => void>();
const client = createDataClient<{
  alpha: DataOperation<FilterInput<typeof alphaFilters>, { count: number }> & {
    filters: typeof alphaFilters;
  };
  beta: DataOperation<Record<string, never>, { count: number }>;
}>({
  filters: { alpha: alphaFilters },
  transport(name, input, signal) {
    const version =
      name === 'alpha' ? (input as { version: string }).version : 1;
    const key = [name, version].join(':');
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
const { defineView } = createDataHooks(client);
const context = createDataContext({ alpha: 'alpha', beta: 'beta' })({
  description: 'Declared views',
  glossary: {},
});
const alpha = defineView({ dataContext: context, operation: 'alpha' });
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
const beta = defineView({ dataContext: betaContext, operation: 'beta' });
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
        <output aria-label="Alpha result">
          {rows[0]!.count} for {rows[0]!.version}
        </output>
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
          render: rows => (
            <output aria-label="Alpha visualization result">
              {rows[0]?.count}
            </output>
          ),
        },
        {
          id: 'doubled',
          label: 'Doubled',
          render: rows => (
            <output aria-label="Alpha visualization result">
              {rows[0]!.count * 2}
            </output>
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
    {rows => <output aria-label="Beta result">{rows[0]!.count}</output>}
  </TextWidget>
));

function resolve(name: 'alpha' | 'beta', version: number) {
  pending.get([name, version].join(':'))?.({
    status: 200,
    body: {
      data: { count: version },
      requestId: [name, version].join(':'),
      queriedAt: '2026-10-07T00:00:00Z',
      queryIds: [],
      queries: [{ name, statement: `SELECT ${name}` }],
    },
  });
}

export const dataApp = defineDataApp({
  title: 'Declared views',
  description: 'Explore independent views and their request states.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});

export function DeclaredApp() {
  const [shown, setShown] = useState(false);
  return (
    <DataApp
      view={alpha}
      {...(new URLSearchParams(location.search).has('no-exports')
        ? {}
        : { story: () => [], datasets: [alphaDataset] as const })}
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
